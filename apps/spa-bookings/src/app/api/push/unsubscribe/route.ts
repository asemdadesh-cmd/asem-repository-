import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let endpoint: unknown;
  try {
    ({ endpoint } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  // RLS scopes the delete to this user's own rows.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
