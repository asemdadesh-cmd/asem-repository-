import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Uptime/DB check. Reveals nothing beyond "database reachable". */
export async function GET() {
  try {
    await db()`select 1`;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("health check failed", e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
