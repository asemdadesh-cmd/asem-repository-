import "server-only";
import webpush from "web-push";
import { deletePushSubscription, listPushSubscriptions } from "./ledger";
import type postgres from "postgres";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!VAPID_PUBLIC_KEY || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://dessert-shop-ledger.vercel.app", VAPID_PUBLIC_KEY, priv);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Sends to every subscribed device; drops subscriptions the push service says are gone. */
export async function sendToAll(
  sql: postgres.Sql,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 };
  const subs = await listPushSubscriptions(sql);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await deletePushSubscription(sql, s.endpoint);
        else console.error("push failed", status, (e as Error).message);
      }
    }),
  );
  return { sent, failed };
}
