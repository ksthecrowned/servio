-- Rate limits for anonymous guest actions (placing orders, calling a waiter).
--
-- Guests don't sign in: anyone holding a table's QR link — or a photo of
-- the sticker — can order or ring the staff from anywhere. Limits per table
-- and per device keep a leaked link from flooding the kitchen or the
-- waiters, while a real table never gets near them:
--
--   order:   6 per table, 10 per device (IP) per 10 minutes
--   request: 10 per table, 15 per device (IP) per 10 minutes
--
-- begin_guest_action records the attempt under a per-table lock before the
-- action runs, so a burst of parallel requests is counted; the caller
-- removes it with cancel_guest_action if the action then fails (bad promo
-- code, dish sold out…), so honest mistakes don't count.

create table guest_actions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  table_id uuid not null references restaurant_tables (id) on delete cascade,
  ip text not null,
  action text not null check (action in ('order', 'request')),
  created_at timestamptz not null default now()
);

create index guest_actions_table_idx on guest_actions (table_id, action, created_at);
create index guest_actions_ip_idx on guest_actions (restaurant_id, ip, action, created_at);

-- Server-side only: RLS on with no policies, and no grants to API roles.
alter table guest_actions enable row level security;
revoke all on guest_actions from anon, authenticated;

create or replace function public.begin_guest_action(p_table_id uuid, p_ip text, p_action text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_table_limit integer;
  v_ip_limit integer;
  v_id uuid;
begin
  if p_action = 'order' then
    v_table_limit := 6;
    v_ip_limit := 10;
  elsif p_action = 'request' then
    v_table_limit := 10;
    v_ip_limit := 15;
  else
    raise exception 'Action inconnue.';
  end if;

  select b.restaurant_id into v_restaurant_id
  from restaurant_tables t
  join branches b on b.id = t.branch_id
  where t.id = p_table_id;
  if not found then
    raise exception 'Table introuvable.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('guest_action:' || p_table_id::text, 0));

  delete from guest_actions where table_id = p_table_id and created_at < now() - interval '1 day';

  if (
    select count(*) from guest_actions
    where table_id = p_table_id and action = p_action and created_at > now() - interval '10 minutes'
  ) >= v_table_limit then
    if p_action = 'order' then
      raise exception 'Trop de commandes envoyées depuis cette table. Patientez quelques minutes ou appelez un serveur.';
    end if;
    raise exception 'Trop de demandes envoyées depuis cette table. Patientez quelques minutes, un serveur va passer.';
  end if;

  if (
    select count(*) from guest_actions
    where restaurant_id = v_restaurant_id and ip = p_ip and action = p_action
      and created_at > now() - interval '10 minutes'
  ) >= v_ip_limit then
    raise exception 'Trop d’envois depuis cet appareil. Patientez quelques minutes.';
  end if;

  insert into guest_actions (restaurant_id, table_id, ip, action)
  values (v_restaurant_id, p_table_id, left(p_ip, 100), p_action)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cancel_guest_action(p_id uuid)
returns void
language sql
set search_path = public
as $$
  delete from guest_actions where id = p_id;
$$;

revoke execute on function public.begin_guest_action(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_guest_action(uuid) from public, anon, authenticated;
grant execute on function public.begin_guest_action(uuid, text, text) to service_role;
grant execute on function public.cancel_guest_action(uuid) to service_role;
