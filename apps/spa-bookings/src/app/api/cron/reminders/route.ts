import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { notifyPhones } from "@/lib/push";
import { formatTime, londonDateKey } from "@/lib/time";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lead time before a booking that the spa must be switched on. */
const SWITCH_ON_LEAD_MINUTES = 60;
/** Second nudge if nobody has marked the spa ready. */
const ESCALATION_MINUTES = 15;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header =
    request.headers.get("authorization") ??
    // Vercel Cron sends the same header; this also accepts a bare secret.
    "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided.length !== secret.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

interface DueBooking {
  id: string;
  guest_name: string;
  starts_at: string;
  spa_ready_at: string | null;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  apartment: { name: string } | null;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // A missing service-role key is a configuration problem, not a crash: say so
  // plainly, since pg_net records this response body in net._http_response.
  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Not configured: SUPABASE_SERVICE_ROLE_KEY is missing on the server" },
      { status: 503 },
    );
  }
  const now = new Date();
  const horizon = new Date(now.getTime() + SWITCH_ON_LEAD_MINUTES * 60_000);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, guest_name, starts_at, spa_ready_at, reminder_sent_at, escalated_at, apartment:apartments(name)",
    )
    .eq("status", "confirmed")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true })
    .returns<DueBooking[]>();

  if (error) {
    console.error("[cron/reminders]", error.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!bookings?.length) {
    return NextResponse.json({ ok: true, reminded: 0, escalated: 0 });
  }

  const appUrl = publicEnv.appUrl;
  let reminded = 0;
  let escalated = 0;

  for (const booking of bookings) {
    const minutesAway = Math.round(
      (new Date(booking.starts_at).getTime() - now.getTime()) / 60_000,
    );
    const where = booking.apartment?.name ?? "the apartment";
    const when = formatTime(booking.starts_at);
    const link = `${appUrl}/bookings/${booking.id}`;

    // --- T-60: tell whoever is on duty to go switch the spa on ---------------
    if (!booking.reminder_sent_at && !booking.spa_ready_at) {
      const dutyName = await dutyNameForDate(admin, booking.starts_at);
      const payload = {
        title: `Switch the spa on — ${when}`,
        body: `${booking.guest_name} · ${where}. Starts in ${minutesAway} min, so it needs turning on now to heat up.`,
        url: link,
        tag: `switch-on-${booking.id}`,
        requireInteraction: true,
      };
      // If the duty person's phone isn't registered, nobody would hear it, so
      // fall back to every phone rather than sending into the void.
      const result = dutyName
        ? await notifyPhones({ names: [dutyName] }, payload)
        : { sent: 0, failed: 0 };
      if (result.sent === 0) await notifyPhones({}, payload);
      await admin
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id)
        .is("reminder_sent_at", null);
      reminded += 1;
      continue;
    }

    // --- T-15: still not ready, chase the whole team -------------------------
    if (
      !booking.spa_ready_at &&
      !booking.escalated_at &&
      minutesAway <= ESCALATION_MINUTES
    ) {
      await notifyPhones(
        {},
        {
          title: `Spa still not marked ready — ${when}`,
          body: `${booking.guest_name} · ${where} starts in ${minutesAway} min. Can someone confirm the spa is on?`,
          url: link,
          tag: `not-ready-${booking.id}`,
          requireInteraction: true,
        },
      );

      await admin
        .from("bookings")
        .update({ escalated_at: new Date().toISOString() })
        .eq("id", booking.id)
        .is("escalated_at", null);
      escalated += 1;
    }
  }

  return NextResponse.json({ ok: true, reminded, escalated });
}

/** The name on the duty rota for that Cardiff calendar day, if any. */
async function dutyNameForDate(
  admin: NonNullable<ReturnType<typeof tryCreateAdminClient>>,
  startsAt: string,
): Promise<string | null> {
  const { data } = await admin
    .from("duty_shifts")
    .select("staff_name")
    .eq("duty_date", londonDateKey(startsAt))
    .maybeSingle<{ staff_name: string | null }>();
  return data?.staff_name ?? null;
}

/** Vercel Cron issues GET; pg_cron issues POST. Same work either way. */
export async function GET(request: Request) {
  return POST(request);
}
