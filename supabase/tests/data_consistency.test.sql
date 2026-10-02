-- Regression tests for the tenant/session constraints added in
-- 20261001000006 and corrected in 20261001000007. Runs inside a
-- transaction that is rolled back; any failed assertion raises.

begin;

insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
insert into restaurants (id, owner_id, slug, name)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'r', 'R');
insert into branches (id, restaurant_id, slug, name)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'Main');
insert into restaurant_tables (id, branch_id, label)
  values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T1');

-- A table gets a new session after the previous one is closed.
insert into table_sessions (id, table_id, branch_id)
  values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
update table_sessions set status = 'closed', closed_at = now()
  where id = '40000000-0000-0000-0000-000000000001';
insert into table_sessions (id, table_id, branch_id)
  values ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');

-- ...but never two active sessions at once.
do $$
begin
  insert into table_sessions (table_id, branch_id)
    values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
  raise exception 'two active sessions were allowed on the same table';
exception when unique_violation then null;
end $$;

-- Deleting referenced rows detaches dependants instead of nulling
-- NOT NULL tenant columns.
insert into menu_categories (id, restaurant_id, name)
  values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'C');
insert into menu_items (id, restaurant_id, category_id, name, base_price)
  values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'I', 1000);
insert into menu_variants (id, item_id, name, price)
  values ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'L', 1500);
insert into customers (id, restaurant_id, phone)
  values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '+242060000000');
insert into coupons (id, restaurant_id, code)
  values ('71000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'X');
insert into branches (id, restaurant_id, slug, name)
  values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'b2', 'B2');
insert into staff (id, restaurant_id, branch_id, name, role, pin_hash)
  values ('72000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'S', 'waiter', 'x');
insert into orders (id, restaurant_id, branch_id, table_session_id, customer_id, coupon_id, subtotal, total_amount)
  values ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
          '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 1500, 1500);
insert into order_items (order_id, item_id, variant_id, item_name, unit_price)
  values ('80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'I', 1500);
insert into bills (id, restaurant_id, branch_id, table_session_id, total_amount)
  values ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
          '40000000-0000-0000-0000-000000000002', 1500);
insert into payments (restaurant_id, bill_id, order_id, method, amount)
  values ('10000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'cash', 1500);
insert into feedback (restaurant_id, order_id, food_rating)
  values ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 5);

delete from customers;
delete from coupons;
delete from menu_variants;
delete from branches where id = '20000000-0000-0000-0000-000000000002';
delete from bills;
delete from table_sessions where id = '40000000-0000-0000-0000-000000000002';

do $$
begin
  assert (select customer_id is null and coupon_id is null and table_session_id is null and branch_id is not null from orders),
    'order was not detached from customer/coupon/session';
  assert (select variant_id is null and item_id is not null from order_items), 'order item was not detached from variant';
  assert (select bill_id is null and restaurant_id is not null from payments), 'payment was not detached from bill';
  assert (select branch_id is null and restaurant_id is not null from staff), 'staff was not detached from branch';
end $$;

delete from orders;

do $$
begin
  assert (select order_id is null from payments), 'payment was not detached from order';
  assert (select order_id is null from feedback), 'feedback was not detached from order';
end $$;

rollback;
