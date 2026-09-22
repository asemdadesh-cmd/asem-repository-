"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Card, Input } from "@/components/ui";
import { CheckIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { setLockboxCode } from "@/app/actions/lockbox";
import type { ActionResult } from "@/app/actions/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <SpinnerIcon width={20} height={20} />
          Saving…
        </>
      ) : (
        <>
          <CheckIcon width={20} height={20} />
          Save the new code
        </>
      )}
    </Button>
  );
}

/**
 * One job, one screenful: type the new code, save it, done.
 * The optional "why" note is admin-only — it is paperwork, not the task.
 */
export function ChangeCodeForm({ showNote = false }: { showNote?: boolean }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(setLockboxCode, {
    ok: true,
  });
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      formRef.current?.reset();
      setOpen(false);
      setSaved(true);
    }
  }, [state]);

  // Dismiss the confirmation on its own so the screen returns to normal.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 6000);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (saved) {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg">
          <CheckIcon width={28} height={28} />
        </div>
        <p className="mt-4 text-lg font-semibold text-text">Saved</p>
        <p className="mt-1.5 text-sm text-text-muted">
          Everyone can see the new code now. The team has been told it changed.
        </p>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button size="lg" block onClick={() => setOpen(true)}>
        <LockIcon width={20} height={20} />
        I&rsquo;ve changed the code
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form ref={formRef} action={formAction} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="code" className="block text-base font-semibold text-text">
            Type the new code
          </label>
          <Input
            ref={inputRef}
            id="code"
            name="code"
            required
            minLength={3}
            maxLength={32}
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="0000"
            aria-describedby={!state.ok ? "code-error" : undefined}
            aria-invalid={!state.ok}
            className="h-16 text-center font-mono text-3xl font-bold tracking-[0.2em]"
          />
        </div>

        {showNote && (
          <div className="space-y-1.5">
            <label htmlFor="note" className="block text-sm font-medium text-text-muted">
              Note <span className="font-normal text-text-subtle">(optional)</span>
            </label>
            <Input id="note" name="note" maxLength={500} autoComplete="off" />
          </div>
        )}

        {!state.ok && (
          <div id="code-error">
            <Alert>{state.error}</Alert>
          </div>
        )}

        <Submit />

        <Button variant="ghost" block onClick={() => setOpen(false)}>
          <XIcon width={18} height={18} />
          Cancel
        </Button>
      </form>
    </Card>
  );
}
