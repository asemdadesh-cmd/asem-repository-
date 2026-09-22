import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBookingsBetween } from "@/lib/queries";
import {
  addDays,
  dayBoundsUtc,
  durationHours,
  formatDayLong,
  formatHoursTotal,
  isToday,
  londonDateKey,
} from "@/lib/time";
import { formatPence, sumPence } from "@/lib/money";
import type { BookingWithRelations } from "@/lib/types";
import { Button, EmptyState, SectionHeading } from "@/components/ui";
import { DateStrip, TodayLink } from "@/components/date-strip";
import { BookingCard } from "@/components/booking-card";
import { UpNext } from "@/components/up-next";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireSession();
  const { date } = await searchParams;
  const selected = date && DATE_PATTERN.test(date) ? date : londonDateKey();

  const supabase = await createClient();
  const { from, to } = dayBoundsUtc(selected);

  // One wide query feeds both the day list and the strip's booking dots.
  const stripFrom = dayBoundsUtc(addDays(selected, -10)).from;
  const stripTo = dayBoundsUtc(addDays(selected, 11)).to;

  const [dayBookings, windowBookings, upNext] = await Promise.all([
    getBookingsBetween(supabase, from, to),
    getBookingsBetween(supabase, stripFrom, stripTo),
    getNextLiveBooking(supabase),
  ]);

  const counts = windowBookings.reduce<Record<string, number>>((acc, booking) => {
    if (booking.status === "cancelled") return acc;
    const key = londonDateKey(booking.starts_at);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const live = dayBookings.filter((b) => b.status !== "cancelled");
  const cancelled = dayBookings.filter((b) => b.status === "cancelled");
  const now = new Date().toISOString();

  // Day totals: hours the spa is booked for, and what was agreed for them.
  // Cancelled slots are excluded; unpriced slots are counted but flagged.
  const totalHours = live.reduce((sum, b) => sum + durationHours(b.starts_at, b.ends_at), 0);
  const totalPence = sumPence(live.map((b) => b.price_pence));
  const unpricedCount = live.filter((b) => b.price_pence === null).length;

  return (
    <>
      <RealtimeRefresher />

      <div className="space-y-5">
        <header className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-text">
              {isToday(selected) ? "Today" : formatDayLong(selected)}
            </h1>
            <TodayLink selected={selected} />
          </div>
          <DateStrip selected={selected} counts={counts} />
        </header>

        {upNext && <UpNext booking={upNext} now={now} />}

        <section aria-labelledby="day-heading">
          <SectionHeading>
            <span id="day-heading">
              {isToday(selected) ? "Today's slots" : formatDayLong(selected)}
            </span>
          </SectionHeading>

          {live.length > 0 && (
            <dl className="mb-3 flex gap-2">
              <div className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                <dt className="text-xs font-medium text-text-subtle">Booked</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-text">
                  {formatHoursTotal(totalHours)}
                  <span className="ml-1.5 text-xs font-normal text-text-muted">
                    over {live.length} slot{live.length === 1 ? "" : "s"}
                  </span>
                </dd>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                <dt className="text-xs font-medium text-text-subtle">Agreed</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-text">
                  {formatPence(totalPence)}
                  {unpricedCount > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-warn">
                      {unpricedCount} unpriced
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          {live.length === 0 ? (
            <EmptyState
              title="No spa slots booked"
              description={
                isToday(selected)
                  ? "Nothing scheduled today. Add a slot when a guest messages."
                  : "Nothing scheduled for this day yet."
              }
              action={
                <Link href={`/bookings/new?date=${selected}`}>
                  <Button>
                    <PlusIcon width={18} height={18} />
                    Add a booking
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {live.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  now={now}
                  isUpNext={booking.id === upNext?.id}
                />
              ))}
            </ul>
          )}
        </section>

        {cancelled.length > 0 && (
          <section aria-labelledby="cancelled-heading">
            <SectionHeading>
              <span id="cancelled-heading">Cancelled</span>
            </SectionHeading>
            <ul className="space-y-3">
              {cancelled.map((booking) => (
                <BookingCard key={booking.id} booking={booking} now={now} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Floating compose action — the single most-used button in the app. */}
      <Link
        href={`/bookings/new?date=${selected}`}
        aria-label="Add a booking"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-pop)] transition-transform active:scale-95 sm:right-[max(1rem,calc(50%-16rem+1rem))]"
      >
        <PlusIcon width={26} height={26} strokeWidth={2.2} />
      </Link>
    </>
  );
}

/** The next slot that still needs attention, regardless of which day is shown. */
async function getNextLiveBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<BookingWithRelations | null> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 36 * 3600_000);
  const bookings = await getBookingsBetween(
    supabase,
    now.toISOString(),
    horizon.toISOString(),
  );
  return bookings.find((b) => b.status !== "cancelled") ?? null;
}
