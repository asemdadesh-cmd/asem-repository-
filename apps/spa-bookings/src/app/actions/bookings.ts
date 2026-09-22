"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, displayName } from "@/lib/auth";
import { notifyUsers, teamUserIds } from "@/lib/push";
import { formatDayShort, formatTimeRange, londonDateKey, londonWallClockToUtc } from "@/lib/time";
import { publicEnv } from "@/lib/env";
import { formatPence, parsePoundsToPence } from "@/lib/money";
import type { ActionResult } from "./types";

const OVERLAP_VIOLATION = "23P01";
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(error: string, field?: string): ActionResult {
  return { ok: false, error, field };
}

function refresh(bookingId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/team");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

function bookingUrl(id: string) {
  return `${publicEnv.appUrl}/bookings/${id}`;
}

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */
export async function createBooking(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const apartmentId = String(formData.get("apartment_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestContact = String(formData.get("guest_contact") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const confirmNow = formData.get("confirm_now") === "on";
  const price = parsePoundsToPence(String(formData.get("price") ?? ""));

  if (!apartmentId) return fail("Pick which apartment the guest is in.", "apartment_id");
  if (!guestName) return fail("Add the guest's name.", "guest_name");
  if (guestName.length > 120) return fail("That name is too long.", "guest_name");
  if (!DATE_PATTERN.test(date)) return fail("Pick a date.", "date");
  if (!TIME_PATTERN.test(startTime)) return fail("Pick a start time.", "start_time");
  if (!TIME_PATTERN.test(endTime)) return fail("Pick an end time.", "end_time");
  if (notes.length > 1000) return fail("Notes are limited to 1000 characters.", "notes");
  if (price === "invalid") {
    return fail("Enter the price as a number, e.g. 45 or 45.50.", "price");
  }

  const startsAt = londonWallClockToUtc(date, startTime);
  // An end time earlier than the start means the slot runs past midnight.
  const endsAt =
    endTime <= startTime
      ? londonWallClockToUtc(nextDay(date), endTime)
      : londonWallClockToUtc(date, endTime);

  if (endsAt <= startsAt) return fail("The end time must be after the start time.", "end_time");
  if (endsAt.getTime() - startsAt.getTime() > 6 * 3600_000) {
    return fail("Slots can't be longer than 6 hours.", "end_time");
  }
  if (startsAt.getTime() < Date.now() - 24 * 3600_000) {
    return fail("That date is more than a day in the past.", "date");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      apartment_id: apartmentId,
      guest_name: guestName,
      guest_contact: guestContact || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: notes || null,
      price_pence: price,
      price_set_by: price === null ? null : session.userId,
      price_set_at: price === null ? null : new Date().toISOString(),
      status: confirmNow ? "confirmed" : "pending",
      created_by: session.userId,
      confirmed_by: confirmNow ? session.userId : null,
      confirmed_at: confirmNow ? new Date().toISOString() : null,
    })
    .select("id, starts_at, ends_at, guest_name, price_pence")
    .single<{
      id: string;
      starts_at: string;
      ends_at: string;
      guest_name: string;
      price_pence: number | null;
    }>();

  if (error) {
    if (error.code === OVERLAP_VIOLATION) {
      return fail(
        "That clashes with another booking — the spa is already taken for part of that slot.",
        "start_time",
      );
    }
    console.error("[createBooking]", error.message);
    return fail("Couldn't save the booking. Try again.");
  }

  await notifyUsers(await teamUserIds(session.userId), {
    kind: "booking_created",
    title: confirmNow ? "New spa booking confirmed" : "New spa booking to confirm",
    body: `${data.guest_name} · ${formatDayShort(londonDateKey(data.starts_at))} ${formatTimeRange(
      data.starts_at,
      data.ends_at,
    )}${priceSuffix(data.price_pence)}${
      confirmNow ? "" : " — needs confirming"
    }. Added by ${displayName(session.profile)}.`,
    url: bookingUrl(data.id),
    bookingId: data.id,
  });

  refresh(data.id);
  return { ok: true, message: confirmNow ? "Booking confirmed." : "Booking added." };
}

function nextDay(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Confirm                                                                     */
/* -------------------------------------------------------------------------- */
export async function confirmBooking(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const id = String(formData.get("booking_id") ?? "");
  if (!id) return fail("Missing booking.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_by: session.userId,
      confirmed_at: new Date().toISOString(),
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
    })
    .eq("id", id)
    .neq("status", "confirmed")
    .select("id, guest_name, starts_at, ends_at")
    .maybeSingle<{ id: string; guest_name: string; starts_at: string; ends_at: string }>();

  if (error) {
    if (error.code === OVERLAP_VIOLATION) {
      return fail("Another booking now occupies that slot, so this one can't be confirmed.");
    }
    console.error("[confirmBooking]", error.message);
    return fail("Couldn't confirm the booking. Try again.");
  }
  if (!data) return fail("That booking is already confirmed.");

  await notifyUsers(await teamUserIds(session.userId), {
    kind: "booking_confirmed",
    title: "Spa booking confirmed",
    body: `${data.guest_name} · ${formatDayShort(londonDateKey(data.starts_at))} ${formatTimeRange(
      data.starts_at,
      data.ends_at,
    )}. Confirmed by ${displayName(session.profile)}.`,
    url: bookingUrl(data.id),
    bookingId: data.id,
  });

  refresh(id);
  return { ok: true, message: "Booking confirmed." };
}

/* -------------------------------------------------------------------------- */
/* Cancel                                                                      */
/* -------------------------------------------------------------------------- */
export async function cancelBooking(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const id = String(formData.get("booking_id") ?? "");
  const reason = String(formData.get("cancel_reason") ?? "").trim();
  if (!id) return fail("Missing booking.");
  if (reason.length > 300) return fail("Keep the reason under 300 characters.", "cancel_reason");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: session.userId,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    })
    .eq("id", id)
    .neq("status", "cancelled")
    .select("id, guest_name, starts_at, ends_at")
    .maybeSingle<{ id: string; guest_name: string; starts_at: string; ends_at: string }>();

  if (error) {
    console.error("[cancelBooking]", error.message);
    return fail("Couldn't cancel the booking. Try again.");
  }
  if (!data) return fail("That booking is already cancelled.");

  await notifyUsers(await teamUserIds(session.userId), {
    kind: "booking_cancelled",
    title: "Spa booking cancelled",
    body: `${data.guest_name} · ${formatDayShort(londonDateKey(data.starts_at))} ${formatTimeRange(
      data.starts_at,
      data.ends_at,
    )}. Cancelled by ${displayName(session.profile)}${reason ? ` — ${reason}` : ""}.`,
    url: bookingUrl(data.id),
    bookingId: data.id,
  });

  refresh(id);
  return { ok: true, message: "Booking cancelled." };
}

/* -------------------------------------------------------------------------- */
/* Mark the spa ready                                                          */
/* -------------------------------------------------------------------------- */
export async function markSpaReady(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const id = String(formData.get("booking_id") ?? "");
  if (!id) return fail("Missing booking.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ spa_ready_at: new Date().toISOString(), spa_ready_by: session.userId })
    .eq("id", id)
    .is("spa_ready_at", null)
    .select("id, guest_name, starts_at, ends_at")
    .maybeSingle<{ id: string; guest_name: string; starts_at: string; ends_at: string }>();

  if (error) {
    console.error("[markSpaReady]", error.message);
    return fail("Couldn't update the booking. Try again.");
  }
  if (!data) return fail("Someone already marked this one ready.");

  await notifyUsers(await teamUserIds(session.userId), {
    kind: "spa_ready",
    title: "Spa is on and heating",
    body: `${displayName(session.profile)} switched the spa on for ${data.guest_name} · ${formatTimeRange(
      data.starts_at,
      data.ends_at,
    )}.`,
    url: bookingUrl(data.id),
    bookingId: data.id,
  });

  refresh(id);
  return { ok: true, message: "Team notified — spa marked ready." };
}

/* -------------------------------------------------------------------------- */
/* Undo "ready" (mistaken taps happen)                                         */
/* -------------------------------------------------------------------------- */
export async function undoSpaReady(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const id = String(formData.get("booking_id") ?? "");
  if (!id) return fail("Missing booking.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ spa_ready_at: null, spa_ready_by: null })
    .eq("id", id);

  if (error) {
    console.error("[undoSpaReady]", error.message);
    return fail("Couldn't undo that. Try again.");
  }

  refresh(id);
  return { ok: true, message: "Marked as not ready." };
}

/* -------------------------------------------------------------------------- */
/* Agreed price                                                                */
/* -------------------------------------------------------------------------- */
export async function setBookingPrice(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Your session expired. Sign in again.");

  const id = String(formData.get("booking_id") ?? "");
  if (!id) return fail("Missing booking.");

  const price = parsePoundsToPence(String(formData.get("price") ?? ""));
  if (price === "invalid") {
    return fail("Enter the price as a number, e.g. 45 or 45.50.", "price");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      price_pence: price,
      price_set_by: price === null ? null : session.userId,
      price_set_at: price === null ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, guest_name, price_pence")
    .maybeSingle<{ id: string; guest_name: string; price_pence: number | null }>();

  if (error) {
    console.error("[setBookingPrice]", error.message);
    return fail("Couldn't save the price. Try again.");
  }
  if (!data) return fail("That booking no longer exists.");

  await notifyUsers(await teamUserIds(session.userId), {
    kind: "booking_price",
    title: price === null ? "Price cleared" : "Spa price agreed",
    body:
      price === null
        ? `${displayName(session.profile)} cleared the agreed price for ${data.guest_name}.`
        : `${data.guest_name} · ${formatPence(price)} agreed by ${displayName(session.profile)}.`,
    url: bookingUrl(data.id),
    bookingId: data.id,
  });

  refresh(id);
  return {
    ok: true,
    message: price === null ? "Price cleared." : `Price set to ${formatPence(price)}.`,
  };
}

/** `" · £45"`, or nothing when no price has been agreed. */
function priceSuffix(pence: number | null): string {
  const formatted = formatPence(pence);
  return formatted ? ` · ${formatted}` : "";
}
