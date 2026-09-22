"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { BellIcon, CheckIcon, SpinnerIcon } from "@/components/icons";
import { disablePush, enablePush, readPushState, type PushState } from "@/lib/push-client";

const COPY: Record<PushState, { title: string; body: string }> = {
  on: {
    title: "Notifications are on for this device",
    body: "You'll get the switch-on reminder an hour before each confirmed booking, plus alerts when the team confirms, cancels or marks the spa ready.",
  },
  off: {
    title: "Notifications are off",
    body: "Turn them on so you get the switch-on reminder an hour before a booking. Do this on every phone you use.",
  },
  denied: {
    title: "Notifications are blocked",
    body: "Your browser is blocking notifications for this site. Allow them in your browser's site settings, then come back and turn them on here.",
  },
  "needs-install": {
    title: "Add to your Home Screen first",
    body: "On iPhone, notifications only work once this is installed. Tap Share, then 'Add to Home Screen', open it from there and turn notifications on.",
  },
  unsupported: {
    title: "This browser can't do notifications",
    body: "Use Chrome on Android, or Safari on iOS 16.4 or newer with the app added to your Home Screen.",
  },
};

export function NotificationSettings({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await readPushState());
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      setState(state === "on" ? await disablePush() : await enablePush(vapidPublicKey));
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (state === null) {
    return (
      <Card className="flex items-center gap-3 p-5 text-sm text-text-muted">
        <SpinnerIcon width={18} height={18} />
        Checking this device…
      </Card>
    );
  }

  const copy = COPY[state];
  const canToggle = state === "on" || state === "off";

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={
            state === "on"
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted"
          }
        >
          {state === "on" ? <CheckIcon width={20} height={20} /> : <BellIcon width={20} height={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{copy.title}</p>
          <p className="mt-1 text-sm text-text-muted">{copy.body}</p>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {canToggle && (
        <Button
          block
          className="mt-4"
          variant={state === "on" ? "secondary" : "primary"}
          onClick={toggle}
          disabled={busy || !vapidPublicKey}
          aria-busy={busy}
        >
          {busy ? (
            <>
              <SpinnerIcon width={18} height={18} />
              Working…
            </>
          ) : state === "on" ? (
            "Turn off on this device"
          ) : (
            "Turn on notifications"
          )}
        </Button>
      )}

      {!vapidPublicKey && (
        <p className="mt-3 text-xs text-warn">
          Push isn&rsquo;t configured on the server yet (missing VAPID keys).
        </p>
      )}
    </Card>
  );
}
