import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Database functions raise business-rule failures (sold out, coupon used
 * up, bill already paid…) as plain `raise exception`, i.e. SQLSTATE P0001,
 * with a message meant for the user. Anything else is an internal error:
 * log it and show the fallback instead of leaking database details.
 */
export function userFacingError(error: PostgrestError | null, fallback: string): string {
  if (error?.code === "P0001") return error.message;
  if (error) console.error(error);
  return fallback;
}
