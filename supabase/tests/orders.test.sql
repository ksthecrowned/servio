-- Tests for place_order and mark_bill_paid
-- (20261002000001_transactional_orders). Runs inside a transaction that is
-- rolled back; any failed assertion raises.

begin;

-- Runs p_sql and asserts it fails with exactly p_message. The implicit
-- savepoint of the exception block also proves the failure left nothing
-- behind.
create function pg_temp.expect_error(p_sql text, p_message text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error "%" but statement succeeded: %', p_message, p_sql;
exception when raise_exception then
  if sqlerrm like 'expected error%' then raise; end if;
  if sqlerrm <> p_message then
    raise exception 'expected error "%", got "%"', p_message, sqlerrm;
  end if;
end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
-- Tax and service chosen so amounts fall on fractions of a franc.
insert into restaurants (id, owner_id, slug, name, tax_percent, service_charge_percent)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'chez-r', 'R', 18.9, 5);
insert into branches (id, restaurant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'Main'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'b2', 'B2');
insert into restaurant_tables (id, branch_id, label)
  values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T1');
insert into menu_categories (id, restaurant_id, name)
  values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Plats');
insert into menu_items (id, restaurant_id, category_id, name, base_price, is_available) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Poulet DG', 2500, true),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Saka-saka', 1500, false);
insert into menu_variants (id, item_id, name, price)
  values ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Grande', 3500);
insert into menu_addons (id, item_id, name, price) values
  ('62000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Plantain', 300),
  ('62000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Piment', 200),
  ('62000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'Autre plat', 100);
insert into offers (id, restaurant_id, name, type, percentage_value, ends_on) values
  ('63000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '-15%', 'percentage', 15, null),
  ('63000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'BOGO', 'bogo', null, null),
  ('63000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Expired', 'percentage', 10, '2000-01-01');
insert into coupons (id, restaurant_id, offer_id, code, usage_limit) values
  ('64000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001', 'ONCE', 1),
  ('64000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001', 'MANY', 5),
  ('64000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000002', 'BOGO', null),
  ('64000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'OLD', null);
insert into staff (id, restaurant_id, name, role, pin_hash)
  values ('72000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Caisse', 'cashier', 'x');

-- 1. Pricing is computed from the database, coupon applied and counted.
create temp table first_order as
select * from place_order(
  'chez-r', 'main',
  '[{"item_id": "60000000-0000-0000-0000-000000000001", "variant_id": "61000000-0000-0000-0000-000000000001",
     "addon_ids": ["62000000-0000-0000-0000-000000000001", "62000000-0000-0000-0000-000000000002"],
     "quantity": 2, "special_instructions": "  sans oignons  "},
    {"item_id": "60000000-0000-0000-0000-000000000001", "variant_id": null, "addon_ids": [], "quantity": 1,
     "special_instructions": ""}]',
  p_table_id => '30000000-0000-0000-0000-000000000001',
  p_coupon_code => ' once ', p_customer_name => 'Ama', p_customer_phone => '+242060000001'
);

do $$
declare o orders%rowtype;
begin
  select * into o from orders where id = (select order_id from first_order);
  -- (3500 + 300 + 200) * 2 + 2500 = 10500; -15% = 1575; taxable 8925
  assert o.subtotal = 10500, format('subtotal %s', o.subtotal);
  assert o.discount_amount = 1575, format('discount %s', o.discount_amount);
  assert o.tax_amount = 1686.83, format('tax %s', o.tax_amount);            -- 8925 * 18.9%
  assert o.service_charge_amount = 446.25, format('service %s', o.service_charge_amount);
  assert o.total_amount = 11058.08, format('total %s', o.total_amount);
  assert o.customer_id is not null and o.coupon_id is not null and o.table_session_id is not null;
  assert (select count(*) from order_items where order_id = o.id) = 2;
  assert (select special_instructions from order_items where order_id = o.id and quantity = 2) = 'sans oignons';
  assert (select jsonb_array_length(addon_selection) from order_items where order_id = o.id and quantity = 2) = 2;
  assert (select count(*) from order_status_history where order_id = o.id and status = 'pending') = 1;
  assert (select times_used from coupons where code = 'ONCE') = 1;
  assert (select status from restaurant_tables where label = 'T1') = 'order_pending';
end $$;

-- 2. Coupon limits and offer rules.
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]', p_coupon_code => 'ONCE')
$q$, 'Ce code promo a atteint sa limite d’utilisation.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]', p_coupon_code => 'BOGO')
$q$, 'Ce code promo ne peut pas encore être utilisé pour une commande en ligne.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]', p_coupon_code => 'OLD')
$q$, 'L’offre de ce code promo n’est plus active.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]', p_coupon_code => 'NOPE')
$q$, 'Code promo invalide.');

-- 3. A failing line rolls back the whole order, coupon usage included.
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1},
      {"item_id": "60000000-0000-0000-0000-000000000002", "quantity": 1}]', p_coupon_code => 'MANY')
$q$, '« Saka-saka » n’est plus disponible pour le moment.');
do $$ begin
  assert (select times_used from coupons where code = 'MANY') = 0, 'coupon counted for a failed order';
  assert (select count(*) from orders) = 1, 'failed order left rows behind';
end $$;

-- 4. Input validation.
select pg_temp.expect_error($q$ select place_order('chez-r', 'main', '[]') $q$, 'Votre panier est vide.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "not-a-uuid", "quantity": 1}]')
$q$, 'Panier invalide.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 0}]')
$q$, 'Quantité invalide.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "addon_ids": ["62000000-0000-0000-0000-000000000003"], "quantity": 1}]')
$q$, 'Supplément invalide.');
select pg_temp.expect_error($q$
  select place_order('chez-r', 'b2', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]',
  p_table_id => '30000000-0000-0000-0000-000000000001')
$q$, 'Table introuvable.');

-- 5. Ordering again after the bill was requested reuses the session and
--    keeps the bill total current.
insert into bills (id, restaurant_id, branch_id, table_session_id, status, total_amount)
select '90000000-0000-0000-0000-000000000001', restaurant_id, branch_id, table_session_id, 'requested', total_amount
from orders where id = (select order_id from first_order);
update table_sessions set status = 'bill_requested';

create temp table second_order as
select * from place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]',
  p_table_id => '30000000-0000-0000-0000-000000000001');

do $$ begin
  assert (select table_session_id from orders where id = (select order_id from second_order))
       = (select table_session_id from orders where id = (select order_id from first_order)),
    'second order did not reuse the bill_requested session';
  assert (select total_amount from bills) = (select sum(total_amount) from orders), 'bill total not refreshed';
end $$;

-- 6. Payment: branch scoping, then one payment, everything closed.
select pg_temp.expect_error($q$
  select mark_bill_paid('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001', 'cash', p_branch_id => '20000000-0000-0000-0000-000000000002')
$q$, 'Addition introuvable.');

select mark_bill_paid('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001', 'mobile_money', p_branch_id => '20000000-0000-0000-0000-000000000001');

select pg_temp.expect_error($q$
  select mark_bill_paid('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001', 'cash')
$q$, 'Cette addition a déjà été réglée.');

do $$ begin
  assert (select count(*) from payments) = 1, 'expected exactly one payment';
  assert (select amount from payments) = (select sum(total_amount) from orders), 'payment amount';
  assert (select status from bills) = 'paid';
  assert not exists (select 1 from orders where status <> 'completed'), 'orders not completed';
  assert (select count(*) from order_status_history where status = 'completed') = 2;
  assert (select status from table_sessions) = 'closed';
  assert (select status from restaurant_tables where label = 'T1') = 'cleaning';
end $$;

-- 7. The next guests at the table get a new session.
create temp table third_order as
select * from place_order('chez-r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]',
  p_table_id => '30000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from table_sessions) = 2, 'no new session after payment';
end $$;

-- 8. Only the service role may call these functions.
do $$ begin
  assert not has_function_privilege('anon', 'public.place_order(text, text, jsonb, uuid, text, text, text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.place_order(text, text, jsonb, uuid, text, text, text)', 'execute');
  assert not has_function_privilege('anon', 'public.mark_bill_paid(uuid, uuid, uuid, payment_method, uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.mark_bill_paid(uuid, uuid, uuid, payment_method, uuid)', 'execute');
  assert has_function_privilege('service_role', 'public.place_order(text, text, jsonb, uuid, text, text, text)', 'execute');
  assert has_function_privilege('service_role', 'public.mark_bill_paid(uuid, uuid, uuid, payment_method, uuid)', 'execute');
end $$;

rollback;
