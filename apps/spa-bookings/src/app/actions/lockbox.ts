"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actorName, getMyName } from "@/lib/identity";
import { notifyPhones } from "@/lib/push";
import { publicEnv } from "@/lib/env";
import type { ActionResult } from "./types";

export async function setLockboxCode(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 3 || code.length > 32) {
    return { ok: false, error: "The code needs to be between 3 and 32 characters.", field: "code" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .rpc("current_lockbox_code")
    .maybeSingle<{ code: string; changed_at: string }>();

  if (current?.code === code) {
    return { ok: false, error: "That's already the code we have saved.", field: "code" };
  }

  const me = await getMyName();
  const { error } = await supabase
    .from("lockbox_codes")
    .insert({ code, changed_by_name: me });

  if (error) {
    console.error("[setLockboxCode]", error.message);
    return { ok: false, error: "Couldn't save it. Check your signal and try again." };
  }

  // The code itself stays out of the notification: those show on lock screens.
  await notifyPhones(
    { exceptName: me },
    {
      title: "Lockbox code changed",
      body: `${await actorName()} changed the lockbox code. Open the app to see the new one.`,
      url: `${publicEnv.appUrl}/lockbox`,
    },
  );

  revalidatePath("/lockbox");
  return { ok: true, message: "Saved." };
}
