-- Tests for cancel_order (20261002000006_order_cancellation).
-- Runs inside a transaction that is rolled back; any failed assertion raises.

begin;

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
insert into restaurants (id, owner_id, slug, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'r', 'R'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'other', 'Other');
insert into branches (id, restaurant_id, slug, name)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'Main');
insert into restaurant_tables (id, branch_id, label)
  values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T1');
insert into menu_categories (id, restaurant_id, name)
  values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'C');
insert into menu_items (id, restaurant_id, category_id, name, base_price)
  values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Poulet', 5000);
insert into offers (id, restaurant_id, name, type, percentage_value)
  values ('63000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '-10%', 'percentage', 10);
insert into coupons (restaurant_id, offer_id, code, usage_limit)
  values ('10000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001', 'ONCE', 1);
insert into staff (id, restaurant_id, name, role, pin_hash)
  values ('72000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Chef', 'kitchen', 'x');

create temp table o1 as select order_id from place_order('r', 'main',
  '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]',
  p_table_id => '30000000-0000-0000-0000-000000000001', p_coupon_code => 'ONCE');
create temp table o2 as select order_id from place_order('r', 'main',
  '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 2}]',
  p_table_id => '30000000-0000-0000-0000-000000000001');
insert into bills (restaurant_id, branch_id, table_session_id, status, total_amount)
  select restaurant_id, branch_id, table_session_id, 'requested', 0 from orders limit 1;
update bills set total_amount = (select sum(total_amount) from orders);

-- 1. A guest cancels an order the kitchen hasn't accepted: everything follows.
select cancel_order((select order_id from o1), '10000000-0000-0000-0000-000000000001', p_only_pending => true);
do $$ begin
  assert (select status from orders where id = (select order_id from o1)) = 'cancelled';
  assert (select cancel_reason from orders where id = (select order_id from o1)) is null;
  assert (select count(*) from order_status_history where order_id = (select order_id from o1) and status = 'cancelled') = 1;
  assert (select times_used from coupons where code = 'ONCE') = 0, 'coupon use not given back';
  assert (select total_amount from bills) = 10000, 'bill still counts the cancelled order';
  assert (select status from restaurant_tables) = 'order_pending', 'table freed while another order is pending';
end $$;

-- The coupon can be used again.
select place_order('r', 'main', '[{"item_id": "60000000-0000-0000-0000-000000000001", "quantity": 1}]', p_coupon_code => 'ONCE');

-- 2. Once the kitchen has accepted, the guest can't; staff can, with a reason.
update orders set status = 'accepted' where id = (select order_id from o2);
select pg_temp.expect_error(
  format($q$ select cancel_order(%L, '10000000-0000-0000-0000-000000000001', p_only_pending => true) $q$, (select order_id from o2)),
  'La cuisine a déjà pris votre commande en charge : demandez à votre serveur.');
select cancel_order((select order_id from o2), '10000000-0000-0000-0000-000000000001',
  p_reason => '  Plat épuisé  ', p_staff_id => '72000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select cancel_reason from orders where id = (select order_id from o2)) = 'Plat épuisé';
  assert (select changed_by_staff_id from order_status_history
          where order_id = (select order_id from o2) and status = 'cancelled') = '72000000-0000-0000-0000-000000000001';
  assert (select total_amount from bills) = 0, 'bill not re-totalled';
  assert (select status from restaurant_tables) = 'occupied', 'table still shows a pending order';
end $$;

-- 3. Refusals.
select pg_temp.expect_error(
  format($q$ select cancel_order(%L, '10000000-0000-0000-0000-000000000001') $q$, (select order_id from o2)),
  'Cette commande est déjà annulée.');
update orders set status = 'served' where id = (select id from orders where status = 'pending' limit 1);
select pg_temp.expect_error(
  format($q$ select cancel_order(%L, '10000000-0000-0000-0000-000000000001') $q$, (select id from orders where status = 'served')),
  'Cette commande a déjà été servie : elle ne peut plus être annulée.');
select pg_temp.expect_error(
  format($q$ select cancel_order(%L, '10000000-0000-0000-0000-000000000002') $q$, (select id from orders where status = 'served')),
  'Commande introuvable.');

-- 4. Server-side only.
do $$ begin
  assert not has_function_privilege('anon', 'public.cancel_order(uuid, uuid, text, uuid, uuid, boolean)', 'execute');
  assert not has_function_privilege('authenticated', 'public.cancel_order(uuid, uuid, text, uuid, uuid, boolean)', 'execute');
  assert has_function_privilege('service_role', 'public.cancel_order(uuid, uuid, text, uuid, uuid, boolean)', 'execute');
end $$;

rollback;
