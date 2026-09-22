/** Fails fast and loudly instead of shipping a half-configured deployment. */
function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. See .env.example for the full list.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
};

export function requirePublicEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey),
  };
}

export function requireServerEnv() {
  return {
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    vapidPublicKey: required("NEXT_PUBLIC_VAPID_PUBLIC_KEY", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivateKey: required("VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY),
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    cronSecret: required("CRON_SECRET", process.env.CRON_SECRET),
  };
}
