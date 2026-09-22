export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-text">You&rsquo;re offline</h1>
      <p className="mt-2 text-sm text-text-muted">
        The booking calendar needs a connection. Reconnect and this page will reload.
      </p>
    </main>
  );
}
