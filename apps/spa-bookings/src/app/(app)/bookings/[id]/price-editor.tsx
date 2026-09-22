"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { BookingWithRelations } from "@/lib/types";
import { formatDuration } from "@/lib/time";
import { formatPence, penceToInputValue } from "@/lib/money";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import { setBookingPrice } from "@/app/actions/bookings";
import type { ActionResult } from "@/app/actions/types";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={18} height={18} />
          Saving…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

/**
 * Prices often get agreed after the slot is already in the calendar, so this
 * stays editable for the life of the booking rather than being create-only.
 */
export function PriceEditor({ booking }: { booking: BookingWithRelations }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionResult, FormData>(setBookingPrice, {
    ok: true,
  });

  const current = formatPence(booking.price_pence);
  const duration = formatDuration(booking.starts_at, booking.ends_at);

  if (!open) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">
            {current ? `${current} for ${duration}` : "No price agreed yet"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {current
              ? "Tap to change what the guest agreed to pay."
              : "Add it once the guest confirms the price."}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {current ? "Change" : "Add price"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="booking_id" value={booking.id} />
        <Field
          label="Agreed price"
          htmlFor="booking_price"
          hint={`What the guest agreed to pay for the ${duration} slot. Clear the box to remove it.`}
          error={!state.ok && state.field === "price" ? state.error : undefined}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            >
              £
            </span>
            <Input
              id="booking_price"
              name="price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="45"
              defaultValue={penceToInputValue(booking.price_pence)}
              className="pl-7 tabular-nums"
            />
          </div>
        </Field>

        {!state.ok && !state.field && <Alert>{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="accent">{state.message}</Alert>}

        <div className="flex gap-2">
          <Submit label="Save price" />
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </form>
    </Card>
  );
}
