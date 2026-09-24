"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { removeProduct, saveProduct, type FormState } from "@/app/actions";
import { FieldError, FormAlert } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export function AddProductForm() {
  const [state, action] = useActionState<FormState, FormData>(saveProduct, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const err = state?.errors?.name;
  return (
    <form ref={formRef} action={action} className="card stack" noValidate>
      <div className="field">
        <label htmlFor="new-product" className="label">
          صنف جديد
        </label>
        <input
          id="new-product"
          name="name"
          className="input"
          placeholder="مثلاً: بسبوسة"
          maxLength={60}
          required
          autoComplete="off"
          aria-invalid={!!err}
          aria-describedby={err ? "new-product-error" : undefined}
        />
        <FieldError id="new-product-error" message={err} />
      </div>
      <FormAlert ok={state?.ok} />
      <SubmitButton className="btn btn-block" pendingText="جارٍ الإضافة…">
        إضافة الصنف
      </SubmitButton>
    </form>
  );
}

export function ProductRow({ product }: { product: { id: number; name: string; usage: number } }) {
  const [editing, setEditing] = useState(false);
  const [saveState, save] = useActionState<FormState, FormData>(saveProduct, undefined);
  const [delState, del] = useActionState<FormState, FormData>(removeProduct, undefined);

  useEffect(() => {
    if (saveState?.ok) setEditing(false);
  }, [saveState]);

  if (editing) {
    const err = saveState?.errors?.name;
    return (
      <form action={save} className="stack" style={{ padding: 12 }} noValidate>
        <input type="hidden" name="id" value={product.id} />
        <label htmlFor={`p-${product.id}`} className="sr-only">
          اسم الصنف
        </label>
        <input
          id={`p-${product.id}`}
          name="name"
          className="input"
          defaultValue={product.name}
          maxLength={60}
          autoFocus
          aria-invalid={!!err}
        />
        <FieldError id={`p-${product.id}-error`} message={err} />
        <div className="row">
          <SubmitButton className="btn btn-sm">حفظ</SubmitButton>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            إلغاء
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="list-item" style={{ flexWrap: "wrap" }}>
      <div className="list-main">
        <div className="list-title">{product.name}</div>
        <div className="list-sub">
          {product.usage > 0 ? (
            <>
              <span className="num">{product.usage}</span> عملية مسجّلة
            </>
          ) : (
            "لم يُستخدم بعد"
          )}
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        تعديل
      </button>
      {product.usage === 0 && (
        <form
          action={del}
          onSubmit={(ev) => {
            if (!window.confirm(`حذف الصنف «${product.name}»؟`)) ev.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton className="btn btn-danger btn-sm" pendingText="…">
            حذف
          </SubmitButton>
        </form>
      )}
      {delState?.errors?.form && (
        <div style={{ width: "100%" }}>
          <FormAlert error={delState.errors.form} />
        </div>
      )}
    </div>
  );
}
