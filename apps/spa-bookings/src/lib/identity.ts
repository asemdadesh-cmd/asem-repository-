import { cookies } from "next/headers";

/**
 * There are no accounts. Each phone picks a staff name once and it is kept in a
 * cookie, so actions can record who did them ("Maria changed the code").
 * It is attribution, not security: anyone can pick any name.
 */
export const NAME_COOKIE = "spa_name";

export async function getMyName(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(NAME_COOKIE)?.value?.trim();
  return value ? value.slice(0, 60) : null;
}

/** For activity text: the chosen name, or a neutral fallback. */
export async function actorName(): Promise<string> {
  return (await getMyName()) ?? "Someone";
}
