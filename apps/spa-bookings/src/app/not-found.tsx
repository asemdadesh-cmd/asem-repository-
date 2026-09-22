import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-2 text-xl font-semibold text-text">Page not found</h1>
      <p className="mt-2 text-sm text-text-muted">
        That link doesn&rsquo;t lead anywhere in the app.
      </p>
      <Link href="/calendar" className="mt-6">
        <Button>Back to the calendar</Button>
      </Link>
    </main>
  );
}
