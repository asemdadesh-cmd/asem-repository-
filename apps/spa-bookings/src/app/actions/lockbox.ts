"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, displayName } from "@/lib/auth";
import { notifyUsers, teamUserIds } from "@/lib/push";
import { publicEnv } from "@/lib/env";
import type { ActionResult } from "./types";

export async function setLockboxCode(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session expired. Sign in again." };
  const canEdit =
    session.profile.role === "admin" || session.profile.can_edit_lockbox;
  if (!canEdit) {
    return { ok: false, error: "You don't have permission to change the lockbox code." };
  }

  const code = String(formData.get("code") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (code.length < 3 || code.length > 32) {
    return { ok: false, error: "The code needs to be between 3 and 32 characters.", field: "code" };
  }
  if (note.length > 500) {
    return { ok: false, error: "Keep the note under 500 characters.", field: "note" };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .rpc("current_lockbox_code")
    .maybeSingle<{ code: string; changed_at: string }>();

  if (current?.code === code) {
    return { ok: false, error: "That's already the code we have saved.", field: "code" };
  }

  const { error } = await supabase
    .from("lockbox_codes")
    .insert({ code, note: note || null, changed_by: session.userId });

  if (error) {
    console.error("[setLockboxCode]", error.message);
    return { ok: false, error: "Couldn't save it. Check your signal and try again." };
  }

  // The code itself is deliberately kept out of the notification body — push
  // messages surface on lock screens.
  await notifyUsers(await teamUserIds(session.userId), {
    kind: "lockbox_changed",
    title: "Lockbox code changed",
    body: `${displayName(session.profile)} rotated the lockbox code${
      note ? ` — ${note}` : ""
    }. Open the app to see the new one.`,
    url: `${publicEnv.appUrl}/lockbox`,
  });

  revalidatePath("/lockbox");
  return { ok: true, message: "Saved." };
}
