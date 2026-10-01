-- Request lifecycle: waiting → taken by a waiter → done.
-- One active table session per table, opened when the guest scans the QR.

alter table waiter_requests
  add column if not exists acknowledged_at timestamptz,
  add column if not exists assigned_staff_id uuid references staff (id) on delete set null;

create index if not exists waiter_requests_assigned_open_idx
  on waiter_requests (assigned_staff_id)
  where resolved_at is null;

with ranked as (
  select id,
         row_number() over (partition by table_id order by opened_at desc) as n
  from table_sessions
  where status <> 'closed'
)
update table_sessions
set status = 'closed',
    closed_at = coalesce(closed_at, now())
where id in (select id from ranked where n > 1);

create unique index if not exists table_sessions_one_active_idx
  on table_sessions (table_id)
  where status <> 'closed';
