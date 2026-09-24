import { describe, expect, it } from "vitest";
import { agoDays, dayLabel, daysCount, todayLocal, trays, weekdayLocal } from "../src/lib/format";
import type { CustomerSummary } from "../src/lib/ledger";
import { formatMoney, parseMoney } from "../src/lib/money";
import {
  daysSince,
  isOverdue,
  outstandingCustomers,
  reminderMessage,
  weeklySummary,
  whatsappLink,
  whatsappNumber,
} from "../src/lib/reminders";

const now = new Date("2026-09-24T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const cust = (over: Partial<CustomerSummary>): CustomerSummary => ({
  id: 1,
  name: "أحمد",
  phone: "07700900123",
  balance: 6,
  valueCents: 6000,
  oldestOutstanding: daysAgo(12),
  balances: [{ productId: 1, name: "بسبوسة", balance: 6, valueCents: 6000, since: daysAgo(12) }],
  lastActivity: daysAgo(1),
  lastReminder: null,
  ...over,
});

const settings = { shopName: "حلويات الشام", currency: "GBP", overdueDays: 7, countryCode: "44" };

describe("money", () => {
  it("formats and parses minor units", () => {
    expect(formatMoney(1250, "GBP")).toBe("£12.50");
    expect(formatMoney(100000, "GBP")).toBe("£1,000");
    expect(formatMoney(1000, "SAR")).toBe("10 ر.س");
    expect(parseMoney("12.5")).toBe(1250);
    expect(parseMoney("12")).toBe(1200);
    expect(parseMoney("0.05")).toBe(5);
    expect(parseMoney("1,200")).toBe(120000);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1.999")).toBeNull();
  });
});

describe("overdue & summaries", () => {
  it("measures age from the oldest unreturned tray", () => {
    expect(daysSince(daysAgo(12), now)).toBe(12);
    expect(isOverdue(cust({}), 7, now)).toBe(true);
    expect(isOverdue(cust({ oldestOutstanding: daysAgo(3) }), 7, now)).toBe(false);
    expect(isOverdue(cust({ balance: 0, oldestOutstanding: null }), 7, now)).toBe(false);
  });

  it("orders outstanding customers most-overdue first and skips settled ones", () => {
    const list = outstandingCustomers([
      cust({ id: 1, name: "أ", oldestOutstanding: daysAgo(2) }),
      cust({ id: 2, name: "ب", balance: 0, oldestOutstanding: null }),
      cust({ id: 3, name: "ج", oldestOutstanding: daysAgo(20) }),
    ]);
    expect(list.map((c) => c.name)).toEqual(["ج", "أ"]);
  });

  it("builds the weekly push summary", () => {
    const s = weeklySummary(
      [cust({ id: 1 }), cust({ id: 2, name: "سارة", balance: 4, valueCents: 4000, oldestOutstanding: daysAgo(2) })],
      settings,
      now,
    );
    expect(s?.title).toBe("صواني لم تُرجع: 10 بقيمة £100");
    expect(s?.body).toContain("2 زبائن لديهم صواني، 1 منهم متأخرون");
    expect(s?.body).toContain("أحمد 6، سارة 4");
    expect(weeklySummary([cust({ balance: 0, oldestOutstanding: null })], settings, now)).toBeNull();
  });
});

describe("WhatsApp reminder", () => {
  it("normalises numbers to international format", () => {
    expect(whatsappNumber("07700 900123", "44")).toBe("447700900123");
    expect(whatsappNumber("+966 50 123 4567", "44")).toBe("966501234567");
    expect(whatsappNumber("00201001234567", "44")).toBe("201001234567");
    expect(whatsappNumber("", "44")).toBe("");
  });

  it("writes a polite message with shop name, trays and value", () => {
    const msg = reminderMessage(cust({}), settings);
    expect(msg).toContain("مرحباً أحمد، معك حلويات الشام.");
    expect(msg).toContain("لديك 6 صواني بسبوسة بقيمة £60 لم تُرجع بعد");
    const link = whatsappLink(cust({}), settings);
    expect(link.startsWith("https://wa.me/447700900123?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(msg);
  });
});

describe("Arabic formatting", () => {
  it("pluralises trays and days", () => {
    expect([1, 2, 3, 10, 11].map(trays)).toEqual(["صينية واحدة", "صينيتان", "3 صواني", "10 صواني", "11 صينية"]);
    expect([0, 1, 2, 5, 12].map(agoDays)).toEqual(["اليوم", "أمس", "منذ يومين", "منذ 5 أيام", "منذ 12 يوماً"]);
    expect(daysCount(7)).toBe("7 أيام");
  });

  it("computes local day/weekday in the app timezone", () => {
    // 23:30 UTC on Sat 26 Sep 2026 is already Sunday 00:30 in London (BST).
    const late = new Date("2026-09-26T23:30:00Z");
    expect(todayLocal("Europe/London", late)).toBe("2026-09-27");
    expect(weekdayLocal("Europe/London", late)).toBe(0);
    expect(dayLabel("2026-09-24", "Europe/London", now)).toBe("اليوم");
    expect(dayLabel("2026-09-23", "Europe/London", now)).toBe("أمس");
  });
});
