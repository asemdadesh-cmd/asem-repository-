"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BookingWithRelations } from "@/lib/types";
import { formatDayShort, formatTimeRange, londonDateKey } from "@/lib/time";
import { Card, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { CheckIcon, FlameIcon } from "@/components/icons";
import { markSpaReady } from "@/app/actions/bookings";

const SWITCH_ON_LEAD_MS = 60 * 60 * 1000;

function countdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/**
 * The operational headline: what needs doing next and when the spa must go on.
 * The clock ticks client-side but is seeded from the server so there is no
 * hydration mismatch and no layout shift.
 */
export function UpNext({ booking, now }: { booking: BookingWithRelations; now: string }) {
  const [currentMs, setCurrentMs] = useState(() => new Date(now).getTime());

  useEffect(() => {
    setCurrentMs(Date.now());
    const id = setInterval(() => setCurrentMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(booking.starts_at).getTime();
  const switchOnMs = startMs - SWITCH_ON_LEAD_MS;
  const ready = Boolean(booking.spa_ready_at);
  const pending = booking.status === "pending";
  const overdue = !ready && currentMs >= switchOnMs;
  const dayLabel = formatDayShort(londonDateKey(booking.starts_at));

  const tone = ready
    ? "border-ready/40 bg-ready-soft"
    : overdue
      ? "border-warn bg-warn-soft"
      : "border-border bg-surface";

  return (
    <Card className={cx("overflow-hidden border-2 p-0", tone)}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
            Up next
          </p>
          <span className="text-xs font-medium text-text-muted">{dayLabel}</span>
        </div>

        <Link href={`/bookings/${booking.id}`} className="mt-2 block">
          <p className="font-mono text-2xl font-semibold tracking-tight text-text">
            {formatTimeRange(booking.starts_at, booking.ends_at)}
          </p>
          <p className="mt-1 text-[0.9375rem] text-text">
            <span className="font-medium">{booking.guest_name}</span>
            <span className="text-text-muted"> · {booking.apartment?.name ?? "Unassigned"}</span>
          </p>
        </Link>

        <div className="mt-3" aria-live="polite">
          {ready ? (
            <p className="text-sm font-semibold text-ready-soft-fg">
              <CheckIcon
                width={16}
                height={16}
                className="mr-1.5 inline-block shrink-0 align-[-0.2em]"
              />
              Spa is on — switched on by{" "}
              {booking.spa_ready_by_profile?.full_name?.split(" ")[0] ?? "a colleague"}
            </p>
          ) : overdue ? (
            <p className="text-sm font-semibold text-warn-soft-fg">
              <FlameIcon
                width={16}
                height={16}
                className="mr-1.5 inline-block shrink-0 align-[-0.2em]"
              />
              Switch the spa on now — guest arrives in{" "}
              <span className="whitespace-nowrap tabular-nums">
                {countdown(startMs - currentMs)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              Switch the spa on in{" "}
              <span className="whitespace-nowrap font-semibold tabular-nums text-text">
                {countdown(switchOnMs - currentMs)}
              </span>
            </p>
          )}
        </div>
      </div>

      {!ready && (
        <div className="flex gap-2 border-t border-border/60 px-4 py-3">
          <ActionForm
            action={markSpaReady}
            fields={{ booking_id: booking.id }}
            label={
              <>
                <FlameIcon width={18} height={18} />
                Spa is on — tell the team
              </>
            }
            pendingLabel="Notifying the team…"
            size="md"
            block
          />
        </div>
      )}

      {pending && (
        <p className="border-t border-border/60 bg-warn-soft px-4 py-2 text-xs font-semibold text-warn-soft-fg">
          Not confirmed with the guest yet
        </p>
      )}
    </Card>
  );
}
