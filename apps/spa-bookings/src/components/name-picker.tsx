"use client";

import { useActionState, useState } from "react";
import { Button, Card, cx } from "@/components/ui";
import { setMyName } from "@/app/actions/people";
import type { ActionResult } from "@/app/actions/types";

/**
 * "Which one are you?" — one tap, remembered on this phone. Used so the app
 * can say who did what. Never blocks the screen: it can be ignored.
 */
export function NamePicker({
  names,
  current,
  compact = false,
}: {
  names: string[];
  current: string | null;
  compact?: boolean;
}) {
  const [, formAction, pending] = useActionState<ActionResult, FormData>(setMyName, { ok: true });
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || names.length === 0) return null;

  return (
    <Card className={cx("p-4", compact ? "" : "border-accent/40")}>
      {!compact && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-text">Which one are you?</p>
            <p className="mt-0.5 text-sm text-text-muted">
              Tap your name once. The app will remember it on this phone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="tap -mr-2 -mt-2 rounded-lg px-2 text-sm text-text-subtle hover:text-text"
          >
            Later
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {names.map((name) => (
          <form key={name} action={formAction}>
            <input type="hidden" name="name" value={name} />
            <Button
              type="submit"
              size="md"
              variant={current === name ? "primary" : "secondary"}
              disabled={pending}
              aria-pressed={current === name}
            >
              {name}
            </Button>
          </form>
        ))}
      </div>
    </Card>
  );
}
