"use client";

import { useActionState, useState } from "react";
import { saveTransaction, type FormState } from "@/app/actions";
import { normalizeDigits } from "@/lib/digits";
import { FieldError, FormAlert } from "./Field";
import { SubmitButton } from "./SubmitButton";

type ProductOption = { id: number; name: string; balance: number };

export type TransactionDefaults = {
  id?: number;
  kind: "take" | "return";
  productId: number;
  quantity: number;
  note: string;
  occurredAt: string;
};

export function TransactionForm({
  customerId,
  products,
  defaults,
}: {
  customerId: number;
  products: ProductOption[];
  defaults: TransactionDefaults;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveTransaction, undefined);
  const [kind, setKind] = useState(defaults.kind);
  const [productId, setProductId] = useState(defaults.productId);
  const [qty, setQty] = useState(String(defaults.quantity));
  const e = state?.errors ?? {};
  const isEdit = defaults.id !== undefined;

  const n = Number(normalizeDigits(qty)) || 0;
  const selected = products.find((p) => p.id === productId);
  // Instant hint for new returns; the server re-checks every case (including edits) inside a DB transaction.
  const overReturn = !isEdit && kind === "return" && selected !== undefined && n > selected.balance;

  const step = (d: number) => setQty(String(Math.min(1000, Math.max(1, n + d))));

  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="customerId" value={customerId} />
      {isEdit && <input type="hidden" name="id" value={defaults.id} />}
      <FormAlert error={e.form} />

      <fieldset className="segmented">
        <legend className="sr-only">نوع العملية</legend>
        <label className="choice take">
          <input type="radio" name="kind" value="take" checked={kind === "take"} onChange={() => setKind("take")} />
          <span>أخذ</span>
        </label>
        <label className="choice return">
          <input
            type="radio"
            name="kind"
            value="return"
            checked={kind === "return"}
            onChange={() => setKind("return")}
          />
          <span>أرجع</span>
        </label>
      </fieldset>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>
          الصنف
        </legend>
        <div className="choices">
          {products.map((p) => (
            <label key={p.id} className="choice">
              <input
                type="radio"
                name="productId"
                value={p.id}
                checked={productId === p.id}
                onChange={() => setProductId(p.id)}
              />
              <span>
                {p.name}
                {p.balance !== 0 && (
                  <small>
                    (عليه <span className="num">{p.balance}</span>)
                  </small>
                )}
              </span>
            </label>
          ))}
        </div>
        <FieldError id="product-error" message={e.productId} />
      </fieldset>

      <div className="field">
        <label htmlFor="quantity" className="label">
          عدد الصواني
        </label>
        <div className="stepper" dir="ltr">
          <button type="button" onClick={() => step(-1)} aria-label="إنقاص واحد">
            −
          </button>
          <input
            id="quantity"
            name="quantity"
            className="input num"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qty}
            onChange={(ev) => setQty(ev.target.value)}
            onFocus={(ev) => ev.target.select()}
            aria-invalid={!!e.quantity || overReturn}
            aria-describedby="quantity-help"
          />
          <button type="button" onClick={() => step(1)} aria-label="زيادة واحد">
            +
          </button>
        </div>
        <div className="quick" aria-label="اختيار سريع">
          {[1, 2, 3, 4, 5, 10].map((v) => (
            <button key={v} type="button" className="num" onClick={() => setQty(String(v))} aria-pressed={n === v}>
              {v}
            </button>
          ))}
        </div>
        <div id="quantity-help">
          <FieldError id="quantity-error" message={e.quantity} />
          {overReturn && (
            <p className="error" role="alert">
              عليه {selected!.balance} فقط من {selected!.name} — لا يمكن إرجاع {n}.
            </p>
          )}
        </div>
      </div>

      <details className="more" open={isEdit || !!e.occurredAt || !!e.note}>
        <summary>التاريخ والملاحظة</summary>
        <div className="stack" style={{ marginTop: 8 }}>
          <div className="field">
            <label htmlFor="occurredAt" className="label">
              التاريخ والوقت
            </label>
            <input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              className="input"
              defaultValue={defaults.occurredAt}
              required
              aria-invalid={!!e.occurredAt}
            />
            <FieldError id="date-error" message={e.occurredAt} />
          </div>
          <div className="field">
            <label htmlFor="note" className="label">
              ملاحظة <span className="hint">(اختياري)</span>
            </label>
            <textarea id="note" name="note" className="input" maxLength={200} defaultValue={defaults.note} />
            <FieldError id="note-error" message={e.note} />
          </div>
        </div>
      </details>

      <SubmitButton className={`btn btn-block btn-lg ${kind === "take" ? "btn-take" : "btn-return"}`}>
        {isEdit ? "حفظ التعديل" : kind === "take" ? `تسجيل أخذ ${n || ""}` : `تسجيل إرجاع ${n || ""}`}
      </SubmitButton>
    </form>
  );
}
