#!/usr/bin/env node
/**
 * Creates the first admin account.
 *
 * Normal staff are invited from inside the app, but the very first admin has
 * nobody to invite them — this script uses the service-role key to allowlist
 * an email and send its invitation.
 *
 * Usage:  node scripts/bootstrap-admin.mjs you@example.com "Your Name"
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local reader so this runs without extra dependencies.
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file is optional */
    }
  }
}
loadEnv();

const [email, fullName = ""] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node scripts/bootstrap-admin.mjs you@example.com "Your Name"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local first.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: inviteRowError } = await supabase
  .from("staff_invites")
  .upsert({ email: email.toLowerCase(), full_name: fullName, role: "admin" }, { onConflict: "email" });

if (inviteRowError) {
  console.error("Could not write the allowlist row:", inviteRowError.message);
  process.exit(1);
}

const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${appUrl}/auth/callback`,
  data: { full_name: fullName },
});

if (inviteError) {
  if (/already been registered|already exists/i.test(inviteError.message)) {
    // The account exists; make sure it is actually an admin.
    const { data: list } = await supabase.auth.admin.listUsers();
    const user = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      await supabase.from("profiles").update({ role: "admin", is_active: true }).eq("id", user.id);
      console.log(`${email} already had an account — promoted to admin.`);
      process.exit(0);
    }
  }
  console.error("Invite failed:", inviteError.message);
  process.exit(1);
}

console.log(`Admin invite sent to ${email}. Open the link on the phone you'll use the app on.`);
