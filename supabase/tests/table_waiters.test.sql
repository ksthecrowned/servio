-- Tests for table → waiter assignment (20261002000005_table_waiters).
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

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');
insert into restaurants (id, owner_id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'a', 'A'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'b', 'B');
insert into restaurant_members (restaurant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'owner');
insert into branches (id, restaurant_id, slug, name) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'a1', 'A1'),
  ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'a2', 'A2'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'b1', 'B1');
insert into restaurant_tables (id, branch_id, label) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1', 'T1'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000a1', 'T2');
insert into staff (id, restaurant_id, branch_id, name, role, pin_hash, is_active) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'W1 (A1)', 'waiter', 'x', true),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', null, 'W2 (all)', 'waiter', 'x', true),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2', 'W3 (A2)', 'waiter', 'x', true),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'K', 'kitchen', 'x', true),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'W5 off', 'waiter', 'x', false),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1', 'W (B)', 'waiter', 'x', true);

-- 1. Valid assignments: a waiter of the branch, or one working in every branch.
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000001' where label = 'T1';
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000002' where label = 'T2';

-- 2. Refused: other branch, not a waiter, inactive, other restaurant.
select pg_temp.expect_error($q$ update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000003' where label = 'T1' $q$,
  'Ce serveur ne peut pas être affecté à cette table.');
select pg_temp.expect_error($q$ update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000004' where label = 'T1' $q$,
  'Ce serveur ne peut pas être affecté à cette table.');
select pg_temp.expect_error($q$ update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000005' where label = 'T1' $q$,
  'Ce serveur ne peut pas être affecté à cette table.');
select pg_temp.expect_error($q$ update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000006' where label = 'T1' $q$,
  'Ce serveur ne peut pas être affecté à cette table.');

-- 3. RLS: the owner can assign; another restaurant's owner cannot touch it.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update restaurant_tables set assigned_staff_id = null where label = 'T1';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T1') = '70000000-0000-0000-0000-000000000001',
    'another restaurant changed the assignment';
end $$;
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000002' where label = 'T1';
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000001' where label = 'T1';
reset role;

-- 4. A waiter who can no longer serve a table loses it, and the open
--    requests they held go back to "new"; resolved ones keep their history.
insert into waiter_requests (id, branch_id, table_id, type, acknowledged_at, assigned_staff_id, resolved_at) values
  ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002',
   'call_waiter', now(), '70000000-0000-0000-0000-000000000001', null),
  ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002',
   'water', now(), '70000000-0000-0000-0000-000000000001', now());
update staff set is_active = false where id = '70000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T1') is null, 'deactivated waiter kept the table';
  assert (select assigned_staff_id is null and acknowledged_at is null from waiter_requests
          where id = '80000000-0000-0000-0000-000000000001'), 'open request still held by a deactivated waiter';
  assert (select assigned_staff_id is not null from waiter_requests
          where id = '80000000-0000-0000-0000-000000000002'), 'resolved request lost who handled it';
end $$;
update staff set branch_id = '20000000-0000-0000-0000-0000000000a2' where id = '70000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T2') is null, 'waiter moved branch kept the table';
end $$;

update staff set branch_id = null where id = '70000000-0000-0000-0000-000000000002';
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000002' where label = 'T2';
update staff set role = 'cashier' where id = '70000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T2') is null, 'waiter turned cashier kept the table';
end $$;

-- An unrelated update (name) keeps the assignment.
update staff set role = 'waiter' where id = '70000000-0000-0000-0000-000000000002';
update restaurant_tables set assigned_staff_id = '70000000-0000-0000-0000-000000000002' where label = 'T2';
update staff set name = 'W2 renamed' where id = '70000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T2') is not null, 'rename dropped the assignment';
end $$;

-- 5. Deleting the waiter unassigns the table.
delete from staff where id = '70000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select assigned_staff_id from restaurant_tables where label = 'T2') is null;
end $$;

rollback;
