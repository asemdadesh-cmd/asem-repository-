import { getMyName } from "@/lib/identity";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const name = await getMyName();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <AppHeader name={name} />
      <main id="main" className="flex-1 px-4 pb-28 pt-4 sm:px-6">
        {children}
      </main>
      <BottomNav />
      <ServiceWorkerRegistrar />
    </div>
  );
}
