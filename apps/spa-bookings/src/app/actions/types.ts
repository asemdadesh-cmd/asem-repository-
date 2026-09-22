export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; field?: string };

export const idle: ActionResult = { ok: true };
