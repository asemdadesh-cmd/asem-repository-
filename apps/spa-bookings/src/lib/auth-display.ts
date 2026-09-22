/** Client-safe name formatting — mirrors the server helper in lib/auth. */
export function displayName(
  profile: { full_name?: string | null; email?: string | null } | null | undefined,
): string {
  if (!profile) return "Someone";
  const name = profile.full_name?.trim();
  if (name) return name;
  return profile.email?.split("@")[0] ?? "Someone";
}
