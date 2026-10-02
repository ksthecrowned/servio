-- Tests for guest action rate limits (20261002000007_guest_rate_limit).
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
insert into restaurants (id, owner_id, slug, name)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'r', 'R');
insert into branches (id, restaurant_id, slug, name)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'Main');
insert into restaurant_tables (id, branch_id, label) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T1'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T2'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'T3');

-- 1. Per table: the 7th order in 10 minutes is refused (6 different devices).
select begin_guest_action('30000000-0000-0000-0000-000000000001', '198.51.100.' || n, 'order') from generate_series(1, 6) n;
select pg_temp.expect_error($q$ select begin_guest_action('30000000-0000-0000-0000-000000000001', '198.51.100.99', 'order') $q$,
  'Trop de commandes envoyées depuis cette table. Patientez quelques minutes ou appelez un serveur.');
do $$ begin
  assert (select count(*) from guest_actions where table_id = '30000000-0000-0000-0000-000000000001') = 6,
    'refused attempt was recorded';
  -- Requests are counted separately from orders.
  perform begin_guest_action('30000000-0000-0000-0000-000000000001', '198.51.100.1', 'request');
end $$;

-- 2. A failed action given back doesn't count.
update guest_actions set created_at = now() - interval '11 minutes' where table_id = '30000000-0000-0000-0000-000000000001';
do $$
declare v_id uuid;
begin
  for i in 1..10 loop
    v_id := begin_guest_action('30000000-0000-0000-0000-000000000001', '198.51.100.7', 'order');
    perform cancel_guest_action(v_id);
  end loop;
end $$;

-- 3. Per device across tables: the 11th order from one IP is refused.
select begin_guest_action(t, '203.0.113.5', 'order')
from (values ('30000000-0000-0000-0000-000000000002'::uuid), ('30000000-0000-0000-0000-000000000003'::uuid)) v(t),
     generate_series(1, 5);
select pg_temp.expect_error($q$ select begin_guest_action('30000000-0000-0000-0000-000000000001', '203.0.113.5', 'order') $q$,
  'Trop d’envois depuis cet appareil. Patientez quelques minutes.');

-- 4. Requests: 10 per table.
select begin_guest_action('30000000-0000-0000-0000-000000000003', '192.0.2.' || n, 'request') from generate_series(1, 10) n;
select pg_temp.expect_error($q$ select begin_guest_action('30000000-0000-0000-0000-000000000003', '192.0.2.200', 'request') $q$,
  'Trop de demandes envoyées depuis cette table. Patientez quelques minutes, un serveur va passer.');

-- 5. Unknown table / action.
select pg_temp.expect_error($q$ select begin_guest_action('30000000-0000-0000-0000-0000000000ff', '192.0.2.1', 'order') $q$,
  'Table introuvable.');
select pg_temp.expect_error($q$ select begin_guest_action('30000000-0000-0000-0000-000000000001', '192.0.2.1', 'spam') $q$,
  'Action inconnue.');

-- 6. Server-side only.
do $$ begin
  assert not has_table_privilege('anon', 'guest_actions', 'select');
  assert not has_function_privilege('anon', 'public.begin_guest_action(uuid, text, text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.cancel_guest_action(uuid)', 'execute');
  assert has_function_privilege('service_role', 'public.begin_guest_action(uuid, text, text)', 'execute');
end $$;

rollback;
