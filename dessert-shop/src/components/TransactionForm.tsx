"use client";

import { useActionState, useState } from "react";
import { saveTransaction, type FormState } from "@/app/actions";
import { normalizeDigits } from "@/lib/digits";
import { CURRENCIES, centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { FieldError, FormAlert } from "./Field";
import { MinusIcon, PlusIcon } from "./icons";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "./SubmitButton";

export type ProductOption = { id: number; name: string; priceCents: number; balance: number };

export type TransactionDefaults = {
  id?: number;
  kind: "take" | "return";
  productId: number;
  quantity: number;
  unitPriceCents?: number;
  note: string;
  occurredAt: string;
};

export function TransactionForm({
  customerId,
  products,
  defaults,
  currency,
}: {
  customerId: number;
  products: ProductOption[];
  defaults: TransactionDefaults;
  currency: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTransaction, undefined);
  const isEdit = defaults.id !== undefined;
  const [kind, setKind] = useState(defaults.kind);
  const [productId, setProductId] = useState(defaults.productId);
  const [qty, setQty] = useState(String(defaults.quantity));
  const initialPrice =
    defaults.unitPriceCents ?? products.find((p) => p.id === defaults.productId)?.priceCents ?? 0;
  const [price, setPrice] = useState(centsToInput(initialPrice));
  // Once the owner types a custom price, stop overwriting it when switching products.
  const [priceTouched, setPriceTouched] = useState(isEdit);
  const e = state?.errors ?? {};

  const n = Number(normalizeDigits(qty)) || 0;
  const priceCents = parseMoney(normalizeDigits(price).replace(/٫/g, ".")) ?? 0;
  const selected = products.find((p) => p.id === productId);
  const overReturn = !isEdit && kind === "return" && selected !== undefined && n > selected.balance;
  const cur = CURRENCIES.find((c) => c.code === currency);

  const step = (d: number) => setQty(String(Math.min(1000, Math.max(1, n + d))));
  const pickProduct = (p: ProductOption) => {
    setProductId(p.id);
    if (!priceTouched) setPrice(centsToInput(p.priceCents));
  };

  return (
    <ActionForm action={action} pending={pending} className="stack" noValidate>
      <input type="hidden" name="customerId" value={customerId} />
      {isEdit && <input type="hidden" name="id" value={defaults.id} />}
      <FormAlert error={e.form} />

      <fieldset className="segmented lg">
        <legend className="sr-only">نوع العملية</legend>
        <label className="seg take">
          <input type="radio" name="kind" value="take" checked={kind === "take"} onChange={() => setKind("take")} />
          <span>أخذ صواني</span>
        </label>
        <label className="seg return">
          <input
            type="radio"
            name="kind"
            value="return"
            checked={kind === "return"}
            onChange={() => setKind("return")}
          />
          <span>أرجع صواني</span>
        </label>
      </fieldset>

      <div className="field">
        <span className="label" id="product-label">
          الصنف
        </span>
        <div className="options" role="radiogroup" aria-labelledby="product-label">
          {products.map((p) => (
            <label key={p.id} className="option">
              <input
                type="radio"
                name="productId"
                value={p.id}
                checked={productId === p.id}
                onChange={() => pickProduct(p)}
              />
              <span className="item-main">
                <span className="strong" style={{ display: "block" }}>
                  {p.name}
                </span>
                <span className="small muted">
                  {p.priceCents > 0 ? (
                    <>
                      <span className="num">{formatMoney(p.priceCents, currency)}</span> للصينية
                    </>
                  ) : (
                    "بدون سعر"
                  )}
                </span>
              </span>
              {p.balance > 0 && (
                <span className="tag">
                  عنده <span className="num">{p.balance}</span>
                </span>
              )}
            </label>
          ))}
        </div>
        <FieldError id="product-error" message={e.productId} />
      </div>

      <div className="field">
        <label htmlFor="quantity" className="label">
          عدد الصواني
        </label>
        <div className="stepper" dir="ltr">
          <button type="button" onClick={() => step(-1)} aria-label="إنقاص واحد">
            <MinusIcon size={22} />
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
            <PlusIcon size={22} />
          </button>
        </div>
        <div className="quick" role="group" aria-label="اختيار سريع">
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
              عنده {selected!.balance} فقط من {selected!.name} — لا يمكن إرجاع {n}.
            </p>
          )}
        </div>
      </div>

      {kind === "take" && (
        <div className="field">
          <label htmlFor="unitPrice" className="label">
            سعر الصينية <span className="hint">— يُحفظ مع العملية</span>
          </label>
          <div className={`input-affix${cur?.prefix ? " has-prefix" : ""}`} dir="ltr">
            <input
              id="unitPrice"
              name="unitPrice"
              className="input num"
              inputMode="decimal"
              value={price}
              onChange={(ev) => {
                setPrice(ev.target.value);
                setPriceTouched(true);
              }}
              onFocus={(ev) => ev.target.select()}
              placeholder="0"
              aria-invalid={!!e.unitPriceCents}
              style={{ textAlign: "left" }}
            />
            <span className={`affix${cur?.prefix ? " prefix" : ""}`}>{cur?.symbol ?? currency}</span>
          </div>
          <FieldError id="price-error" message={e.unitPriceCents} />
          {priceCents > 0 && n > 0 && (
            <div className="total-line">
              <span className="muted">
                <span className="num">{n}</span> × <span className="num">{formatMoney(priceCents, currency)}</span>
              </span>
              <b className="num">{formatMoney(n * priceCents, currency)}</b>
            </div>
          )}
        </div>
      )}
      {kind === "return" && <input type="hidden" name="unitPrice" value="" />}

      <details className="more" open={isEdit || !!e.occurredAt || !!e.note}>
        <summary>التاريخ والملاحظة</summary>
        <div className="stack">
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
              ملاحظة <span className="hint">— اختياري</span>
            </label>
            <textarea id="note" name="note" className="input" maxLength={200} defaultValue={defaults.note} />
            <FieldError id="note-error" message={e.note} />
          </div>
        </div>
      </details>

      <div className="actionbar">
        <div className="actionbar-inner single">
          <SubmitButton className={`btn btn-block btn-lg${kind === "return" ? " btn-return" : ""}`}>
            {isEdit
              ? "حفظ التعديل"
              : kind === "take"
                ? `تسجيل أخذ ${n ? trayWord(n) : ""}`
                : `تسجيل إرجاع ${n ? trayWord(n) : ""}`}
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}

function trayWord(n: number) {
  if (n === 1) return "صينية";
  if (n === 2) return "صينيتين";
  if (n <= 10) return `${n} صواني`;
  return `${n} صينية`;
}
