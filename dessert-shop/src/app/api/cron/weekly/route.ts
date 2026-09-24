import { TIME_ZONE } from "@/lib/config";
import { db } from "@/lib/db";
import { todayLocal, weekdayLocal } from "@/lib/format";
import { claimWeeklySend, getSettings, listCustomers } from "@/lib/ledger";
import { sendToAll } from "@/lib/push";
import { weeklySummary } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * Called daily by Vercel Cron (see vercel.json). Sends the weekly push summary only on the
 * owner's chosen weekday, at most once per day (guarded in the DB, so retries are safe).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sql = db();
  const settings = await getSettings(sql);
  const now = new Date();
  if (!settings.remindersEnabled) return Response.json({ skipped: "disabled" });
  if (weekdayLocal(TIME_ZONE, now) !== settings.reminderWeekday) return Response.json({ skipped: "not-today" });

  const customers = await listCustomers(sql);
  const summary = weeklySummary(customers, settings, now);
  if (!summary) return Response.json({ skipped: "nothing-outstanding" });
  if (!(await claimWeeklySend(sql, todayLocal(TIME_ZONE, now)))) return Response.json({ skipped: "already-sent" });

  const result = await sendToAll(sql, { ...summary, url: "/reminders", tag: "weekly" });
  return Response.json(result);
}
