// Non-destructive smoke test against a live deployment. Creates a temporary customer,
// runs the take 4 / return 3 / take 5 scenario, checks reminders, then deletes that customer.
// Usage: BASE_URL=https://... APP_PASSWORD=... [PW_CHROMIUM=/path/to/chrome] node e2e/prod-smoke.mjs
import { chromium } from "playwright";

const base = process.env.BASE_URL;
const password = process.env.APP_PASSWORD;
const name = `اختبار-${Date.now()}`;
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ar" });
const step = (m) => console.log("✓", m);
const expectText = (sel, text) =>
  page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent?.trim() === t, [sel, text], {
    timeout: 15000,
  });

try {
  const cron = await fetch(`${base}/api/cron/weekly`);
  if (cron.status !== 401) throw new Error(`cron should be 401 without secret, got ${cron.status}`);
  step("cron endpoint rejects unauthenticated calls");

  await page.goto(`${base}/`);
  await page.waitForURL(/\/login$/);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  step("logged in");

  await page.goto(`${base}/customers/new`);
  await page.getByLabel("اسم الزبون").fill(name);
  await page.getByLabel(/رقم الهاتف/).fill("07700900123");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await page.getByRole("heading", { name }).waitFor();
  const id = new URL(page.url()).pathname.split("/")[2];
  step(`customer created (#${id})`);

  for (const [kind, qty, expected] of [
    ["أخذ صواني", 4, "4"],
    ["أرجع صواني", 3, "1"],
    ["أخذ صواني", 5, "6"],
  ]) {
    await page.getByRole("link", { name: kind }).click();
    if (kind === "أخذ صواني" && expected === "6") {
      await page.locator(".banner.warn").waitFor();
      step("take form shows the 'still holds trays' reminder");
    }
    await page.getByLabel("عدد الصواني").fill(String(qty));
    await page.getByRole("button", { name: /^تسجيل/ }).click();
    await expectText(".balance-value", expected);
    step(`${kind} ${qty} → balance ${expected}`);
  }

  await page.getByRole("link", { name: "أرجع صواني" }).click();
  await page.getByLabel("عدد الصواني").fill("9");
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await page.getByText(/بالسالب/).waitFor();
  step("over-return rejected by server");

  await page.goto(`${base}/customers`);
  await page.getByLabel("ابحث عن زبون").fill(name);
  await page.locator(".list .item").first().waitFor();
  step("customer list search works");

  await page.goto(`${base}/reminders`);
  const href = await page.locator(`a.btn-wa`).first().getAttribute("href");
  if (!href?.startsWith("https://wa.me/447700900123?text=")) throw new Error(`bad WhatsApp link: ${href}`);
  step("reminders page lists customer with WhatsApp link");

  await page.goto(`${base}/settings`);
  await page.getByLabel("اسم المحل").waitFor();
  step("settings page loads");

  await page.goto(`${base}/customers/${id}/edit`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف الزبون وسجله" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  step("temporary customer deleted");
  console.log("PROD SMOKE PASSED");
} catch (e) {
  console.error("PROD SMOKE FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
