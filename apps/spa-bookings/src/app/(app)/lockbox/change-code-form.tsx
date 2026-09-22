"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import { setLockboxCode } from "@/app/actions/lockbox";
import type { ActionResult } from "@/app/actions/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={18} height={18} />
          Saving…
        </>
      ) : (
        "Save new code"
      )}
    </Button>
  );
}

export function ChangeCodeForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(setLockboxCode, {
    ok: true,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  return (
    <Card className="p-5">
      <form ref={formRef} action={formAction} className="space-y-4" noValidate>
        <Field
          label="New code"
          htmlFor="code"
          required
          hint="The team is notified that it changed — the code itself is never put in the notification."
          error={!state.ok && state.field === "code" ? state.error : undefined}
        >
          <Input
            id="code"
            name="code"
            required
            minLength={3}
            maxLength={32}
            inputMode="numeric"
            autoComplete="off"
            className="font-mono tracking-[0.2em]"
            placeholder="0000"
          />
        </Field>

        <Field
          label="Why it changed"
          htmlFor="note"
          hint="Optional — e.g. 'routine rotation' or 'contractor had the old code'."
          error={!state.ok && state.field === "note" ? state.error : undefined}
        >
          <Input id="note" name="note" maxLength={500} autoComplete="off" />
        </Field>

        {!state.ok && !state.field && <Alert>{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="accent">{state.message}</Alert>}

        <Submit />
      </form>
    </Card>
  );
}
