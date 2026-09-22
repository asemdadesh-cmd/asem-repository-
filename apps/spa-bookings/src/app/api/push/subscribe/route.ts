import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyName } from "@/lib/identity";

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  userAgent?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Incomplete subscription" }, { status: 400 });
  }

  // Tag the phone with its chosen name so duty reminders can find it.
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_staff_name: (await getMyName()) ?? "",
    p_user_agent: body.userAgent ?? "",
  });

  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
