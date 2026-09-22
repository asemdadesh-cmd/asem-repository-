"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui";
import { SpinnerIcon } from "@/components/icons";
import type { ActionResult } from "@/app/actions/types";

type ServerAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <SpinnerIcon width={16} height={16} />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export interface ActionFormProps extends Omit<ButtonProps, "children"> {
  action: ServerAction;
  fields?: Record<string, string>;
  label: ReactNode;
  pendingLabel?: string;
  /** Requires a second tap, shown inline. Use for destructive actions. */
  confirmLabel?: string;
  onResult?: (result: ActionResult) => void;
  className?: string;
}

/**
 * One-tap server action with inline pending state, optional confirm step and an
 * accessible error message. Errors render next to the control that caused them
 * rather than in a toast that can be missed on a phone.
 */
export function ActionForm({
  action,
  fields = {},
  label,
  pendingLabel,
  confirmLabel,
  onResult,
  className,
  ...buttonProps
}: ActionFormProps) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: true });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (onResult) onResult(state);
  }, [state, onResult]);

  // Collapse the confirm step again after a short pause.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  if (confirmLabel && !armed) {
    return (
      <Button {...buttonProps} className={className} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={formAction} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton {...buttonProps} className={className} pendingLabel={pendingLabel}>
        {confirmLabel ?? label}
      </SubmitButton>
      {!state.ok && (
        <p role="alert" className="mt-1 w-full text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
