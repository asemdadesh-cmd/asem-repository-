export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Apartment {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  apartment_id: string;
  guest_name: string;
  guest_contact: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  price_pence: number | null;
  price_set_at: string | null;
  price_set_by_name: string | null;
  created_by_name: string | null;
  confirmed_at: string | null;
  confirmed_by_name: string | null;
  cancelled_at: string | null;
  cancelled_by_name: string | null;
  cancel_reason: string | null;
  spa_ready_at: string | null;
  spa_ready_by_name: string | null;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  apartment: Pick<Apartment, "id" | "name"> | null;
}

export interface LockboxCode {
  id: string;
  code: string;
  note: string | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface DutyShift {
  id: string;
  duty_date: string;
  staff_name: string | null;
  created_at: string;
}
