import "server-only";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { requireServerEnv } from "@/lib/env";

let configured = false;
function configure() {
  if (configured) return;
  const { vapidSubject, vapidPublicKey, vapidPrivateKey } = requireServerEnv();
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Keeps the notification on screen until acted on. Used for the switch-on nudge. */
  requireInteraction?: boolean;
}

export interface Audience {
  /** Only phones registered under these staff names. Omit for every phone. */
  names?: string[];
  /** Skip phones registered under this name (the person who did the action). */
  exceptName?: string | null;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  staff_name: string | null;
}

/**
 * Sends a push to phones. Reading the subscription list needs the service-role
 * key; without it this quietly sends nothing. Never throws: a notification
 * failure must not undo the action that triggered it.
 */
export async function notifyPhones(
  audience: Audience,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const admin = tryCreateAdminClient();
  if (!admin) return { sent: 0, failed: 0 };

  let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, staff_name");
  if (audience.names?.length) query = query.in("staff_name", audience.names);
  const { data: subs, error } = await query.returns<SubscriptionRow[]>();

  if (error) {
    console.error("[notify] subscription lookup failed", error.message);
    return { sent: 0, failed: 0 };
  }

  const except = audience.exceptName?.toLowerCase();
  const targets = (subs ?? []).filter(
    (s) => !except || (s.staff_name ?? "").toLowerCase() !== except,
  );
  if (!targets.length) return { sent: 0, failed: 0 };

  try {
    configure();
  } catch (e) {
    console.error("[notify] VAPID not configured:", (e as Error).message);
    return { sent: 0, failed: targets.length };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/calendar",
    tag: payload.tag,
    requireInteraction: payload.requireInteraction ?? false,
  });

  const stale: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (sub) => {
      const target: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(target, body, { TTL: 3600, urgency: "high" });
        sent += 1;
      } catch (err) {
        failed += 1;
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the browser threw this subscription away.
        if (status === 404 || status === 410) stale.push(sub.id);
        else console.error("[notify] push failed", status, (err as Error).message);
      }
    }),
  );

  if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);
  return { sent, failed };
}
