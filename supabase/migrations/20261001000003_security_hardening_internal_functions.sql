-- Safe Supabase hardening for Servio.
-- Keep RLS helper functions executable because they are referenced by RLS policies.
-- Remove direct RPC access only from functions that are strictly internal.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.increment_coupon_usage(uuid) from anon, authenticated;
