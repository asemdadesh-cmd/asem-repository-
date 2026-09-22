import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";

/** Request-scoped Supabase client that respects RLS as the signed-in user. */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the middleware refreshes the
          // session cookie instead, so this is safe to ignore.
        }
      },
    },
  });
}
