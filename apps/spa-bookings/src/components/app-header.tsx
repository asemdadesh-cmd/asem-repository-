import type { Profile } from "@/lib/types";
import { displayName } from "@/lib/auth";
import { Badge } from "@/components/ui";

export function AppHeader({ profile }: { profile: Profile }) {
  const name = displayName(profile);
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-text">{name}</p>
          <p className="truncate text-xs text-text-subtle">Cardiff apartments</p>
        </div>
        {profile.role === "admin" && <Badge tone="accent">Admin</Badge>}
      </div>
    </header>
  );
}
