"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, displayName } from "@/lib/auth";
import { notifyUsers } from "@/lib/push";
import { formatDayShort } from "@/lib/time";
import { publicEnv } from "@/lib/env";
import type { ActionResult } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sets who is on duty for a day. Admins can assign anyone; staff can only
 * put themselves down (and only where the day is still free — RLS enforces
 * that they cannot overwrite an existing assignment).
 */
export async function setDuty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session expired. Sign in again." };

  const dutyDate = String(formData.get("duty_date") ?? "");
  const userId = String(formData.get("user_id") ?? "");

  if (!DATE_PATTERN.test(dutyDate)) return { ok: false, error: "Pick a valid date." };

  const supabase = await createClient();
  const isAdmin = session.profile.role === "admin";

  // "Nobody on duty" — admin only.
  if (!userId) {
    if (!isAdmin) return { ok: false, error: "Only admins can clear the duty rota." };
    const { error } = await supabase.from("duty_shifts").delete().eq("duty_date", dutyDate);
    if (error) return { ok: false, error: "Couldn't clear that day. Try again." };
    revalidatePath("/team");
    return { ok: true, message: "Duty cleared." };
  }

  if (!isAdmin && userId !== session.userId) {
    return { ok: false, error: "You can only put yourself on duty." };
  }

  const { error } = isAdmin
    ? await supabase
        .from("duty_shifts")
        .upsert(
          { duty_date: dutyDate, user_id: userId, assigned_by: session.userId },
          { onConflict: "duty_date" },
        )
    : await supabase
        .from("duty_shifts")
        .insert({ duty_date: dutyDate, user_id: userId, assigned_by: session.userId });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Someone is already on duty that day — ask an admin to change it." };
    }
    console.error("[setDuty]", error.message);
    return { ok: false, error: "Couldn't update the rota. Try again." };
  }

  if (userId !== session.userId) {
    await notifyUsers([userId], {
      kind: "duty_assigned",
      title: `You're on spa duty ${formatDayShort(dutyDate)}`,
      body: `${displayName(session.profile)} put you on duty. You'll get the switch-on reminders that day.`,
      url: `${publicEnv.appUrl}/team`,
    });
  }

  revalidatePath("/team");
  revalidatePath("/calendar");
  return { ok: true, message: "Duty rota updated." };
}
