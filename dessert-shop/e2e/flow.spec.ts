import { readFileSync } from "node:fs";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/shop_test";

test.beforeAll(async () => {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await sql`truncate transactions, customers, products, login_attempts restart identity cascade`;
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("كلمة المرور").fill("test-pass-123");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function record(page: Page, kind: "أخذ صواني" | "أرجع صواني", qty: number) {
  await page.getByRole("link", { name: kind }).click();
  await page.getByLabel("عدد الصواني").fill(String(qty));
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

const heroBalance = (page: Page) => page.locator(".hero-balance");

test("protected pages redirect to login and wrong password is rejected", async ({ page }) => {
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("كلمة المرور").fill("wrong");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page.getByText("كلمة المرور غير صحيحة")).toBeVisible();
});

test("full flow: Ahmed takes 4, returns 3, takes 5 → owes 6", async ({ page }) => {
  await login(page);
  await expect(page.getByText("لا يوجد زبائن بعد")).toBeVisible();
  await page.screenshot({ path: "test-results/01-empty.png" });

  // Product
  await page.getByRole("link", { name: "الأصناف" }).click();
  await page.getByLabel("صنف جديد").fill("بسبوسة");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText("تمت إضافة «بسبوسة»")).toBeVisible();
  await page.getByLabel("صنف جديد").fill(" بسبوسة ");
  await page.getByRole("button", { name: "إضافة الصنف" }).click();
  await expect(page.getByText("هذا الصنف موجود مسبقاً")).toBeVisible();

  // Customer — validation first
  await page.goto("/customers/new");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await expect(page.getByText("اكتب اسم الزبون")).toBeVisible();
  await page.getByLabel("اسم الزبون").fill("أحمد");
  await page.getByLabel(/رقم الهاتف/).fill("٠٧٧٠٠ ٩٠٠١٢٣");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await expect(page.getByRole("heading", { name: "أحمد" })).toBeVisible();
  await expect(page.getByRole("link", { name: /07700900123/ })).toHaveAttribute("href", "tel:07700900123");
  await expect(heroBalance(page)).toHaveText("0");

  await record(page, "أخذ صواني", 4);
  await expect(heroBalance(page)).toHaveText("4");
  await record(page, "أرجع صواني", 3);
  await expect(heroBalance(page)).toHaveText("1");
  await record(page, "أخذ صواني", 5);
  await expect(heroBalance(page)).toHaveText("6");
  await expect(page.locator(".tx")).toHaveCount(3);
  await page.screenshot({ path: "test-results/02-customer.png", fullPage: true });

  // Over-return is blocked (client hint + server check)
  await page.getByRole("link", { name: "أرجع صواني" }).click();
  await page.getByLabel("عدد الصواني").fill("9");
  await expect(page.getByText("عليه 6 فقط من بسبوسة")).toBeVisible();
  await page.getByRole("button", { name: /^تسجيل/ }).click();
  await expect(page.getByText(/سيصبح رصيد «بسبوسة» بالسالب/)).toBeVisible();
  await page.getByRole("link", { name: "→ أحمد" }).click();

  // Edit the first "take 4" → 2 would make the history go negative? 2 - 3 + 5 = 4 → fine.
  await page.locator(".tx").last().click();
  await expect(page.getByRole("heading", { name: /تعديل عملية/ })).toBeVisible();
  await page.getByLabel("عدد الصواني").fill("2");
  await page.getByRole("button", { name: "حفظ التعديل" }).click();
  await expect(page.getByText("تم تعديل العملية")).toBeVisible();
  await expect(heroBalance(page)).toHaveText("4");

  // Delete the latest "take 5" → 2 - 3 = -1 → blocked
  await page.locator(".tx").first().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف العملية" }).click();
  await expect(page.getByText(/بالسالب/)).toBeVisible();

  // Delete the "return 3" → allowed, balance 7
  await page.getByRole("link", { name: "→ أحمد" }).click();
  await page.locator(".tx").nth(1).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف العملية" }).click();
  await expect(page.getByText("تم حذف العملية")).toBeVisible();
  await expect(heroBalance(page)).toHaveText("7");

  // Dashboard + search
  await page.getByRole("link", { name: "→ الزبائن" }).click();
  await page.getByRole("link", { name: "+ زبون جديد" }).click();
  await page.getByLabel("اسم الزبون").fill("سارة");
  await page.getByRole("button", { name: "إضافة الزبون" }).click();
  await page.getByRole("link", { name: "→ الزبائن" }).click();
  await expect(page.locator(".list-item")).toHaveCount(2);
  await expect(page.locator(".stat-value").first()).toHaveText("7");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/03-dashboard.png" });
  await page.getByLabel("ابحث عن زبون").fill("احمد"); // no hamza still matches
  await expect(page.locator(".list-item")).toHaveCount(1);
  await expect(page.locator(".list-item .badge")).toHaveText("7");
  await page.getByLabel("ابحث عن زبون").fill("900");
  await expect(page.locator(".list-item")).toHaveCount(1);
  await page.getByLabel("ابحث عن زبون").fill("زززز");
  await expect(page.getByText("لا يوجد زبون بهذا الاسم")).toBeVisible();

  // Product with transactions can't be deleted (no delete button shown)
  await page.getByRole("link", { name: "الأصناف" }).click();
  await expect(page.getByText("2 عملية مسجّلة")).toBeVisible();
  await expect(page.getByRole("button", { name: "حذف" })).toHaveCount(0);

  // Edit + delete customer
  await page.goto("/");
  await page.getByRole("link", { name: /سارة/ }).click();
  await page.getByRole("link", { name: "تعديل بيانات الزبون" }).click();
  await page.getByLabel("اسم الزبون").fill("سارة علي");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByRole("heading", { name: "سارة علي" })).toBeVisible();
  await page.getByRole("link", { name: "تعديل بيانات الزبون" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف الزبون وسجله" }).click();
  await expect(page.getByText("تم حذف الزبون")).toBeVisible();
  await expect(page.locator(".list-item")).toHaveCount(1);

  // Logout
  await page.getByRole("button", { name: "خروج" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("no horizontal scroll on a 360px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page);
  for (const path of ["/", "/products", "/customers/1", "/customers/1/tx/new?kind=take"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await page.goto("/customers/1/tx/new?kind=return");
  await page.screenshot({ path: "test-results/04-return-form.png", fullPage: true });
  await page.goto("/products");
  await page.screenshot({ path: "test-results/05-products.png", fullPage: true });
  await page.context().clearCookies();
  await page.goto("/login");
  await page.screenshot({ path: "test-results/00-login.png" });
});
