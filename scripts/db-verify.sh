#!/usr/bin/env bash
# Applies every migration to a fresh database on a plain Postgres (>= 15),
# then runs the SQL regression tests in supabase/tests.
#
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres bun run db:verify
#
# DATABASE_URL must point at a throwaway server: the script (re)creates a
# database named servio_verify on it. Leaves that database in place so
# `bun run db:types` can generate types from it.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to a throwaway Postgres server}"
root="$(cd "$(dirname "$0")/.." && pwd)"
target="${DATABASE_URL%/*}/servio_verify"
psql_opts=(-v ON_ERROR_STOP=1 -q -X)
export PGOPTIONS="${PGOPTIONS:-} --client-min-messages=warning"

psql "$DATABASE_URL" "${psql_opts[@]}" \
  -c "drop database if exists servio_verify" \
  -c "create database servio_verify"

psql "$target" "${psql_opts[@]}" -f "$root/supabase/tests/00_platform_stubs.sql"

for migration in "$root"/supabase/migrations/*.sql; do
  echo "migrate  $(basename "$migration")"
  psql "$target" "${psql_opts[@]}" --single-transaction -f "$migration"
done

for test in "$root"/supabase/tests/*.test.sql; do
  echo "test     $(basename "$test")"
  psql "$target" "${psql_opts[@]}" -o /dev/null -f "$test"
done

# Concurrency tests need several connections and committed data, so they run
# on a throwaway copy of the verified database.
scratch="${DATABASE_URL%/*}/servio_verify_concurrency"
for test in "$root"/supabase/tests/*.concurrent.sh; do
  echo "test     $(basename "$test")"
  psql "$DATABASE_URL" "${psql_opts[@]}" \
    -c "drop database if exists servio_verify_concurrency" \
    -c "create database servio_verify_concurrency template servio_verify"
  "$test" "$scratch"
  psql "$DATABASE_URL" "${psql_opts[@]}" -c "drop database servio_verify_concurrency"
done

echo "ok"
