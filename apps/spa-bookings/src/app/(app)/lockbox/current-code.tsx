"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { CopyIcon, CheckIcon, LockIcon } from "@/components/icons";
import { relativeToNow } from "@/lib/time";

/**
 * The code starts hidden: this screen gets opened in doorways and lobbies, and
 * a code sitting in plain sight on an unlocked phone is the obvious leak.
 */
export function CurrentCode({ code, changedAt }: { code: string; changedAt: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-hide again so it isn't left on screen.
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), 45_000);
    return () => clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setRevealed(true);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center px-5 py-7 text-center">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg"
        >
          <LockIcon width={22} height={22} />
        </span>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">
          Current lockbox code
        </p>

        <p
          className="mt-3 font-mono text-[2.5rem] font-semibold leading-none tracking-[0.2em] text-text"
          aria-live="polite"
        >
          {revealed ? code : "•".repeat(Math.min(code.length, 8))}
          <span className="sr-only">
            {revealed ? `The code is ${code.split("").join(" ")}` : "Code hidden"}
          </span>
        </p>

        <p className="mt-4 text-xs text-text-muted">Updated {relativeToNow(changedAt)}</p>
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
        >
          {revealed ? "Hide code" : "Show code"}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={copy}>
          {copied ? (
            <>
              <CheckIcon width={16} height={16} />
              Copied
            </>
          ) : (
            <>
              <CopyIcon width={16} height={16} />
              Copy
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
