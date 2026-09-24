import { readFileSync } from "node:fs";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/shop_test";

test.beforeAll(async () => {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await sql`truncate transactions, customers, products, login_attempts, reminder_log, push_subscriptions restart identity cascade`;
  await sql`update settings set shop_name = 'محل الحلويات', currency = 'GBP', overdue_days = 7, reminder_weekday = 6, reminders_enabled = true, country_code = '44', last_weekly_sent = null`;
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("كلمة المرور").fill("test-pass-123");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function record(page: Page, kind: "take" | "return", qty: number) {
  await page.getByRole("link", { name: kind === "take" ? "أخذ صواني" : "أرجع صواني" }).click();
  await page.getByLabel("عدد الصواني").fill(String(qty));
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(page.locator(".toast")).toBeVisible();
}

const balance = (page: Page) => page.locator(".balance-value");
const shot = (page: Page, name: string, fullPage = true) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage });

test("protected pages redirect to login; wrong password is rejected", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await shot(page, "00-login", false);
  await page.getByLabel("كلمة المرور").fill("wrong");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page.getByText("كلمة المرور غير صحيحة")).toBeVisible();
});

test("cron endpoint requires the secret", async ({ request }) => {
  expect((await request.get("/api/cron/weekly")).status()).toBe(401);
  const ok = await request.get("/api/cron/weekly", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("skipped");
});

test("full flow with prices, reminders and history", async ({ page }) => {
  await login(page);
  await expect(page.getByText("البداية")).toBeVisible();
  await shot(page, "01-home-empty");

  // Product with price
  await page.getByRole("link", { name: "الإعدادات" }).last().click();
  await page.getByRole("link", { name: /الأصناف والأسعار/ }).click();
  await page.getByLabel("اسم الصنف").fill("بسبوسة");
  await page.getByLabel("سعر الصينية").fill("10");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText("تمت إضافة «بسبوسة»")).toBeVisible();
  await expect(page.locator(".list .item-amount")).toHaveText("£10");
  await page.getByLabel("اسم الصنف").fill(" بسبوسة ");
  await page.getByLabel("سعر الصينية").fill("5");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText("هذا الصنف موجود مسبقاً")).toBeVisible();
  await page.getByLabel("اسم الصنف").fill("كنافة");
  await page.getByLabel("سعر الصينية").fill("abc");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText(/السعر غير صحيح/)).toBeVisible();
  await page.getByLabel("سعر الصينية").fill("15.5");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText("تمت إضافة «كنافة»")).toBeVisible();
  await shot(page, "05-products");

  // Customer — validation, Arabic digits in phone
  await page.goto("/customers/new");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await expect(page.getByText("اكتب اسم الزبون")).toBeVisible();
  await page.getByLabel("اسم الزبون").fill("أحمد");
  await page.getByLabel(/رقم الهاتف/).fill("٠٧٧٠٠ ٩٠٠١٢٣");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await expect(page.getByRole("heading", { name: "أحمد" })).toBeVisible();
  await expect(page.getByRole("link", { name: /اتصال/ })).toHaveAttribute("href", "tel:07700900123");
  await expect(balance(page)).toHaveText("0");

  // Take 4 → shows total, no reminder yet
  await page.getByRole("link", { name: "أخذ صواني" }).click();
  await expect(page.locator(".banner.warn")).toHaveCount(0);
  await page.getByLabel("بسبوسة").check();
  await page.getByLabel("عدد الصواني").fill("4");
  await expect(page.locator(".total-line")).toContainText("£40");
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(page.locator(".toast")).toHaveText(/تم تسجيل الأخذ/);
  await expect(balance(page)).toHaveText("4");

  await record(page, "return", 3);
  await expect(balance(page)).toHaveText("1");

  // Next take: the reminder banner tells the owner Ahmed still holds 1 tray
  await page.getByRole("link", { name: "أخذ صواني" }).click();
  await expect(page.locator(".banner.warn")).toContainText("عند أحمد صينية واحدة لم تُرجع");
  await shot(page, "04-take-form");
  await page.getByLabel("عدد الصواني").fill("5");
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(balance(page)).toHaveText("6");
  await expect(page.locator(".balance-money .v")).toHaveText("£60");
  await shot(page, "02-customer");

  // Over-return blocked (client hint + server)
  await page.getByRole("link", { name: "أرجع صواني" }).click();
  await page.getByLabel("عدد الصواني").fill("9");
  await expect(page.getByText("عنده 6 فقط من بسبوسة")).toBeVisible();
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(page.getByText(/سيصبح رصيد «بسبوسة» بالسالب/)).toBeVisible();

  // Edit the first take: backdate it 3 weeks and change qty → makes Ahmed overdue
  await page.goto("/customers/1");
  await page.locator(".list .item").last().click();
  await expect(page.getByRole("heading", { name: "تعديل عملية" })).toBeVisible();
  await page.getByLabel("عدد الصواني").fill("5");
  await page.getByLabel("التاريخ والوقت").fill("2026-09-01T10:00");
  await page.getByRole("button", { name: "حفظ التعديل" }).click();
  await expect(page.locator(".toast")).toHaveText(/تم تعديل العملية/);
  await expect(balance(page)).toHaveText("7");

  // Editing the return up to 11 would leave 10 - 11 < 0 → blocked by the server
  await page.locator(".list .item").nth(1).click();
  await page.getByLabel("عدد الصواني").fill("11");
  await page.getByRole("button", { name: "حفظ التعديل" }).click();
  await expect(page.getByText(/بالسالب/)).toBeVisible();

  // Quick record flow from home, via customer picker, creating a new customer on the way
  await page.goto("/");
  await page.getByRole("link", { name: /تسجيل عملية/ }).click();
  await page.getByLabel("ابحث عن زبون").fill("سارة");
  await page.getByRole("link", { name: "إضافة «سارة» كزبون جديد" }).click();
  await page.getByRole("button", { name: "إضافة ومتابعة للتسجيل" }).click();
  await expect(page.getByRole("heading", { name: "سارة" })).toBeVisible();
  await page.getByLabel("كنافة").check();
  await expect(page.getByLabel("سعر الصينية")).toHaveValue("15.50");
  await page.getByLabel("عدد الصواني").fill("2");
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(balance(page)).toHaveText("2");
  await expect(page.locator(".balance-money .v")).toHaveText("£31");

  // Home dashboard
  await page.getByRole("link", { name: "الرئيسية" }).last().click();
  await expect(page.locator(".kpi-value").nth(0)).toHaveText("9");
  await expect(page.locator(".kpi-value").nth(1)).toHaveText("£101");
  await expect(page.locator(".kpi-value").nth(2)).toHaveText("1");
  await expect(page.getByText("بحاجة لمتابعة")).toBeVisible();
  await expect(page.locator(".tabbar .tab-badge")).toHaveText("1");
  await shot(page, "03-home");

  // Customers: search + filters
  await page.getByRole("link", { name: "الزبائن" }).last().click();
  await expect(page.locator(".list .item")).toHaveCount(2);
  await page.getByRole("button", { name: /متأخرون/ }).click();
  await expect(page.locator(".list .item")).toHaveCount(1);
  await page.getByRole("button", { name: /الكل/ }).click();
  await page.getByLabel("ابحث عن زبون").fill("احمد");
  await expect(page.locator(".list .item")).toHaveCount(1);
  await page.getByLabel("ابحث عن زبون").fill("900");
  await expect(page.locator(".list .item")).toHaveCount(1);
  await page.getByLabel("ابحث عن زبون").fill("");
  await shot(page, "06-customers");

  // Reminders: overdue group + WhatsApp link with pre-written message
  await page.getByRole("link", { name: "التذكيرات" }).last().click();
  await expect(page.getByText(/متأخرون — أكثر من/)).toBeVisible();
  const wa = page.locator("a.btn-wa").first();
  const href = await wa.getAttribute("href");
  expect(href).toContain("https://wa.me/447700900123?text=");
  const text = decodeURIComponent(href!.split("text=")[1]);
  expect(text).toContain("مرحباً أحمد، معك محل الحلويات");
  expect(text).toContain("7 صواني بسبوسة بقيمة £70");
  await page.context().route("https://wa.me/**", (r) => r.fulfill({ body: "ok" }));
  const popup = page.waitForEvent("popup");
  await wa.click();
  await (await popup).close();
  await page.reload();
  await expect(page.getByText(/ذُكّر اليوم/)).toBeVisible();
  await shot(page, "07-reminders");

  // Settings: rename shop, change overdue threshold → nobody overdue
  await page.goto("/settings");
  await page.getByLabel("اسم المحل").fill("حلويات الشام");
  await page.getByLabel("متأخر بعد (أيام)").fill("60");
  await page.getByRole("button", { name: "حفظ الإعدادات" }).click();
  await expect(page.getByText("تم حفظ الإعدادات")).toBeVisible();
  await shot(page, "08-settings");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "حلويات الشام" })).toBeVisible();
  await expect(page.locator(".tabbar .tab-badge")).toHaveCount(0);

  // Delete customer
  await page.goto("/customers/2/edit");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف الزبون وسجله" }).click();
  await expect(page.locator(".toast")).toHaveText(/تم حذف الزبون/);

  // Logout
  await page.goto("/settings");
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("no horizontal scroll on a 360px phone; desktop layout renders", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page);
  for (const path of [
    "/",
    "/record",
    "/customers",
    "/customers/1",
    "/customers/1/tx/new?kind=take",
    "/customers/1/tx/new?kind=return",
    "/reminders",
    "/settings",
    "/products",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/customers/1");
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".tabbar")).toBeHidden();
  await shot(page, "09-desktop", false);
});
