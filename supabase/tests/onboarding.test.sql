-- Tests for create_restaurant and the automatic trial
-- (20261002000003_onboarding_trial). Run as the `authenticated` API role
-- with a simulated JWT, so RLS applies exactly as for a signed-in owner.
-- Runs inside a transaction that is rolled back.

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
grant execute on function pg_temp.expect_error(text, text) to authenticated, anon;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

-- Prices follow the XAF hypothesis of PRD section 47.
do $$ begin
  assert (select array_agg(monthly_price order by monthly_price) from subscription_plans) = '{5000,10000,20000}',
    'plan prices are not in XAF';
end $$;

-- 1. A signed-in owner creates restaurant + membership + branch + trial at once.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

create temp table created as
select create_restaurant('chez-a', '  Chez A  ', '', 'Congolaise') as id;

do $$
declare
  v_id uuid := (select id from created);
  v_sub record;
begin
  assert (select name from restaurants where id = v_id) = 'Chez A', 'name not trimmed';
  assert (select owner_id from restaurants where id = v_id) = '00000000-0000-0000-0000-00000000000a';
  assert (select role from restaurant_members where restaurant_id = v_id) = 'owner', 'owner membership missing';
  assert (select name from branches where restaurant_id = v_id and slug = 'main') = 'Succursale principale', 'default branch missing';

  -- The owner can read (but not write) their subscription.
  select s.status, s.trial_ends_at, p.tier into v_sub
  from subscriptions s join subscription_plans p on p.id = s.plan_id
  where s.restaurant_id = v_id;
  assert v_sub.status = 'trialing' and v_sub.tier = 'business', 'trial is not Business';
  assert v_sub.trial_ends_at = now() + interval '14 days', 'trial is not 14 days';
end $$;

-- 2. Owners cannot grant themselves a subscription.
do $$ begin
  insert into subscriptions (restaurant_id, plan_id, status)
  select (select id from created), id, 'active' from subscription_plans where tier = 'pro';
  raise exception 'owner was able to insert a subscription';
exception when insufficient_privilege then null;
end $$;

-- 3. One restaurant per account (the dashboard only handles one).
select pg_temp.expect_error($q$ select create_restaurant('chez-a-2', 'Chez A bis', 'Main') $q$,
  'You already have a restaurant.');

-- 4. Taken slug: a clear message, and nothing left behind.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_error($q$ select create_restaurant('chez-a', 'Chez B', 'Main') $q$,
  'That restaurant address is already taken. Try another name.');
do $$ begin
  assert not exists (select 1 from restaurant_members where user_id = '00000000-0000-0000-0000-00000000000b'),
    'failed onboarding left a membership behind';
end $$;
select pg_temp.expect_error($q$ select create_restaurant('chez-b', '   ', 'Main') $q$,
  'Restaurant name is required.');

-- 5. Signed-out visitors cannot call it at all.
reset role;
do $$ begin
  assert not has_function_privilege('anon', 'public.create_restaurant(text, text, text, text)', 'execute');
  assert has_function_privilege('authenticated', 'public.create_restaurant(text, text, text, text)', 'execute');
  assert (select count(*) from subscriptions) = 1, 'unexpected subscriptions';
end $$;

rollback;
