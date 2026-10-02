-- Throttle staff PIN sign-in.
--
-- A staff PIN is 4 digits and the restaurant code is its public slug (it is
-- in every table QR URL), so without a limit anyone can try all 10,000 PINs
-- of a role in minutes — and every extra employee in that role makes a hit
-- likelier. Two limits, both counting attempts that did not succeed:
--
--   * per restaurant + client IP: 5 per 15 minutes. Stops one device
--     guessing, without locking out the rest of the restaurant.
--   * per restaurant + role, any IP: 20 per hour. Bounds a distributed
--     attacker (~480 guesses a day instead of unlimited). Trade-off: while
--     someone is actively guessing, that role's sign-in pauses for everyone
--     until the window passes.
--
-- An attempt is recorded BEFORE the PIN is checked, under a lock, so
-- parallel requests cannot all pass the check before any is counted.
-- Rejected (throttled) attempts are not recorded, so a lockout always ends
-- once its window has passed.

create table staff_login_attempts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  role restaurant_role not null,
  ip text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

create index staff_login_attempts_role_idx
  on staff_login_attempts (restaurant_id, role, created_at);
create index staff_login_attempts_ip_idx
  on staff_login_attempts (restaurant_id, ip, created_at);

-- Server-side only: RLS on with no policies, and no grants to API roles.
alter table staff_login_attempts enable row level security;
revoke all on staff_login_attempts from anon, authenticated;

-- Returns the attempt id to pass to complete_staff_login_attempt once the
-- PIN matched. Raises P0001 with a user-facing message when throttled.
create or replace function public.begin_staff_login_attempt(
  p_restaurant_id uuid,
  p_role restaurant_role,
  p_ip text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  -- Serialise attempts for this restaurant so counting and recording are
  -- atomic with respect to each other.
  perform pg_advisory_xact_lock(hashtextextended('staff_login:' || p_restaurant_id::text, 0));

  -- Housekeeping: nothing older than the longest window is ever read.
  delete from staff_login_attempts
  where restaurant_id = p_restaurant_id and created_at < now() - interval '1 day';

  if (
    select count(*) from staff_login_attempts
    where restaurant_id = p_restaurant_id
      and ip = p_ip
      and not succeeded
      and created_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'Too many incorrect PINs from this device. Wait 15 minutes or ask your manager.';
  end if;

  if (
    select count(*) from staff_login_attempts
    where restaurant_id = p_restaurant_id
      and role = p_role
      and not succeeded
      and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Sign-in for this role is paused after too many incorrect PINs. Try again later or ask your manager.';
  end if;

  insert into staff_login_attempts (restaurant_id, role, ip)
  values (p_restaurant_id, p_role, left(p_ip, 100))
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

create or replace function public.complete_staff_login_attempt(p_attempt_id uuid)
returns void
language sql
set search_path = public
as $$
  update staff_login_attempts set succeeded = true where id = p_attempt_id;
$$;

revoke execute on function public.begin_staff_login_attempt(uuid, restaurant_role, text) from public, anon, authenticated;
revoke execute on function public.complete_staff_login_attempt(uuid) from public, anon, authenticated;
grant execute on function public.begin_staff_login_attempt(uuid, restaurant_role, text) to service_role;
grant execute on function public.complete_staff_login_attempt(uuid) to service_role;
