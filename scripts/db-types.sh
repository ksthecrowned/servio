#!/usr/bin/env bash
# Regenerates src/lib/supabase/database.types.ts from the servio_verify
# database built by scripts/db-verify.sh (run that first, with the same
# DATABASE_URL). The output is a pure function of the migrations, so CI
# fails if the committed file is out of date.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the Postgres server used by db:verify}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/src/lib/supabase/database.types.ts"

npx supabase gen types typescript \
  --db-url "${DATABASE_URL%/*}/servio_verify?sslmode=disable" \
  --schema public > "$out" 2> /dev/null
npx oxfmt "$out" > /dev/null 2>&1
echo "wrote ${out#"$root"/}"
