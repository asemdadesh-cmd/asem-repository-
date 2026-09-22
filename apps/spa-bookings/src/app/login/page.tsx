import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12"
    >
      <div className="enter">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl shadow-[var(--shadow-pop)]"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
            Spa Bookings
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Staff access for the Cardiff apartments.
          </p>
        </div>

        <LoginForm next={next} initialError={error} />

        <p className="mt-8 text-center text-xs text-text-subtle">
          Only invited staff can sign in. Ask an admin if you need access.
        </p>
      </div>
    </main>
  );
}
