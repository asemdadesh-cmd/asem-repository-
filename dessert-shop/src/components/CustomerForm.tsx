"use client";

import { useActionState } from "react";
import { saveCustomer, type FormState } from "@/app/actions";
import { FieldError, FormAlert } from "./Field";
import { SubmitButton } from "./SubmitButton";

export function CustomerForm({ customer }: { customer?: { id?: number; name: string; phone: string } }) {
  const [state, action] = useActionState<FormState, FormData>(saveCustomer, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="card stack" noValidate>
      {customer?.id && <input type="hidden" name="id" value={customer.id} />}
      <FormAlert error={e.form} />
      <div className="field">
        <label htmlFor="name" className="label">
          اسم الزبون
        </label>
        <input
          id="name"
          name="name"
          className="input"
          defaultValue={customer?.name}
          required
          maxLength={80}
          autoComplete="off"
          autoFocus={!customer?.id}
          aria-invalid={!!e.name}
          aria-describedby={e.name ? "name-error" : undefined}
        />
        <FieldError id="name-error" message={e.name} />
      </div>
      <div className="field">
        <label htmlFor="phone" className="label">
          رقم الهاتف <span className="hint">(اختياري)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          className="input"
          style={{ textAlign: "right" }}
          defaultValue={customer?.phone}
          maxLength={24}
          autoComplete="off"
          aria-invalid={!!e.phone}
          aria-describedby={e.phone ? "phone-error" : undefined}
        />
        <FieldError id="phone-error" message={e.phone} />
      </div>
      <SubmitButton>{customer?.id ? "حفظ التعديلات" : "إضافة الزبون"}</SubmitButton>
    </form>
  );
}
