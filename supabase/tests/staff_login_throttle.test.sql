-- Tests for staff PIN sign-in throttling
-- (20261002000002_staff_login_throttle). Runs inside a transaction that is
-- rolled back; any failed assertion raises.

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
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a', 'A'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'b', 'B');

-- 1. Per device: the 6th unsuccessful attempt within 15 minutes is refused.
select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '198.51.100.1')
from generate_series(1, 5);
select pg_temp.expect_error($q$
  select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '198.51.100.1')
$q$, 'Too many incorrect PINs from this device. Wait 15 minutes or ask your manager.');

do $$ begin
  -- Refused attempts are not recorded, so the lockout cannot be extended.
  assert (select count(*) from staff_login_attempts) = 5, 'throttled attempt was recorded';
  -- Another device, another role or another restaurant is unaffected.
  perform begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '198.51.100.2');
  perform begin_staff_login_attempt('10000000-0000-0000-0000-000000000002', 'waiter', '198.51.100.1');
end $$;

-- 2. Successful sign-ins do not count towards the limit.
do $$
declare v_id uuid;
begin
  for i in 1..10 loop
    v_id := begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'kitchen', '198.51.100.3');
    perform complete_staff_login_attempt(v_id);
  end loop;
end $$;

-- 3. Old failures fall out of the window.
update staff_login_attempts set created_at = now() - interval '16 minutes' where ip = '198.51.100.1';
select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '198.51.100.1');

-- 4. Per role across devices: 20 failures an hour pause the role for everyone.
delete from staff_login_attempts;
select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'cashier', '203.0.113.' || n)
from generate_series(1, 20) as n;
select pg_temp.expect_error($q$
  select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'cashier', '203.0.113.200')
$q$, 'Sign-in for this role is paused after too many incorrect PINs. Try again later or ask your manager.');
do $$ begin
  perform begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '203.0.113.200');
end $$;
update staff_login_attempts set created_at = now() - interval '61 minutes' where role = 'cashier';
select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'cashier', '203.0.113.200');

-- 5. Rows older than a day are purged on the next attempt.
update staff_login_attempts set created_at = now() - interval '2 days';
select begin_staff_login_attempt('10000000-0000-0000-0000-000000000001', 'waiter', '198.51.100.9');
do $$ begin
  assert (select count(*) from staff_login_attempts where restaurant_id = '10000000-0000-0000-0000-000000000001') = 1,
    'old attempts were not purged';
end $$;

-- 6. Only the service role can touch any of it.
do $$ begin
  assert not has_table_privilege('anon', 'staff_login_attempts', 'select');
  assert not has_table_privilege('authenticated', 'staff_login_attempts', 'insert');
  assert not has_function_privilege('anon', 'public.begin_staff_login_attempt(uuid, restaurant_role, text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.complete_staff_login_attempt(uuid)', 'execute');
  assert has_function_privilege('service_role', 'public.begin_staff_login_attempt(uuid, restaurant_role, text)', 'execute');
  assert has_function_privilege('service_role', 'public.complete_staff_login_attempt(uuid)', 'execute');
end $$;

rollback;
