-- Onboarding and free trial.
--
-- 1. Plan prices were still the pre-Congo placeholders (499/999/1999). Use
--    the XAF pricing hypothesis from PRD section 47.
-- 2. Every restaurant gets a 14-day trial at Business level (PRD section
--    48), started by a trigger so no code path can forget it. Until now no
--    subscription row was ever created and "no row" was read as an endless
--    trial.
-- 3. create_restaurant() creates the restaurant, the owner membership and
--    the first branch in one transaction: onboarding used to do three
--    separate inserts and could leave a restaurant with no owner or branch.

-- ---------------------------------------------------------------------------
-- 1. Prices
-- ---------------------------------------------------------------------------

update subscription_plans set monthly_price = 5000 where tier = 'starter';
update subscription_plans set monthly_price = 10000 where tier = 'business';
update subscription_plans set monthly_price = 20000 where tier = 'pro';

-- ---------------------------------------------------------------------------
-- 2. Trial
-- ---------------------------------------------------------------------------

-- The app reads a restaurant's subscription with maybeSingle(): make "one
-- subscription per restaurant" a rule rather than an assumption.
create unique index subscriptions_restaurant_id_unique on subscriptions (restaurant_id);

-- SECURITY DEFINER: owners may not insert subscriptions themselves (only
-- platform admins can, per RLS), but every new restaurant must get its
-- trial. Lives in the private schema, out of the API.
create or replace function private.start_restaurant_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    restaurant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end
  )
  select new.id, p.id, 'trialing', now() + interval '14 days', now(), now() + interval '14 days'
  from public.subscription_plans p
  where p.tier = 'business';

  return new;
end;
$$;

revoke all on function private.start_restaurant_trial() from public, anon, authenticated;

create trigger restaurants_start_trial
  after insert on restaurants
  for each row execute function private.start_restaurant_trial();

-- Existing restaurants had no subscription row, which the app treated as
-- an open-ended trial. Give them a full 14 days from now rather than
-- cutting anyone off the day this ships.
insert into subscriptions (restaurant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
select r.id, p.id, 'trialing', now() + interval '14 days', now(), now() + interval '14 days'
from restaurants r
cross join subscription_plans p
where p.tier = 'business'
  and not exists (select 1 from subscriptions s where s.restaurant_id = r.id);

-- ---------------------------------------------------------------------------
-- 3. Atomic onboarding
-- ---------------------------------------------------------------------------
--
-- SECURITY INVOKER: runs as the signed-in owner, so the existing RLS
-- bootstrap policies still decide what they may create.

create or replace function public.create_restaurant(
  p_slug text,
  p_name text,
  p_branch_name text,
  p_cuisine_type text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Vous devez être connecté pour créer un restaurant.';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Indiquez le nom du restaurant.';
  end if;
  if exists (select 1 from restaurant_members where user_id = v_user_id) then
    raise exception 'Vous avez déjà un restaurant.';
  end if;

  begin
    insert into restaurants (owner_id, slug, name, cuisine_type)
    values (v_user_id, p_slug, btrim(p_name), nullif(btrim(coalesce(p_cuisine_type, '')), ''))
    returning id into v_restaurant_id;
  exception when unique_violation then
    raise exception 'Cette adresse de restaurant est déjà prise. Essayez un autre nom.';
  end;

  insert into restaurant_members (restaurant_id, user_id, role)
  values (v_restaurant_id, v_user_id, 'owner');

  insert into branches (restaurant_id, slug, name)
  values (v_restaurant_id, 'main', coalesce(nullif(btrim(p_branch_name), ''), 'Succursale principale'));

  return v_restaurant_id;
end;
$$;

revoke execute on function public.create_restaurant(text, text, text, text) from public, anon;
grant execute on function public.create_restaurant(text, text, text, text) to authenticated;
