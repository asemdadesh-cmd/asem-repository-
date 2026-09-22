"use client";

import { useActionState } from "react";
import type { DutyShiftWithProfile, Profile } from "@/lib/types";
import { displayName } from "@/lib/auth-display";
import { Button, cx } from "@/components/ui";
import { setDuty } from "@/app/actions/duty";
import type { ActionResult } from "@/app/actions/types";

export function DutyRota({
  date,
  label,
  shift,
  staff,
  currentUserId,
  isAdmin,
}: {
  date: string;
  label: string;
  shift: DutyShiftWithProfile | null;
  staff: Profile[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(setDuty, { ok: true });
  const assignedName = shift?.profile ? displayName(shift.profile) : null;
  const isMe = shift?.user_id === currentUserId;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cx(
              "text-sm font-medium",
              label === "Today" ? "text-accent" : "text-text",
            )}
          >
            {label}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {assignedName ? (
              <>
                {assignedName}
                {isMe && <span className="font-semibold text-accent"> · you</span>}
              </>
            ) : (
              "Nobody on duty — everyone gets reminded"
            )}
          </p>
        </div>

        {isAdmin ? (
          <form action={formAction} className="shrink-0">
            <input type="hidden" name="duty_date" value={date} />
            <label className="sr-only" htmlFor={`duty-${date}`}>
              Who is on duty on {label}
            </label>
            <select
              id={`duty-${date}`}
              name="user_id"
              defaultValue={shift?.user_id ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="tap rounded-lg border border-border-input bg-bg-elevated px-2.5 text-sm text-text transition-colors hover:border-border-strong"
            >
              <option value="">Nobody</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {displayName(person)}
                </option>
              ))}
            </select>
          </form>
        ) : (
          !shift && (
            <form action={formAction} className="shrink-0">
              <input type="hidden" name="duty_date" value={date} />
              <input type="hidden" name="user_id" value={currentUserId} />
              <Button type="submit" size="sm" variant="secondary">
                I&rsquo;ll take it
              </Button>
            </form>
          )
        )}
      </div>

      {!state.ok && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
