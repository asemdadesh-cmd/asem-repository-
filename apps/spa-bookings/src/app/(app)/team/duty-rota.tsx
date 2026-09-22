"use client";

import { useActionState } from "react";
import { cx } from "@/components/ui";
import { setDuty } from "@/app/actions/duty";
import type { ActionResult } from "@/app/actions/types";

export function DutyRota({
  date,
  label,
  current,
  names,
  myName,
}: {
  date: string;
  label: string;
  current: string | null;
  names: string[];
  myName: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(setDuty, { ok: true });
  const isMe = !!current && current === myName;

  return (
    <div className="px-4 py-3">
      <form action={formAction} className="flex items-center justify-between gap-3">
        <input type="hidden" name="duty_date" value={date} />
        <div className="min-w-0">
          <p className={cx("text-sm font-medium", label === "Today" ? "text-accent" : "text-text")}>
            {label}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {current ? (
              <>
                {current}
                {isMe && <span className="font-semibold text-accent"> · you</span>}
              </>
            ) : (
              "Nobody — every phone gets reminded"
            )}
          </p>
        </div>
        <label className="sr-only" htmlFor={`duty-${date}`}>
          Who is on duty on {label}
        </label>
        <select
          id={`duty-${date}`}
          name="staff_name"
          defaultValue={current ?? ""}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="tap shrink-0 rounded-lg border border-border-input bg-bg-elevated px-2.5 text-sm text-text transition-colors hover:border-border-strong"
        >
          <option value="">Nobody</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </form>
      {!state.ok && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
