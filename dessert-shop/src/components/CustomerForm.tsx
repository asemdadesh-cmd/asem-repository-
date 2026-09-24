"use client";

import { useActionState } from "react";
import { saveCustomer, type FormState } from "@/app/actions";
import { FieldError, FormAlert } from "./Field";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "./SubmitButton";

export function CustomerForm({
  customer,
  next,
}: {
  customer?: { id?: number; name: string; phone: string };
  next?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCustomer, undefined);
  const e = state?.errors ?? {};
  const isEdit = Boolean(customer?.id);
  return (
    <ActionForm action={action} pending={pending} className="stack" noValidate>
      {isEdit && <input type="hidden" name="id" value={customer!.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      <FormAlert error={e.form} />
      <div className="card card-pad stack">
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
            autoFocus={!isEdit}
            aria-invalid={!!e.name}
            aria-describedby={e.name ? "name-error" : undefined}
          />
          <FieldError id="name-error" message={e.name} />
        </div>
        <div className="field">
          <label htmlFor="phone" className="label">
            رقم الهاتف <span className="hint">— اختياري، لإرسال التذكير عبر واتساب</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="input"
            style={{ textAlign: "right" }}
            placeholder="07700 900123"
            defaultValue={customer?.phone}
            maxLength={24}
            autoComplete="off"
            aria-invalid={!!e.phone}
            aria-describedby={e.phone ? "phone-error" : undefined}
          />
          <FieldError id="phone-error" message={e.phone} />
        </div>
      </div>
      <SubmitButton className="btn btn-block btn-lg">
        {isEdit ? "حفظ التعديلات" : next ? "إضافة ومتابعة للتسجيل" : "إضافة الزبون"}
      </SubmitButton>
    </ActionForm>
  );
}
