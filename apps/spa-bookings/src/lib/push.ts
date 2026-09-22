import "server-only";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
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
  kind: string;
  bookingId?: string | null;
  /** Keeps the notification on screen until acted on. Used for the switch-on nudge. */
  requireInteraction?: boolean;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Sends a push to every registered device of the given users and records the
 * same message in their in-app feed. Dead endpoints are pruned automatically.
 * Never throws: a notification failure must not roll back the action that
 * triggered it.
 */
export async function notifyUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { sent: 0, failed: 0 };

  const admin = createAdminClient();

  // In-app feed first — it is the reliable record; push is best-effort.
  const { error: feedError } = await admin.from("notifications").insert(
    unique.map((userId) => ({
      user_id: userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      booking_id: payload.bookingId ?? null,
    })),
  );
  if (feedError) console.error("[notify] feed insert failed", feedError.message);

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", unique)
    .returns<SubscriptionRow[]>();

  if (error || !subs?.length) {
    if (error) console.error("[notify] subscription lookup failed", error.message);
    return { sent: 0, failed: 0 };
  }

  try {
    configure();
  } catch (e) {
    console.error("[notify] VAPID not configured:", (e as Error).message);
    return { sent: 0, failed: subs.length };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/calendar",
    tag: payload.tag ?? payload.kind,
    requireInteraction: payload.requireInteraction ?? false,
  });

  const stale: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
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
        // 404/410 mean the browser threw the subscription away.
        if (status === 404 || status === 410) stale.push(sub.id);
        else console.error("[notify] push failed", status, (err as Error).message);
      }
    }),
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("id", stale);
  }

  return { sent, failed };
}

/** Everyone active except the person who performed the action. */
export async function teamUserIds(excludeUserId?: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .returns<{ id: string }[]>();
  return (data ?? []).map((p) => p.id).filter((id) => id !== excludeUserId);
}
