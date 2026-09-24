"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, HomeIcon, SettingsIcon, UsersIcon } from "@/components/icons";

const ITEMS = [
  { href: "/", label: "الرئيسية", Icon: HomeIcon, match: (p: string) => p === "/" || p === "/record" },
  { href: "/customers", label: "الزبائن", Icon: UsersIcon, match: (p: string) => p.startsWith("/customers") },
  { href: "/reminders", label: "التذكيرات", Icon: BellIcon, match: (p: string) => p.startsWith("/reminders") },
  {
    href: "/settings",
    label: "الإعدادات",
    Icon: SettingsIcon,
    match: (p: string) => p.startsWith("/settings") || p.startsWith("/products"),
  },
];

export function Nav({ variant, overdue }: { variant: "tabs" | "side"; overdue: number }) {
  const path = usePathname();
  const links = ITEMS.map(({ href, label, Icon, match }) => (
    <Link
      key={href}
      href={href}
      className={variant === "tabs" ? "tab" : "side-link"}
      aria-current={match(path) ? "page" : undefined}
    >
      <Icon size={variant === "tabs" ? 22 : 20} />
      <span>{label}</span>
      {href === "/reminders" && overdue > 0 && (
        <span className="tab-badge num" aria-label={`${overdue} متأخرون`}>
          {overdue}
        </span>
      )}
    </Link>
  ));
  return variant === "tabs" ? (
    <nav className="tabbar" aria-label="التنقل">
      {links}
    </nav>
  ) : (
    <nav className="stack-sm" style={{ gap: 2 }}>
      {links}
    </nav>
  );
}
