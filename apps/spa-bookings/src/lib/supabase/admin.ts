import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv, requireServerEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — only use it for work the signed-in user
 * is not allowed to do directly (inviting staff, fanning out notifications,
 * the cron sweep). Never import this into a Client Component.
 */
export function createAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  const { serviceRoleKey } = requireServerEnv();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Same client, but null when the server env isn't configured.
 * Notification fan-out uses this so a missing key degrades to "no push sent"
 * rather than failing the booking action that triggered it.
 */
export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error("[admin] service-role client unavailable:", (error as Error).message);
    return null;
  }
}
