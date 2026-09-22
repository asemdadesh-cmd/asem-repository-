"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NAME_COOKIE } from "@/lib/identity";
import type { ActionResult } from "./types";

/* -------------------------------------------------------------------------- */
/* "Who is using this phone"                                                   */
/* -------------------------------------------------------------------------- */
export async function setMyName(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const store = await cookies();

  if (!name) {
    store.delete(NAME_COOKIE);
  } else {
    store.set(NAME_COOKIE, name, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, message: name ? `This phone is ${name}.` : "Name cleared." };
}

/* -------------------------------------------------------------------------- */
/* Staff names                                                                 */
/* -------------------------------------------------------------------------- */
export async function addStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Type a name.", field: "name" };
  if (name.length > 60) return { ok: false, error: "That name is too long.", field: "name" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").insert({ name });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That name is already on the list.", field: "name" };
    }
    console.error("[addStaff]", error.message);
    return { ok: false, error: "Couldn't add them. Try again." };
  }

  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true, message: `${name} added.` };
}

export async function toggleStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("staff_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return { ok: false, error: "Missing person." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_members")
    .update({ is_active: !isActive })
    .eq("id", id);

  if (error) {
    console.error("[toggleStaff]", error.message);
    return { ok: false, error: "Couldn't update that. Try again." };
  }

  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true, message: isActive ? "Removed from the list." : "Added back." };
}

/* -------------------------------------------------------------------------- */
/* Apartments                                                                  */
/* -------------------------------------------------------------------------- */
export async function addApartment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
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
