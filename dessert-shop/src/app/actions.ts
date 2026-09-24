"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createSessionToken, requireAuth, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { TIME_ZONE } from "@/lib/config";
import { db } from "@/lib/db";
import * as L from "@/lib/ledger";
import { sendToAll } from "@/lib/push";
import { weeklySummary } from "@/lib/reminders";
import {
  customerSchema,
  fieldErrors,
  idSchema,
  productSchema,
  settingsSchema,
  transactionSchema,
} from "@/lib/validation";

export type FormState = { errors?: Record<string, string>; ok?: string } | undefined;

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

function ledgerMessage(e: unknown): string {
  if (e instanceof L.LedgerError) {
    switch (e.code) {
      case "NEGATIVE_BALANCE":
        return `لا يمكن: سيصبح رصيد «${e.detail?.productName}» بالسالب. المرتجع أكثر من المستحق على الزبون.`;
      case "DUPLICATE_PRODUCT":
        return "هذا الصنف موجود مسبقاً";
      case "PRODUCT_IN_USE":
        return "لا يمكن حذف صنف له عمليات مسجّلة";
      case "NOT_FOUND":
        return "العنصر غير موجود — ربما حُذف";
    }
  }
  console.error(e);
  return "حدث خطأ غير متوقع، حاول مرة أخرى";
}

// ---------- Auth ----------

const MAX_FAILED_LOGINS = 10;

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const sql = db();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from login_attempts
    where ip = ${ip} and created_at > now() - interval '15 minutes'
  `;
  if (n >= MAX_FAILED_LOGINS) {
    return { errors: { password: "محاولات كثيرة خاطئة. انتظر ١٥ دقيقة ثم حاول مجدداً." } };
  }

  if (!checkPassword(str(fd, "password"))) {
    await sql`insert into login_attempts (ip) values (${ip})`;
    await sql`delete from login_attempts where created_at < now() - interval '1 day'`;
    return { errors: { password: "كلمة المرور غير صحيحة" } };
  }

  await sql`delete from login_attempts where ip = ${ip}`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- Customers ----------

export async function saveCustomer(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = customerSchema.safeParse({ name: str(fd, "name"), phone: str(fd, "phone") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const rawId = str(fd, "id");
  let id: number;
  try {
    if (rawId) {
      id = idSchema.parse(rawId);
      await L.updateCustomer(db(), id, parsed.data);
    } else {
      id = await L.createCustomer(db(), parsed.data);
    }
  } catch (e) {
    return { errors: { form: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  if (!rawId && str(fd, "next") === "take") redirect(`/customers/${id}/tx/new?kind=take`);
  redirect(`/customers/${id}?saved=${rawId ? "customer" : "created"}`);
}

export async function removeCustomer(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  try {
    await L.deleteCustomer(db(), idSchema.parse(str(fd, "id")));
  } catch (e) {
    if (!(e instanceof L.LedgerError && e.code === "NOT_FOUND")) return { errors: { form: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}

// ---------- Products ----------

export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = productSchema.safeParse({ name: str(fd, "name"), priceCents: str(fd, "price") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const rawId = str(fd, "id");
  try {
    if (rawId) await L.updateProduct(db(), idSchema.parse(rawId), parsed.data);
    else await L.createProduct(db(), parsed.data);
  } catch (e) {
    return { errors: { name: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  return { ok: rawId ? "تم حفظ التعديل" : `تمت إضافة «${parsed.data.name}»` };
}

export async function removeProduct(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  try {
    await L.deleteProduct(db(), idSchema.parse(str(fd, "id")));
  } catch (e) {
    return { errors: { form: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  return { ok: "تم حذف الصنف" };
}

// ---------- Transactions ----------

export async function saveTransaction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const customerId = idSchema.safeParse(str(fd, "customerId"));
  if (!customerId.success) return { errors: { form: "الزبون غير موجود" } };

  const parsed = transactionSchema.safeParse({
    productId: str(fd, "productId"),
    kind: str(fd, "kind"),
    quantity: str(fd, "quantity"),
    unitPriceCents: str(fd, "kind") === "take" ? str(fd, "unitPrice") : "",
    note: str(fd, "note"),
    occurredAt: str(fd, "occurredAt"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const rawId = str(fd, "id");
  try {
    if (rawId) {
      await L.updateTransaction(db(), customerId.data, idSchema.parse(rawId), parsed.data, TIME_ZONE);
    } else {
      await L.createTransaction(db(), customerId.data, parsed.data, TIME_ZONE);
    }
  } catch (e) {
    return { errors: { form: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  redirect(`/customers/${customerId.data}?saved=${rawId ? "edit" : parsed.data.kind}`);
}

export async function removeTransaction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const customerId = idSchema.parse(str(fd, "customerId"));
  try {
    await L.deleteTransaction(db(), customerId, idSchema.parse(str(fd, "id")));
  } catch (e) {
    return { errors: { form: ledgerMessage(e) } };
  }
  revalidatePath("/", "layout");
  redirect(`/customers/${customerId}?saved=deleted`);
}

// ---------- Reminders & settings ----------

export async function markReminded(customerId: number): Promise<void> {
  await requireAuth();
  const id = idSchema.parse(customerId);
  await L.logReminder(db(), id);
  revalidatePath("/reminders");
}

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = settingsSchema.safeParse({
    shopName: str(fd, "shopName"),
    currency: str(fd, "currency"),
    overdueDays: str(fd, "overdueDays"),
    reminderWeekday: str(fd, "reminderWeekday"),
    remindersEnabled: fd.get("remindersEnabled") === "on",
    countryCode: str(fd, "countryCode"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await L.updateSettings(db(), parsed.data);
  revalidatePath("/", "layout");
  return { ok: "تم حفظ الإعدادات" };
}

export async function subscribePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
  await requireAuth();
  const ok =
    typeof sub?.endpoint === "string" &&
    /^https:\/\//.test(sub.endpoint) &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string";
  if (!ok) throw new Error("invalid subscription");
  const h = await headers();
  await L.savePushSubscription(
    db(),
    { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    h.get("user-agent") ?? "",
  );
  revalidatePath("/reminders");
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await requireAuth();
  if (typeof endpoint !== "string") return;
  await L.deletePushSubscription(db(), endpoint);
  revalidatePath("/reminders");
}

/** Sends this week's summary right now — lets the owner check notifications work. */
export async function sendTestNotification(): Promise<{ sent: number }> {
  await requireAuth();
  const sql = db();
  const [settings, customers] = await Promise.all([L.getSettings(sql), L.listCustomers(sql)]);
  const summary = weeklySummary(customers, settings) ?? {
    title: "دفتر الصواني",
    body: "الإشعارات تعمل ✓ لا توجد صواني عند الزبائن حالياً.",
  };
  const { sent } = await sendToAll(sql, { ...summary, url: "/reminders", tag: "weekly" });
  return { sent };
}
