export type UserRole = "admin" | "staff";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  created_by: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  spa_ready_at: string | null;
  spa_ready_by: string | null;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A booking joined with the names the UI actually renders. */
export interface BookingWithRelations extends Booking {
  apartment: Pick<Apartment, "id" | "name"> | null;
  created_by_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
  confirmed_by_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
  spa_ready_by_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface LockboxCode {
  id: string;
  code: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface LockboxCodeWithAuthor extends LockboxCode {
  changed_by_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface DutyShift {
  id: string;
  duty_date: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface DutyShiftWithProfile extends DutyShift {
  profile: Pick<Profile, "id" | "full_name" | "email" | "phone"> | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface StaffInvite {
  email: string;
  role: UserRole;
  full_name: string;
  invited_by: string | null;
  claimed_at: string | null;
  created_at: string;
}
