-- Move RLS SECURITY DEFINER helpers out of the API-exposed public schema.
-- These helpers are invoked by RLS policies, not by client RPC calls.
--
-- The live database already contains this change. This migration is the
-- reproducible source of truth for fresh environments.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

create or replace function private.is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_restaurant_manager(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

create or replace function private.branch_restaurant_id(target_branch_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.branches where id = target_branch_id;
$$;

create or replace function private.table_restaurant_id(target_table_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.restaurant_id
  from public.restaurant_tables t
  join public.branches b on b.id = t.branch_id
  where t.id = target_table_id;
$$;

create or replace function private.owns_storage_object_restaurant(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segment text := split_part(object_name, '/', 1);
begin
  if segment !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;

  return private.is_restaurant_manager(segment::uuid);
end;
$$;

-- Replace references in existing RLS/storage policies without changing their
-- policy names, commands, roles, or predicates.
do $$
declare
  p record;
  new_qual text;
  new_check text;
  target text;
begin
  for p in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      pol.polname as policy_name,
      pg_get_expr(pol.polqual, pol.polrelid) as qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'storage')
      and (
        pg_get_expr(pol.polqual, pol.polrelid) like '%is_platform_admin%'
        or pg_get_expr(pol.polqual, pol.polrelid) like '%is_restaurant_member%'
        or pg_get_expr(pol.polqual, pol.polrelid) like '%is_restaurant_manager%'
        or pg_get_expr(pol.polqual, pol.polrelid) like '%branch_restaurant_id%'
        or pg_get_expr(pol.polqual, pol.polrelid) like '%table_restaurant_id%'
        or pg_get_expr(pol.polqual, pol.polrelid) like '%owns_storage_object_restaurant%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%is_platform_admin%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%is_restaurant_member%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%is_restaurant_manager%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%branch_restaurant_id%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%table_restaurant_id%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%owns_storage_object_restaurant%'
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    new_qual := replace(new_qual, 'is_platform_admin()', 'private.is_platform_admin()');
    new_qual := replace(new_qual, 'is_restaurant_member(', 'private.is_restaurant_member(');
    new_qual := replace(new_qual, 'is_restaurant_manager(', 'private.is_restaurant_manager(');
    new_qual := replace(new_qual, 'branch_restaurant_id(', 'private.branch_restaurant_id(');
    new_qual := replace(new_qual, 'table_restaurant_id(', 'private.table_restaurant_id(');
    new_qual := replace(new_qual, 'owns_storage_object_restaurant(', 'private.owns_storage_object_restaurant(');

    new_check := replace(new_check, 'is_platform_admin()', 'private.is_platform_admin()');
    new_check := replace(new_check, 'is_restaurant_member(', 'private.is_restaurant_member(');
    new_check := replace(new_check, 'is_restaurant_manager(', 'private.is_restaurant_manager(');
    new_check := replace(new_check, 'branch_restaurant_id(', 'private.branch_restaurant_id(');
    new_check := replace(new_check, 'table_restaurant_id(', 'private.table_restaurant_id(');
    new_check := replace(new_check, 'owns_storage_object_restaurant(', 'private.owns_storage_object_restaurant(');

    target := format('%I.%I', p.schema_name, p.table_name);

    if p.qual is not null and p.with_check is not null then
      execute format(
        'alter policy %I on %s using (%s) with check (%s)',
        p.policy_name, target, new_qual, new_check
      );
    elsif p.qual is not null then
      execute format(
        'alter policy %I on %s using (%s)',
        p.policy_name, target, new_qual
      );
    elsif p.with_check is not null then
      execute format(
        'alter policy %I on %s with check (%s)',
        p.policy_name, target, new_check
      );
    end if;
  end loop;
end
$$;

drop function if exists public.is_platform_admin();
drop function if exists public.is_restaurant_member(uuid);
drop function if exists public.is_restaurant_manager(uuid);
drop function if exists public.branch_restaurant_id(uuid);
drop function if exists public.table_restaurant_id(uuid);
drop function if exists public.owns_storage_object_restaurant(text);

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke execute on all functions in schema private from public, anon, authenticated;
