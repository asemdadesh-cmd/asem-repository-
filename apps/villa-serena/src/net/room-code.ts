// Private room codes: 12 characters from an alphabet without look-alikes
// (no I/L/1, O/0), ≈ 59 bits — the code is also the encryption secret.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A new private room code like "K7QM-2XDF-9RTA" (31¹² ≈ 2⁵⁹ possibilities). */
export function newRoomCode(): string {
  const r = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(r, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function normaliseCode(code: string): string | null {
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 12 || [...c].some((ch) => !ALPHABET.includes(ch))) return null;
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}
