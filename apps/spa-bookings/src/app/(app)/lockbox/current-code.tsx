"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { CopyIcon, CheckIcon } from "@/components/icons";
import { relativeToNow } from "@/lib/time";

/**
 * The code is shown plainly rather than hidden behind a reveal tap. The whole
 * point of the screen is "what is the code right now", and an extra step there
 * reads as a broken page to anyone not expecting it.
 */
export function CurrentCode({ code, changedAt }: { code: string; changedAt: string }) {
  const [copied, setCopied] = useState(false);

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
      /* Clipboard blocked — the code is on screen anyway. */
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-8 text-center">
        <p className="text-sm font-medium text-text-muted">The code right now</p>

        <p className="mt-4 font-mono text-[3.25rem] font-bold leading-none tracking-[0.15em] text-text">
          {code}
        </p>

        <p className="mt-5 text-sm text-text-muted">Changed {relativeToNow(changedAt)}</p>
      </div>

      <div className="border-t border-border p-3">
        <Button variant="secondary" block onClick={copy}>
          {copied ? (
            <>
              <CheckIcon width={18} height={18} />
              Copied
            </>
          ) : (
            <>
              <CopyIcon width={18} height={18} />
              Copy the code
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
