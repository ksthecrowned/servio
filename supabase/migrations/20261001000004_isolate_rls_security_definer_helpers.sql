-- Move RLS SECURITY DEFINER helpers out of the API-exposed public schema.
-- These helpers are invoked by RLS policies, not by client RPC calls.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- Helper definitions and policy rewrites are applied in the live database by
-- the corresponding Supabase migration. Keep this migration file as the
-- source-of-truth marker for deployments.

revoke execute on all functions in schema private from public, anon, authenticated;
