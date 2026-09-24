"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { removeProduct, saveProduct, type FormState } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { FieldError, FormAlert } from "@/components/Field";
import { EditIcon } from "@/components/icons";
import { SubmitButton } from "@/components/SubmitButton";
import { CURRENCIES, centsToInput, formatMoney } from "@/lib/money";

function PriceInput({
  id,
  currency,
  defaultValue,
  invalid,
}: {
  id: string;
  currency: string;
  defaultValue?: string;
  invalid?: boolean;
}) {
  const cur = CURRENCIES.find((c) => c.code === currency);
  const symbol = cur?.symbol ?? currency;
  return (
    <div className={`input-affix${cur?.prefix ? " has-prefix" : ""}`} dir="ltr">
      <input
        id={id}
        name="price"
        className="input num"
        inputMode="decimal"
        placeholder="0.00"
        defaultValue={defaultValue}
        aria-invalid={invalid}
        style={{ textAlign: "left" }}
      />
      <span className={`affix${cur?.prefix ? " prefix" : ""}`}>{symbol}</span>
    </div>
  );
}

export function AddProductForm({ currency }: { currency: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const e = state?.errors ?? {};
  return (
    <ActionForm ref={formRef} action={action} pending={pending} className="card card-pad stack" noValidate>
      <div className="form-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="field">
          <label htmlFor="new-product" className="label">
            اسم الصنف
          </label>
          <input
            id="new-product"
            name="name"
            className="input"
            placeholder="مثلاً: بسبوسة"
            maxLength={60}
            autoComplete="off"
            aria-invalid={!!e.name}
          />
        </div>
        <div className="field">
          <label htmlFor="new-price" className="label">
            سعر الصينية
          </label>
          <PriceInput id="new-price" currency={currency} invalid={!!e.priceCents} />
        </div>
      </div>
      <FieldError id="new-product-error" message={e.name ?? e.priceCents} />
      <FormAlert ok={state?.ok} />
      <SubmitButton className="btn btn-block" pendingText="جارٍ الإضافة…">
        إضافة الصنف
      </SubmitButton>
    </ActionForm>
  );
}

export function ProductRow({
  product,
  currency,
}: {
  product: { id: number; name: string; priceCents: number; usage: number };
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saveState, save, saving] = useActionState<FormState, FormData>(saveProduct, undefined);
  const [delState, del, deleting] = useActionState<FormState, FormData>(removeProduct, undefined);

  useEffect(() => {
    if (saveState?.ok) setEditing(false);
  }, [saveState]);

  if (editing) {
    const e = saveState?.errors ?? {};
    return (
      <ActionForm action={save} pending={saving} className="stack" style={{ padding: 14 }} noValidate>
        <input type="hidden" name="id" value={product.id} />
        <div className="form-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <div className="field">
            <label htmlFor={`p-${product.id}`} className="label">
              الاسم
            </label>
            <input
              id={`p-${product.id}`}
              name="name"
              className="input"
              defaultValue={product.name}
              maxLength={60}
              autoFocus
              aria-invalid={!!e.name}
            />
          </div>
          <div className="field">
            <label htmlFor={`pp-${product.id}`} className="label">
              سعر الصينية
            </label>
            <PriceInput
              id={`pp-${product.id}`}
              currency={currency}
              defaultValue={centsToInput(product.priceCents)}
              invalid={!!e.priceCents}
            />
          </div>
        </div>
        <FieldError id={`p-${product.id}-error`} message={e.name ?? e.priceCents} />
        <div className="row">
          <SubmitButton className="btn btn-sm">حفظ</SubmitButton>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            إلغاء
          </button>
        </div>
      </ActionForm>
    );
  }

  return (
    <div>
      <div className="item">
        <div className="item-main">
          <div className="item-title">{product.name}</div>
          <div className="item-sub">
            {product.usage > 0 ? (
              <>
                <span className="num">{product.usage}</span> عملية مسجّلة
              </>
            ) : (
              "لم يُستخدم بعد"
            )}
          </div>
        </div>
        <span className="item-amount num">
          {product.priceCents > 0 ? formatMoney(product.priceCents, currency) : <span className="tag">بدون سعر</span>}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setEditing(true)}
          aria-label={`تعديل ${product.name}`}
        >
          <EditIcon size={18} />
        </button>
        {product.usage === 0 && (
          <ActionForm action={del} pending={deleting} confirm={`حذف الصنف «${product.name}»؟`}>
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton className="btn btn-ghost btn-sm" pendingText="…">
              <span style={{ color: "var(--danger)" }}>حذف</span>
            </SubmitButton>
          </ActionForm>
        )}
      </div>
      {delState?.errors?.form && (
        <div style={{ padding: "0 14px 12px" }}>
          <FormAlert error={delState.errors.form} />
        </div>
      )}
    </div>
  );
}
