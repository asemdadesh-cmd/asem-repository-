"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "@/app/actions";
import { FieldError, FormAlert } from "@/components/Field";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { WEEKDAYS } from "@/lib/format";
import type { Settings } from "@/lib/ledger";
import { CURRENCIES } from "@/lib/money";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, undefined);
  const e = state?.errors ?? {};
  return (
    <ActionForm action={action} pending={pending} className="stack" noValidate>
      <div className="card">
        <div className="settings-group">
          <h2>المحل</h2>
          <p className="desc">يظهر الاسم في رسائل التذكير التي تُرسل للزبائن.</p>
          <div className="stack">
            <div className="field">
              <label htmlFor="shopName" className="label">
                اسم المحل
              </label>
              <input
                id="shopName"
                name="shopName"
                className="input"
                defaultValue={settings.shopName}
                maxLength={60}
                aria-invalid={!!e.shopName}
              />
              <FieldError id="shopName-error" message={e.shopName} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="currency" className="label">
                  العملة
                </label>
                <select id="currency" name="currency" className="select" defaultValue={settings.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="countryCode" className="label">
                  رمز الدولة للهاتف
                </label>
                <div className="input-affix has-prefix" dir="ltr">
                  <input
                    id="countryCode"
                    name="countryCode"
                    className="input num"
                    inputMode="numeric"
                    defaultValue={settings.countryCode}
                    maxLength={5}
                    aria-invalid={!!e.countryCode}
                    style={{ textAlign: "left" }}
                  />
                  <span className="affix prefix">
                    +
                  </span>
                </div>
                <FieldError id="cc-error" message={e.countryCode} />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h2>التذكيرات</h2>
          <p className="desc">متى يُعتبر الزبون متأخراً، ومتى يصلك الملخص الأسبوعي.</p>
          <div className="stack">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="overdueDays" className="label">
                  متأخر بعد (أيام)
                </label>
                <input
                  id="overdueDays"
                  name="overdueDays"
                  className="input num"
                  inputMode="numeric"
                  defaultValue={settings.overdueDays}
                  aria-invalid={!!e.overdueDays}
                />
                <FieldError id="od-error" message={e.overdueDays} />
              </div>
              <div className="field">
                <label htmlFor="reminderWeekday" className="label">
                  يوم الملخص الأسبوعي
                </label>
                <select
                  id="reminderWeekday"
                  name="reminderWeekday"
                  className="select"
                  defaultValue={settings.reminderWeekday}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="switch">
              <input type="checkbox" name="remindersEnabled" defaultChecked={settings.remindersEnabled} />
              <span>إرسال الملخص الأسبوعي</span>
            </label>
          </div>
        </div>
      </div>

      <FormAlert error={e.form} ok={state?.ok} />
      <SubmitButton className="btn btn-block btn-lg">حفظ الإعدادات</SubmitButton>
    </ActionForm>
  );
}
