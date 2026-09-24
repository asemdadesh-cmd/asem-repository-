// Non-destructive smoke test against a live deployment. Creates a temporary customer,
// runs the take 4 / return 3 / take 5 scenario, then deletes that customer.
// Usage: BASE_URL=https://... APP_PASSWORD=... node e2e/prod-smoke.mjs
import { chromium } from "playwright";

const base = process.env.BASE_URL;
const password = process.env.APP_PASSWORD;
const name = `اختبار-${Date.now()}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ar" });
const step = (m) => console.log("✓", m);
const expectText = async (sel, text) => {
  await page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent?.trim() === t, [sel, text], { timeout: 15000 });
};

try {
  await page.goto(`${base}/`);
  await page.waitForURL(/\/login$/);
  step("redirected to login");
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  step("logged in");

  await page.goto(`${base}/customers/new`);
  await page.getByLabel("اسم الزبون").fill(name);
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await page.getByRole("heading", { name }).waitFor();
  step("customer created");

  for (const [kind, qty, expected] of [["أخذ صواني", 4, "4"], ["أرجع صواني", 3, "1"], ["أخذ صواني", 5, "6"]]) {
    await page.getByRole("link", { name: kind }).click();
    await page.getByLabel("عدد الصواني").fill(String(qty));
    await page.getByRole("button", { name: /^تسجيل/ }).click();
    await page.getByRole("status").waitFor();
    await expectText(".hero-balance", expected);
    step(`${kind} ${qty} → balance ${expected}`);
  }

  await page.getByRole("link", { name: "أرجع صواني" }).click();
  await page.getByLabel("عدد الصواني").fill("9");
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await page.getByText(/بالسالب/).waitFor();
  step("over-return rejected by server");

  await page.goto(`${base}/`);
  await page.getByLabel("ابحث عن زبون").fill(name);
  await page.locator(".list-item").first().waitFor();
  await expectText(".list-item .badge", "6");
  step("dashboard search shows balance 6");

  await page.locator(".list-item").first().click();
  await page.getByRole("link", { name: "تعديل بيانات الزبون" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف الزبون وسجله" }).click();
  await page.getByText("تم حذف الزبون").waitFor();
  step("temporary customer deleted");
  console.log("PROD SMOKE PASSED");
} catch (e) {
  console.error("PROD SMOKE FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
