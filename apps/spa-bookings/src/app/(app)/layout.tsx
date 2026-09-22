import { requireSession } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <AppHeader profile={profile} />

      <main
        id="main"
        /* Bottom padding clears the fixed tab bar plus the iOS home indicator. */
        className="flex-1 px-4 pb-28 pt-4 sm:px-6"
      >
        {children}
      </main>

      <BottomNav />
      <ServiceWorkerRegistrar />
    </div>
  );
}
