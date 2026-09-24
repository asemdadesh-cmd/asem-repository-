import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { logout } from "../actions";
import { NavLinks } from "./NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <>
      <header className="topbar">
        <nav className="container topbar-inner" aria-label="التنقل الرئيسي">
          <Link href="/" className="brand">
            <span aria-hidden="true">🍯</span> دفتر الحلويات
          </Link>
          <NavLinks />
          <form action={logout}>
            <button type="submit" className="nav-link">
              خروج
            </button>
          </form>
        </nav>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
