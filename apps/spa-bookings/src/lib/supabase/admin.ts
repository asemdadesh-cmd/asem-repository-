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
