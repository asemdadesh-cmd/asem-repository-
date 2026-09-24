import "server-only";
import postgres from "postgres";

declare global {
  // Reuse one pool across hot reloads in dev and across invocations of a warm serverless instance.
  var __sql: postgres.Sql | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
}

export function db(): postgres.Sql {
  globalThis.__sql ??= createClient();
  return globalThis.__sql;
}
