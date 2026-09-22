"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Apartment } from "@/lib/types";
import { Alert, Button, Card, Field, Input, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PlusIcon, SpinnerIcon } from "@/components/icons";
import { addApartment, toggleApartment } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
      {pending ? <SpinnerIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
      Add
    </Button>
  );
}

export function ApartmentManager({ apartments }: { apartments: Apartment[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(addApartment, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {apartments.length > 0 && (
        <Card className="divide-y divide-border">
          {apartments.map((apartment) => (
            <div
              key={apartment.id}
              className={cx(
                "flex items-center justify-between gap-3 px-4 py-3",
                !apartment.is_active && "opacity-60",
              )}
            >
              <p className="min-w-0 truncate text-sm font-medium text-text">
                {apartment.name}
                {!apartment.is_active && (
                  <span className="ml-2 text-xs font-normal text-text-subtle">hidden</span>
                )}
              </p>
              <ActionForm
                action={toggleApartment}
                fields={{
                  apartment_id: apartment.id,
                  is_active: String(apartment.is_active),
                }}
                label={apartment.is_active ? "Hide" : "Restore"}
                pendingLabel="…"
                size="sm"
                variant="ghost"
              />
            </div>
          ))}
        </Card>
      )}

      <Card className="p-5">
        <form ref={formRef} action={formAction} className="space-y-3" noValidate>
          <Field
            label="Add an apartment"
            htmlFor="apartment_name"
            hint="Hiding an apartment keeps its past bookings but removes it from the booking form."
            error={!state.ok && state.field === "name" ? state.error : undefined}
          >
            <div className="flex gap-2">
              <Input
                id="apartment_name"
                name="name"
                required
                maxLength={60}
                placeholder="e.g. Flat 3"
                autoComplete="off"
              />
              <Submit />
            </div>
          </Field>
          {!state.ok && !state.field && <Alert>{state.error}</Alert>}
        </form>
      </Card>
    </div>
  );
}
