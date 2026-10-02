-- Waiter assigned to each table (Dashboard → Tables).
--
-- Requests and ready orders of a table go to its waiter first; a table with
-- no waiter is everyone's. Only an active waiter of the same restaurant who
-- works in that branch (or in every branch) can be assigned, and a waiter
-- who is deactivated, changes role or moves branch loses tables they can no
-- longer serve, so a table is never stuck with someone who cannot see it.
-- The same applies to open requests they were holding: they go back to
-- "new" for the table's waiter (or everyone).

alter table restaurant_tables
  add column assigned_staff_id uuid references staff (id) on delete set null;

create index restaurant_tables_assigned_staff_id_idx on restaurant_tables (assigned_staff_id);

create or replace function private.check_table_waiter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_staff_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.staff s
    join public.branches b on b.id = new.branch_id
    where s.id = new.assigned_staff_id
      and s.restaurant_id = b.restaurant_id
      and s.role = 'waiter'
      and s.is_active
      and (s.branch_id is null or s.branch_id = new.branch_id)
  ) then
    raise exception 'Ce serveur ne peut pas être affecté à cette table.';
  end if;

  return new;
end;
$$;

create trigger restaurant_tables_check_waiter
  before insert or update of assigned_staff_id, branch_id on restaurant_tables
  for each row execute function private.check_table_waiter();

create or replace function private.release_waiter_tables()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.restaurant_tables
  set assigned_staff_id = null
  where assigned_staff_id = new.id
    and (
      not new.is_active
      or new.role <> 'waiter'
      or (new.branch_id is not null and branch_id <> new.branch_id)
    );

  update public.waiter_requests
  set assigned_staff_id = null,
      acknowledged_at = null
  where assigned_staff_id = new.id
    and resolved_at is null
    and (
      not new.is_active
      or new.role <> 'waiter'
      or (new.branch_id is not null and branch_id <> new.branch_id)
    );

  return new;
end;
$$;

create trigger staff_release_tables
  after update of is_active, role, branch_id on staff
  for each row execute function private.release_waiter_tables();

revoke all on function private.check_table_waiter() from public, anon, authenticated;
revoke all on function private.release_waiter_tables() from public, anon, authenticated;
