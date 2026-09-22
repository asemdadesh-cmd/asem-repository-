"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import type { ActionResult } from "./types";
import type { UserRole } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type AdminGuard =
  | { ok: false; error: string }
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> };

async function requireAdminSession(): Promise<AdminGuard> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session expired. Sign in again." };
  if (session.profile.role !== "admin") return { ok: false, error: "Admins only." };
  return { ok: true, session };
}

/* -------------------------------------------------------------------------- */
/* Apartments                                                                  */
/* -------------------------------------------------------------------------- */
export async function addApartment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Give the apartment a name.", field: "name" };
  if (name.length > 60) return { ok: false, error: "That name is too long.", field: "name" };

  const supabase = await createClient();
  const { error } = await supabase.from("apartments").insert({ name });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "There's already an apartment with that name.", field: "name" };
    }
    console.error("[addApartment]", error.message);
    return { ok: false, error: "Couldn't add the apartment. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/bookings/new");
  return { ok: true, message: `${name} added.` };
}

export async function toggleApartment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const id = String(formData.get("apartment_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return { ok: false, error: "Missing apartment." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("apartments")
    .update({ is_active: !isActive })
    .eq("id", id);

  if (error) {
    console.error("[toggleApartment]", error.message);
    return { ok: false, error: "Couldn't update the apartment. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/bookings/new");
  return { ok: true, message: isActive ? "Apartment hidden." : "Apartment restored." };
}

/* -------------------------------------------------------------------------- */
/* Staff                                                                       */
/* -------------------------------------------------------------------------- */
export async function inviteStaff(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") as UserRole;

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }
  if (role !== "admin" && role !== "staff") {
    return { ok: false, error: "Pick a valid role.", field: "role" };
  }

  const supabase = await createClient();
  const { error: inviteError } = await supabase.from("staff_invites").upsert(
    { email, full_name: fullName, role, invited_by: guard.session.userId },
    { onConflict: "email" },
  );

  if (inviteError) {
    console.error("[inviteStaff] allowlist", inviteError.message);
    return { ok: false, error: "Couldn't record the invite. Try again." };
  }

  // The allowlist row above IS the invite: they can now sign in at the app's
  // login page with this email. The Admin API email is a courtesy on top, and
  // only possible when the service-role key is configured.
  const signInUrl = publicEnv.appUrl || "the app";
  const admin = tryCreateAdminClient();
  if (!admin) {
    revalidatePath("/team");
    return {
      ok: true,
      message: `${email} can now sign in at ${signInUrl} using this email.`,
    };
  }

  const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${publicEnv.appUrl}/auth/callback`,
    data: { full_name: fullName },
  });

  if (authError) {
    // Already registered, or email sending failed: either way they are on the
    // allowlist and can sign in themselves, so this is not a failure.
    console.error("[inviteStaff] invite email:", authError.message);
    revalidatePath("/team");
    return {
      ok: true,
      message: `${email} can now sign in at ${signInUrl} using this email.`,
    };
  }

  revalidatePath("/team");
  return { ok: true, message: `Invite sent to ${email}.` };
}

export async function setStaffRole(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!userId || (role !== "admin" && role !== "staff")) {
    return { ok: false, error: "Missing user or role." };
  }
  if (userId === guard.session.userId && role !== "admin") {
    return { ok: false, error: "You can't remove your own admin access." };
  }

  const supabase = await createClient();

  if (role === "staff") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "There must always be at least one admin." };
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    console.error("[setStaffRole]", error.message);
    return { ok: false, error: "Couldn't change that role. Try again." };
  }

  revalidatePath("/team");
  return { ok: true, message: "Role updated." };
}

export async function setStaffActive(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const userId = String(formData.get("user_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!userId) return { ok: false, error: "Missing user." };
  if (userId === guard.session.userId) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !isActive })
    .eq("id", userId);

  if (error) {
    console.error("[setStaffActive]", error.message);
    return { ok: false, error: "Couldn't update that account. Try again." };
  }

  revalidatePath("/team");
  return { ok: true, message: isActive ? "Access removed." : "Access restored." };
}

/* -------------------------------------------------------------------------- */
/* Own profile                                                                 */
/* -------------------------------------------------------------------------- */
export async function updateOwnProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session expired. Sign in again." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { ok: false, error: "Add your name.", field: "full_name" };
  if (fullName.length > 80) return { ok: false, error: "That name is too long.", field: "full_name" };
  if (phone.length > 40) return { ok: false, error: "That phone number is too long.", field: "phone" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", session.userId);

  if (error) {
    console.error("[updateOwnProfile]", error.message);
    return { ok: false, error: "Couldn't save your details. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true, message: "Saved." };
}

/* -------------------------------------------------------------------------- */
/* Lockbox access                                                              */
/* -------------------------------------------------------------------------- */
export async function setLockboxAccess(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdminSession();
  if (!guard.ok) return { ok: false, error: guard.error };

  const userId = String(formData.get("user_id") ?? "");
  const canEdit = formData.get("can_edit_lockbox") === "true";
  if (!userId) return { ok: false, error: "Missing user." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ can_edit_lockbox: !canEdit })
    .eq("id", userId);

  if (error) {
    console.error("[setLockboxAccess]", error.message);
    return { ok: false, error: "Couldn't update lockbox access. Try again." };
  }

  revalidatePath("/team");
  revalidatePath("/lockbox");
  return {
    ok: true,
    message: canEdit ? "Lockbox access removed." : "They can now change the lockbox code.",
  };
}
