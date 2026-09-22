"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Profile } from "@/lib/types";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import { updateOwnProfile } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block variant="secondary" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={18} height={18} />
          Saving…
        </>
      ) : (
        "Save"
      )}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateOwnProfile, {
    ok: true,
  });

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4" noValidate>
        <Field
          label="Name"
          htmlFor="full_name"
          required
          hint="Shown on the duty rota and in team notifications."
          error={!state.ok && state.field === "full_name" ? state.error : undefined}
        >
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name}
            maxLength={80}
            required
            autoComplete="name"
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          hint="Optional — so colleagues can reach you."
          error={!state.ok && state.field === "phone" ? state.error : undefined}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={profile.phone ?? ""}
            maxLength={40}
            autoComplete="tel"
          />
        </Field>

        {!state.ok && !state.field && <Alert>{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="accent">{state.message}</Alert>}

        <Submit />
      </form>
    </Card>
  );
}
