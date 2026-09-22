"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import { inviteStaff } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={18} height={18} />
          Sending invite…
        </>
      ) : (
        "Send invite"
      )}
    </Button>
  );
}

export function InviteForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(inviteStaff, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  return (
    <Card className="p-5">
      <form ref={formRef} action={formAction} className="space-y-4" noValidate>
        <Field
          label="Email"
          htmlFor="invite_email"
          required
          hint="They'll get an email with a sign-in link. Only invited addresses can sign in."
          error={!state.ok && state.field === "email" ? state.error : undefined}
        >
          <Input
            id="invite_email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="colleague@example.com"
          />
        </Field>

        <Field label="Name" htmlFor="invite_name" hint="Optional — shown on the rota.">
          <Input id="invite_name" name="full_name" maxLength={80} autoComplete="off" />
        </Field>

        <Field label="Role" htmlFor="invite_role">
          <Select id="invite_role" name="role" defaultValue="staff">
            <option value="staff">Staff — bookings and duty</option>
            <option value="admin">Admin — also lockbox and team</option>
          </Select>
        </Field>

        {!state.ok && !state.field && <Alert>{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="accent">{state.message}</Alert>}

        <Submit />
      </form>
    </Card>
  );
}
