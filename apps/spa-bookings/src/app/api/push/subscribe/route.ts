import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface Body {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  userAgent?: string;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.userId,
      endpoint,
      p256dh,
      auth,
      user_agent: body.userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
