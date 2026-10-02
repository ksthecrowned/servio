-- Minimal stand-ins for the parts of a Supabase project that the migrations
-- depend on but do not create themselves (API roles, auth, storage).
--
-- Used only to apply the migrations to a plain Postgres (>= 15) in CI and
-- for local type generation — never run this against a real Supabase
-- project, where these objects already exist.

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create extension if not exists pgcrypto;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text,
  raw_user_meta_data jsonb
);

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create schema storage;

create table storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);

alter table storage.objects enable row level security;

grant usage on schema auth, storage to anon, authenticated, service_role;
