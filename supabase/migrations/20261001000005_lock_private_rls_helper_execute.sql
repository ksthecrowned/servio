-- RLS policies execute these SECURITY DEFINER helpers on behalf of
-- anon/authenticated requests. Keep the schema outside the API-exposed
-- schemas; grant only the privileges required for policy evaluation.

grant usage on schema private to anon, authenticated;

grant execute on function private.is_platform_admin() to anon, authenticated;
grant execute on function private.is_restaurant_member(uuid) to anon, authenticated;
grant execute on function private.is_restaurant_manager(uuid) to anon, authenticated;
grant execute on function private.branch_restaurant_id(uuid) to anon, authenticated;
grant execute on function private.table_restaurant_id(uuid) to anon, authenticated;
grant execute on function private.owns_storage_object_restaurant(text) to anon, authenticated;
