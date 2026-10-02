// Generated from the migrations by `bun run db:verify && bun run db:types`
// (see scripts/db-types.sh). CI fails if database.types.ts is stale.
export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database.types";
