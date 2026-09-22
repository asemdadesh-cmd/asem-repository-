import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
}

/** Returns the session, or null when signed out / not provisioned. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile };
}

/** Guard for every page behind the app shell. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.profile.role !== "admin") redirect("/calendar");
  return session;
}

export { displayName } from "@/lib/auth-display";
