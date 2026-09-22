"use client";

import { useActionState, useState } from "react";
import type { BookingWithRelations } from "@/lib/types";
import { Alert, Button, Card, Field, Input, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { CheckIcon, FlameIcon, XIcon } from "@/components/icons";
import {
  cancelBooking,
  confirmBooking,
  markSpaReady,
  undoSpaReady,
} from "@/app/actions/bookings";
import type { ActionResult } from "@/app/actions/types";

export function BookingActions({ booking }: { booking: BookingWithRelations }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelState, cancelAction] = useActionState<ActionResult, FormData>(
    cancelBooking,
    { ok: true },
  );

  const cancelled = booking.status === "cancelled";

  return (
    <Card className="space-y-3 p-4">
      {cancelled ? (
        <>
          <p className="text-sm text-text-muted">
            This booking is cancelled. Reinstating it will re-check the slot is still free.
          </p>
          <ActionForm
            action={confirmBooking}
            fields={{ booking_id: booking.id }}
            label={
              <>
                <CheckIcon width={18} height={18} />
                Reinstate and confirm
              </>
            }
            pendingLabel="Reinstating…"
            block
          />
        </>
      ) : (
        <>
          {booking.status === "pending" && (
            <ActionForm
              action={confirmBooking}
              fields={{ booking_id: booking.id }}
              label={
                <>
                  <CheckIcon width={18} height={18} />
                  Confirm with the guest
                </>
              }
              pendingLabel="Confirming…"
              size="lg"
              block
            />
          )}

          {booking.spa_ready_at ? (
            <ActionForm
              action={undoSpaReady}
              fields={{ booking_id: booking.id }}
              label="Spa isn't on after all"
              confirmLabel="Tap again to undo"
              pendingLabel="Updating…"
              variant="secondary"
              block
            />
          ) : (
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
              size="lg"
              variant={booking.status === "pending" ? "secondary" : "primary"}
              block
            />
          )}

          {!cancelOpen ? (
            <Button variant="ghost" block onClick={() => setCancelOpen(true)}>
              <XIcon width={18} height={18} />
              Cancel this booking
            </Button>
          ) : (
            <form action={cancelAction} className={cx("space-y-3 rounded-xl bg-surface-muted p-3.5")}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <Field
                label="Reason"
                htmlFor="cancel_reason"
                hint="Optional — shown to the team in the cancellation notice."
              >
                <Input
                  id="cancel_reason"
                  name="cancel_reason"
                  maxLength={300}
                  placeholder="e.g. guest changed their mind"
                />
              </Field>
              {!cancelState.ok && <Alert>{cancelState.error}</Alert>}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" className="flex-1">
                  Cancel booking
                </Button>
                <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                  Keep it
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}
