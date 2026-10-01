-- Security hardening for exposed Supabase functions.
-- Keep SECURITY DEFINER where required by RLS helpers, but prevent direct RPC execution
-- by client roles. These functions are intended to be invoked from policies/server-side flows.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.branch_restaurant_id(uuid) from anon, authenticated;
revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.increment_coupon_usage(uuid) from anon, authenticated;
revoke execute on function public.is_platform_admin() from anon, authenticated;
revoke execute on function public.is_restaurant_manager(uuid) from anon, authenticated;
revoke execute on function public.is_restaurant_member(uuid) from anon, authenticated;
revoke execute on function public.owns_storage_object_restaurant(text) from anon, authenticated;
revoke execute on function public.table_restaurant_id(uuid) from anon, authenticated;
