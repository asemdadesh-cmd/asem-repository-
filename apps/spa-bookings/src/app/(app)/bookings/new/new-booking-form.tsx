"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { Apartment } from "@/lib/types";
import { dayBoundsUtc, formatTimeRange, timeOptions } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import { createBooking } from "@/app/actions/bookings";
import type { ActionResult } from "@/app/actions/types";

const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "1½ hr", minutes: 90 },
  { label: "2 hr", minutes: 120 },
];

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function SubmitBar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={18} height={18} />
          Saving…
        </>
      ) : (
        "Save booking"
      )}
    </Button>
  );
}

export function NewBookingForm({
  apartments,
  initialDate,
}: {
  apartments: Apartment[];
  initialDate: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult, FormData>(createBooking, { ok: true });

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("19:00");
  const [duration, setDuration] = useState(60);
  const [taken, setTaken] = useState<{ starts_at: string; ends_at: string }[]>([]);

  const endTime = useMemo(
    () => addMinutesToTime(startTime, duration),
    [startTime, duration],
  );
  const options = useMemo(() => timeOptions(30), []);
  const durationLabel = useMemo(() => {
    if (duration < 60) return `${duration} min`;
    const hours = Math.floor(duration / 60);
    const rest = duration % 60;
    return rest === 0 ? `${hours} h` : rest === 30 ? `${hours}\u00bd h` : `${hours} h ${rest} min`;
  }, [duration]);

  // Redirect once the booking saves.
  useEffect(() => {
    if (state.ok && state.message) router.push(`/calendar?date=${date}`);
  }, [state, router, date]);

  // Show what's already booked that day so clashes are obvious before saving.
  useEffect(() => {
    // The native date input can be empty mid-edit; don't query on a bad value.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setTaken([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { from, to } = dayBoundsUtc(date);
      const { data } = await supabase
        .from("bookings")
        .select("starts_at, ends_at")
        .neq("status", "cancelled")
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at")
        .returns<{ starts_at: string; ends_at: string }[]>();
      if (!cancelled) setTaken(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const fieldError = (name: string) =>
    !state.ok && state.field === name ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="end_time" value={endTime} />

      <Card className="space-y-5 p-5">
        <Field label="Apartment" htmlFor="apartment_id" required error={fieldError("apartment_id")}>
          <Select id="apartment_id" name="apartment_id" required defaultValue="">
            <option value="" disabled>
              Choose an apartment
            </option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Guest name" htmlFor="guest_name" required error={fieldError("guest_name")}>
          <Input
            id="guest_name"
            name="guest_name"
            required
            maxLength={120}
            autoComplete="off"
            placeholder="e.g. Sarah Bennett"
          />
        </Field>

        <Field
          label="Guest contact"
          htmlFor="guest_contact"
          hint="Optional — the number they messaged from."
        >
          <Input
            id="guest_contact"
            name="guest_contact"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+44…"
          />
        </Field>
      </Card>

      <Card className="space-y-5 p-5">
        <Field label="Date" htmlFor="date" required error={fieldError("date")}>
          <Input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Start time" htmlFor="start_time" required error={fieldError("start_time")}>
          <Select
            id="start_time"
            name="start_time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          >
            {options.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-text">Duration</legend>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map(({ label, minutes }) => {
              const active = duration === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDuration(minutes)}
                  className={cx(
                    "tap rounded-xl border px-2 text-sm font-medium transition-colors",
                    active
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-subtle">
            Slot: <span className="font-medium text-text-muted">{startTime} – {endTime}</span>
            {" · "}
            <span className="font-medium text-text-muted">{durationLabel}</span>
            {" · "}spa needs switching on around{" "}
            <span className="font-medium text-text-muted">
              {addMinutesToTime(startTime, -60)}
            </span>
          </p>
          {fieldError("end_time") && (
            <p className="mt-1 text-xs font-medium text-danger">{fieldError("end_time")}</p>
          )}
        </fieldset>

        {taken.length > 0 && (
          <div className="rounded-xl bg-surface-muted px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
              Already booked this day
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {taken.map((slot) => (
                <li key={slot.starts_at} className="font-mono text-sm text-text-muted">
                  {formatTimeRange(slot.starts_at, slot.ends_at)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="space-y-5 p-5">
        <Field
          label="Agreed price"
          htmlFor="price"
          hint={`Optional \u2014 what the guest agreed to pay for the ${durationLabel} slot. Leave blank if it's not settled yet; you can add it later.`}
          error={fieldError("price")}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            >
              £
            </span>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="45"
              className="pl-7 tabular-nums"
            />
          </div>
        </Field>

        <Field
          label="Notes"
          htmlFor="notes"
          hint="Optional — anything the person switching the spa on should know."
          error={fieldError("notes")}
        >
          <Textarea id="notes" name="notes" maxLength={1000} rows={3} />
        </Field>

        <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3.5">
          <input
            type="checkbox"
            name="confirm_now"
            defaultChecked
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-text">
              Already confirmed with the guest
            </span>
            <span className="mt-0.5 block text-xs text-text-muted">
              Leave this off to save it as a request the team still needs to confirm. Only
              confirmed slots trigger the switch-on reminder.
            </span>
          </span>
        </label>
      </Card>

      {!state.ok && !state.field && <Alert>{state.error}</Alert>}

      <SubmitBar />
    </form>
  );
}
