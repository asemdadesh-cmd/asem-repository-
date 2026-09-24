"use client";

import { useFormStatus } from "react-dom";
import { useActionPending } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText = "جارٍ الحفظ…",
  className = "btn btn-block btn-lg",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const pending = useActionPending() || formPending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
