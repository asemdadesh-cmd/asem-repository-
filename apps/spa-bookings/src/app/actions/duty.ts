"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Puts a name on duty for a day, or clears the day when no name is given. */
export async function setDuty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const dutyDate = String(formData.get("duty_date") ?? "");
  const staffName = String(formData.get("staff_name") ?? "").trim();
  if (!DATE_PATTERN.test(dutyDate)) return { ok: false, error: "Pick a valid date." };

  const supabase = await createClient();

  const { error } = staffName
    ? await supabase
        .from("duty_shifts")
        .upsert({ duty_date: dutyDate, staff_name: staffName }, { onConflict: "duty_date" })
    : await supabase.from("duty_shifts").delete().eq("duty_date", dutyDate);

  if (error) {
    console.error("[setDuty]", error.message);
    return { ok: false, error: "Couldn't update the rota. Try again." };
  }

  revalidatePath("/team");
  return { ok: true, message: staffName ? "Duty rota updated." : "Day cleared." };
}
