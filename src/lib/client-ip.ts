import { headers } from "next/headers";

/**
 * Client IP, for rate limits. On Vercel the first x-forwarded-for entry is
 * set by the platform and cannot be spoofed; behind another proxy make sure
 * it overwrites the header. If it is spoofable, only the per-device limits
 * are weakened — the per-table / per-role limits still apply.
 */
export async function clientIp(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
