"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { CalendarIcon, LockIcon, SettingsIcon, UsersIcon } from "@/components/icons";

const TABS = [
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/lockbox", label: "Lockbox", Icon: LockIcon },
  { href: "/team", label: "Team", Icon: UsersIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75"
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "tap flex flex-col items-center justify-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-accent" : "text-text-subtle hover:text-text",
                )}
              >
                <Icon width={22} height={22} strokeWidth={active ? 2 : 1.6} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
