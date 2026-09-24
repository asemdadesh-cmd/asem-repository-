"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const path = usePathname();
  return (
    <Link href="/products" className="nav-link" aria-current={path === "/products" ? "page" : undefined}>
      الأصناف
    </Link>
  );
}
