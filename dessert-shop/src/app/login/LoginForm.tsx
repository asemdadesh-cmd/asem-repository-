"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";
import { FieldError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  const error = state?.errors?.password;
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="password" className="label">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? "password-error" : undefined}
        />
        <FieldError id="password-error" message={error} />
      </div>
      <SubmitButton pendingText="جارٍ الدخول…">دخول</SubmitButton>
    </form>
  );
}
