"use client";

import Link from "next/link";
import type { BookingWithRelations } from "@/lib/types";
import { formatDuration, formatTimeRange, relativeToNow } from "@/lib/time";
import { formatPence } from "@/lib/money";
import { Badge, Card, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { CheckIcon, FlameIcon, HomeIcon, XIcon } from "@/components/icons";
import { cancelBooking, confirmBooking, markSpaReady } from "@/app/actions/bookings";

export function StatusBadge({ booking }: { booking: BookingWithRelations }) {
  if (booking.status === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  if (booking.spa_ready_at) return <Badge tone="ready">Spa on</Badge>;
  if (booking.status === "confirmed") return <Badge tone="accent">Confirmed</Badge>;
  return <Badge tone="warn">To confirm</Badge>;
}

export function BookingCard({
  booking,
  now,
  isUpNext = false,
}: {
  booking: BookingWithRelations;
  /** Serialised on the server so the first paint matches. */
  now: string;
  /** Suppresses the switch-on warning when the Up Next banner already shows it. */
  isUpNext?: boolean;
}) {
  const cancelled = booking.status === "cancelled";
  const startsAt = new Date(booking.starts_at);
  const nowDate = new Date(now);
  const minutesAway = Math.round((startsAt.getTime() - nowDate.getTime()) / 60000);
  const upcoming = minutesAway > 0;
  const needsSwitchOn =
    booking.status === "confirmed" && !booking.spa_ready_at && upcoming && minutesAway <= 90;
  const showSwitchOnWarning = needsSwitchOn && !isUpNext;
  const price = formatPence(booking.price_pence);

  return (
    <Card
      as="li"
      className={cx(
        "enter overflow-hidden transition-opacity",
        cancelled && "opacity-60",
        needsSwitchOn && "border-warn",
      )}
    >
      <Link
        href={`/bookings/${booking.id}`}
        className="block px-4 py-3.5 transition-colors hover:bg-surface-muted"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cx(
                "font-mono text-lg font-semibold leading-tight tracking-tight text-text",
                cancelled && "line-through",
              )}
            >
              {formatTimeRange(booking.starts_at, booking.ends_at)}
            </p>
            <p className="mt-1 truncate text-[0.9375rem] font-medium text-text">
              {booking.guest_name}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-text-muted">
              <HomeIcon width={14} height={14} className="shrink-0" />
              {booking.apartment?.name ?? "Unassigned"}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-text-muted">
                {formatDuration(booking.starts_at, booking.ends_at)}
              </span>
              {price ? (
                <span className="font-semibold tabular-nums text-text">{price}</span>
              ) : (
                <span className="text-xs text-text-subtle">No price agreed</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge booking={booking} />
            {upcoming && !cancelled && (
              <span className="text-xs tabular-nums text-text-subtle">
                {relativeToNow(startsAt, nowDate)}
              </span>
            )}
          </div>
        </div>

        {showSwitchOnWarning && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warn-soft px-2.5 py-1.5 text-xs font-semibold text-warn-soft-fg">
            <FlameIcon width={14} height={14} />
            Switch the spa on now so it&rsquo;s warm in time
          </p>
        )}
      </Link>

      {!cancelled && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {booking.status === "pending" && (
            <ActionForm
              action={confirmBooking}
              fields={{ booking_id: booking.id }}
              label={
                <>
                  <CheckIcon width={16} height={16} />
                  Confirm
                </>
              }
              pendingLabel="Confirming…"
              size="sm"
            />
          )}

          {booking.status === "confirmed" && !booking.spa_ready_at && (
            <ActionForm
              action={markSpaReady}
              fields={{ booking_id: booking.id }}
              label={
                <>
                  <FlameIcon width={16} height={16} />
                  Mark spa ready
                </>
              }
              pendingLabel="Notifying…"
              size="sm"
              variant={needsSwitchOn ? "primary" : "secondary"}
            />
          )}

          {booking.spa_ready_at && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <CheckIcon width={14} height={14} className="text-ready" />
              Switched on by {booking.spa_ready_by_name ?? "a colleague"}
            </p>
          )}

          <ActionForm
            action={cancelBooking}
            fields={{ booking_id: booking.id }}
            label={
              <>
                <XIcon width={16} height={16} />
                Cancel
              </>
            }
            confirmLabel="Tap again to cancel"
            pendingLabel="Cancelling…"
            size="sm"
            variant="ghost"
            className="ml-auto"
          />
        </div>
      )}
    </Card>
  );
}
