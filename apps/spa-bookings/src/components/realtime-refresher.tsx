"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps every phone's calendar in sync. Without this, two staff replying to the
 * same WhatsApp message would not see each other's confirmation.
 */
export function RealtimeRefresher({ table = "bookings" }: { table?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        // Debounced: a burst of updates should cost one refresh, not five.
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 250);
      })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router, table]);

  return null;
}
