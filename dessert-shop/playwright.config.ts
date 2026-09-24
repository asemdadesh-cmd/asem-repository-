import { defineConfig, devices } from "@playwright/test";
import webpush from "web-push";

// Fresh throwaway keypair per run — nothing secret is committed.
const vapid = webpush.generateVAPIDKeys();

// E2E runs against a production build using the local test database.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Pixel 7"],
    locale: "ar",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/shop_test",
      APP_PASSWORD: "test-pass-123",
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      APP_TIMEZONE: "Europe/London",
      CRON_SECRET: "e2e-cron-secret",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
    },
  },
});
