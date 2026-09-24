"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { FormAlert } from "./Field";
import { SubmitButton } from "./SubmitButton";

/** A delete button that asks for confirmation and shows server-side errors (e.g. would go negative). */
export function ConfirmForm({
  action,
  fields,
  confirmText,
  label,
  pendingText = "جارٍ الحذف…",
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  fields: Record<string, string | number>;
  confirmText: string;
  label: string;
  pendingText?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(ev) => {
        if (!window.confirm(confirmText)) ev.preventDefault();
      }}
      className="stack"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <FormAlert error={state?.errors?.form} ok={state?.ok} />
      <SubmitButton className="btn btn-danger btn-block" pendingText={pendingText}>
        {label}
      </SubmitButton>
    </form>
  );
}
