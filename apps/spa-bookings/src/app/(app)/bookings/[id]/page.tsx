import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession, displayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_SELECT } from "@/lib/queries";
import type { BookingWithRelations } from "@/lib/types";
import {
  formatDayLong,
  formatDuration,
  formatTime,
  formatTimeRange,
  londonDateKey,
  relativeToNow,
} from "@/lib/time";
import { formatPence } from "@/lib/money";
import { Card, SectionHeading } from "@/components/ui";
import { StatusBadge } from "@/components/booking-card";
import { BookingActions } from "./booking-actions";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { ChevronLeftIcon, ClockIcon, FlameIcon, HomeIcon } from "@/components/icons";
import { PriceEditor } from "./price-editor";

export const metadata: Metadata = { title: "Booking" };
export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", id)
    .maybeSingle<BookingWithRelations>();

  if (!booking) notFound();

  const dayKey = londonDateKey(booking.starts_at);
  const switchOnAt = new Date(new Date(booking.starts_at).getTime() - 60 * 60 * 1000);

  const timeline = [
    booking.created_at && {
      label: `Added by ${displayName(booking.created_by_profile)}`,
      at: booking.created_at,
    },
    booking.confirmed_at && {
      label: `Confirmed by ${displayName(booking.confirmed_by_profile)}`,
      at: booking.confirmed_at,
    },
    booking.reminder_sent_at && {
      label: "Switch-on reminder sent",
      at: booking.reminder_sent_at,
    },
    booking.price_set_at && {
      label: `${formatPence(booking.price_pence)} agreed by ${displayName(
        booking.price_set_by_profile,
      )}`,
      at: booking.price_set_at,
    },
    booking.spa_ready_at && {
      label: `Spa switched on by ${displayName(booking.spa_ready_by_profile)}`,
      at: booking.spa_ready_at,
    },
    booking.cancelled_at && {
      label: `Cancelled${booking.cancel_reason ? ` — ${booking.cancel_reason}` : ""}`,
      at: booking.cancelled_at,
    },
  ].filter(Boolean) as { label: string; at: string }[];

  const contactHref = booking.guest_contact
    ? `https://wa.me/${booking.guest_contact.replace(/[^\d]/g, "")}`
    : null;

  return (
    <>
      <RealtimeRefresher />

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?date=${dayKey}`}
            className="tap -ml-2 flex items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
            aria-label="Back to the calendar"
          >
            <ChevronLeftIcon />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-text">Booking</h1>
          <div className="ml-auto">
            <StatusBadge booking={booking} />
          </div>
        </div>

        <Card className="p-5">
          <p className="font-mono text-2xl font-semibold tracking-tight text-text">
            {formatTimeRange(booking.starts_at, booking.ends_at)}
          </p>
          <p className="mt-1 text-sm text-text-muted">{formatDayLong(dayKey)}</p>

          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-xl bg-surface-muted px-3.5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                Hours booked
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                {formatDuration(booking.starts_at, booking.ends_at)}
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-surface-muted px-3.5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                Agreed price
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                {formatPence(booking.price_pence) ?? (
                  <span className="text-sm font-normal text-text-subtle">Not set</span>
                )}
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <dt className="sr-only">Guest</dt>
              <span aria-hidden="true" className="mt-0.5 text-text-subtle">
                <HomeIcon width={16} height={16} />
              </span>
              <dd className="text-text">
                <span className="font-medium">{booking.guest_name}</span>
                <span className="text-text-muted">
                  {" · "}
                  {booking.apartment?.name ?? "Unassigned"}
                </span>
              </dd>
            </div>

            <div className="flex items-start gap-2.5">
              <dt className="sr-only">Switch the spa on at</dt>
              <span aria-hidden="true" className="mt-0.5 text-text-subtle">
                <FlameIcon width={16} height={16} />
              </span>
              <dd className="text-text-muted">
                Switch on by{" "}
                <span className="font-mono font-medium text-text">
                  {formatTime(switchOnAt)}
                </span>{" "}
                so it heats in time
              </dd>
            </div>

            {contactHref && (
              <div className="flex items-start gap-2.5">
                <dt className="sr-only">Guest contact</dt>
                <span aria-hidden="true" className="mt-0.5 text-text-subtle">
                  <ClockIcon width={16} height={16} />
                </span>
                <dd>
                  <a
                    href={contactHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Message {booking.guest_contact} on WhatsApp
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {booking.notes && (
            <div className="mt-5 rounded-xl bg-surface-muted p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">{booking.notes}</p>
            </div>
          )}
        </Card>

        <PriceEditor booking={booking} />

        <BookingActions booking={booking} />

        <section aria-labelledby="timeline-heading">
          <SectionHeading>
            <span id="timeline-heading">Activity</span>
          </SectionHeading>
          <Card className="divide-y divide-border">
            {timeline.map((entry) => (
              <div key={`${entry.label}-${entry.at}`} className="px-4 py-3">
                <p className="text-sm text-text">{entry.label}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {formatTime(entry.at)} · {relativeToNow(entry.at)}
                </p>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
