import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes a magic-link sign-in.
 *
 * Supports both link shapes:
 *  - `?code=…`        PKCE (default Supabase template; same-device only)
 *  - `?token_hash=…`  OTP verification (device-independent — see README for the
 *                     one-line email template change that enables it)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only ever redirect to a path on this origin — never to a caller-supplied host.
  const rawNext = searchParams.get("next") ?? "/calendar";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/calendar";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendly(error.message))}`,
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendly(error.message))}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("That sign-in link is missing its token. Request a new one.")}`,
  );
}

function friendly(message: string): string {
  if (/expired|invalid/i.test(message)) {
    return "That sign-in link has expired or was already used. Request a new one.";
  }
  if (/code verifier/i.test(message)) {
    return "Open the sign-in link on the same device you requested it from, or request a new one here.";
  }
  return message;
}
