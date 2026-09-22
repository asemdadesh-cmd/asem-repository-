import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingWithRelations } from "@/lib/types";

/** Every join the booking UI needs, in one place so the shapes stay in sync. */
export const BOOKING_SELECT = `
  *,
  apartment:apartments!bookings_apartment_id_fkey(id, name),
  created_by_profile:profiles!bookings_created_by_fkey(id, full_name, email),
  confirmed_by_profile:profiles!bookings_confirmed_by_fkey(id, full_name, email),
  price_set_by_profile:profiles!bookings_price_set_by_fkey(id, full_name, email),
  spa_ready_by_profile:profiles!bookings_spa_ready_by_fkey(id, full_name, email)
`;

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
