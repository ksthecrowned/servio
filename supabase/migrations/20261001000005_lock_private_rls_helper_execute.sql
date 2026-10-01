-- Lock down execution of private RLS helper functions.
-- These functions are referenced by RLS policies and are not client RPCs.

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
