"use client";

import { useActionState, useEffect, useRef } from "react";
import type { StaffMember } from "@/lib/types";
import { Alert, Button, Card, Input, cx } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PlusIcon } from "@/components/icons";
import { addStaff, toggleStaff } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/types";

export function StaffList({ staff }: { staff: StaffMember[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(addStaff, {
    ok: true,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {staff.length > 0 && (
        <Card className="divide-y divide-border">
          {staff.map((person) => (
            <div
              key={person.id}
              className={cx(
                "flex items-center justify-between gap-3 px-4 py-2.5",
                !person.is_active && "opacity-60",
              )}
            >
              <p className="min-w-0 truncate text-sm font-medium text-text">{person.name}</p>
              <ActionForm
                action={toggleStaff}
                fields={{ staff_id: person.id, is_active: String(person.is_active) }}
                label={person.is_active ? "Remove" : "Add back"}
                confirmLabel={person.is_active ? "Tap again to remove" : undefined}
                pendingLabel="…"
                size="sm"
                variant="ghost"
              />
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4">
        <form ref={formRef} action={formAction} className="space-y-2" noValidate>
          <label htmlFor="staff_name" className="block text-sm font-medium text-text">
            Add someone
          </label>
          <div className="flex gap-2">
            <Input id="staff_name" name="name" maxLength={60} placeholder="Their name" autoComplete="off" />
            <Button type="submit" variant="secondary" disabled={pending}>
              <PlusIcon width={18} height={18} />
              Add
            </Button>
          </div>
          {!state.ok && <Alert>{state.error}</Alert>}
        </form>
      </Card>
    </div>
  );
}
