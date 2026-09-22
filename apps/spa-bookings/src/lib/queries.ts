import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingWithRelations } from "@/lib/types";

export const BOOKING_SELECT = `*, apartment:apartments!bookings_apartment_id_fkey(id, name)`;

export async function getBookingsBetween(
  supabase: SupabaseClient,
  fromISO: string,
  toISO: string,
): Promise<BookingWithRelations[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO)
    .order("starts_at", { ascending: true })
    .returns<BookingWithRelations[]>();

  if (error) {
    console.error("[getBookingsBetween]", error.message);
    return [];
  }
  return data ?? [];
}
