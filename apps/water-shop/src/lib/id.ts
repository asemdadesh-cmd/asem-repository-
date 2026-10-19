/** Immutable, client-generated ids (UUID v4) make offline sync idempotent. */
export const newId = (): string => crypto.randomUUID();
