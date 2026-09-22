import Link from "next/link";

export function AppHeader({ name }: { name: string | null }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/settings"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl"
          aria-label={name ? `You are ${name}. Change in settings` : "Choose your name"}
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-text">
              {name ?? "Spa Bookings"}
            </span>
            <span className="block truncate text-xs text-text-subtle">
              {name ? "Cardiff apartments" : "Tap to choose your name"}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
