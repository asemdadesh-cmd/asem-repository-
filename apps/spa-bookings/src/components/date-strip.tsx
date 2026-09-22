"use client";

import Link from "next/link";
import { addDays, isToday, londonDateKey } from "@/lib/time";
import { cx } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const TZ = "Europe/London";

function dayParts(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric" }).format(d),
  };
}

/** Seven-day scroller anchored on the selected date. */
export function DateStrip({
  selected,
  counts,
}: {
  selected: string;
  counts: Record<string, number>;
}) {
  const start = addDays(selected, -3);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = londonDateKey();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/calendar?date=${addDays(selected, -7)}`}
        aria-label="Previous week"
        className="tap flex items-center justify-center rounded-xl text-text-subtle transition-colors hover:bg-surface-muted hover:text-text"
      >
        <ChevronLeftIcon />
      </Link>

      <ul className="flex flex-1 items-stretch justify-between gap-1">
        {days.map((date) => {
          const { weekday, day } = dayParts(date);
          const active = date === selected;
          const count = counts[date] ?? 0;
          return (
            <li key={date} className="flex-1">
              <Link
                href={`/calendar?date=${date}`}
                aria-current={active ? "date" : undefined}
                aria-label={`${weekday} ${day}${count ? `, ${count} booking${count > 1 ? "s" : ""}` : ", no bookings"}`}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-transparent text-text-muted hover:bg-surface-muted",
                )}
              >
                <span className="text-[0.625rem] font-medium uppercase tracking-wide opacity-80">
                  {weekday}
                </span>
                <span
                  className={cx(
                    "text-base font-semibold leading-none",
                    !active && date === today && "text-accent",
                  )}
                >
                  {day}
                </span>
                <span
                  aria-hidden="true"
                  className={cx(
                    "mt-0.5 h-1.5 w-1.5 rounded-full",
                    count > 0
                      ? active
                        ? "bg-accent-fg"
                        : "bg-accent"
                      : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/calendar?date=${addDays(selected, 7)}`}
        aria-label="Next week"
        className="tap flex items-center justify-center rounded-xl text-text-subtle transition-colors hover:bg-surface-muted hover:text-text"
      >
        <ChevronRightIcon />
      </Link>
    </div>
  );
}

export function TodayLink({ selected }: { selected: string }) {
  if (isToday(selected)) return null;
  return (
    <Link
      href="/calendar"
      className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
    >
      Jump to today
    </Link>
  );
}
