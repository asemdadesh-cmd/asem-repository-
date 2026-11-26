// Deterministic scoring: every score attempt is stored as its own immutable
// key, and the score is recomputed by replaying all keys in timestamp order.
// Concurrent writes therefore can't lose updates, and duplicates/rate limits
// are judged identically no matter which request computes the state.

import {
  FOOTBALL_TARGET,
  GOAL_MIN_INTERVAL_MS,
  POOL_TARGET,
  ROUND_BREAK_MS,
  SPLASH_MIN_INTERVAL_MS,
  type GameKind,
  type Seat,
} from '../shared/world.ts';
import type { GameScore } from '../shared/api-types.ts';

export interface ScoreEvent {
  ts: number;
  scorer: Seat;
  reporter: Seat;
  id: string;
}

export type Verdict = 'accepted' | 'duplicate' | 'rate-limited' | 'round-break';

export interface ReplayResult extends GameScore {
  verdicts: Map<string, Verdict>; // first occurrence of each id
  /** The exact event that "owns" each id (earliest ts, then lowest reporter). */
  owners: Map<string, ScoreEvent>;
  roundEnders: Map<string, { winner: Seat; round: number }>;
}

const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,48}$/;

export function isValidEventId(id: unknown): id is string {
  return typeof id === 'string' && EVENT_ID_RE.test(id);
}

export function eventKey(prefix: string, e: ScoreEvent): string {
  return `${prefix}${String(e.ts).padStart(13, '0')}-${e.scorer}-${e.reporter}-${e.id}`;
}

export function parseEventKey(key: string): ScoreEvent | null {
  const tail = key.slice(key.lastIndexOf('/') + 1);
  const m = /^(\d{13})-([12])-([12])-([A-Za-z0-9_-]{1,48})$/.exec(tail);
  if (!m) return null;
  return { ts: Number(m[1]), scorer: Number(m[2]) as Seat, reporter: Number(m[3]) as Seat, id: m[4] };
}

export function targetFor(game: GameKind): number {
  return game === 'football' ? FOOTBALL_TARGET : POOL_TARGET;
}

export function replay(game: GameKind, events: ScoreEvent[]): ReplayResult {
  const sorted = [...events].sort(
    (a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || a.reporter - b.reporter,
  );
  const target = targetFor(game);
  const verdicts = new Map<string, Verdict>();
  const owners = new Map<string, ScoreEvent>();
  const roundEnders = new Map<string, { winner: Seat; round: number }>();
  let round = 1;
  let scores: [number, number] = [0, 0];
  const roundsWon: [number, number] = [0, 0];
  let lastWinner: Seat | null = null;
  let lastRoundEndedAt: number | null = null;
  let accepted = 0;
  let lastAny = -Infinity;
  const lastBy: Record<Seat, number> = { 1: -Infinity, 2: -Infinity };

  for (const e of sorted) {
    if (verdicts.has(e.id)) continue; // later copies of the same id are ignored entirely
    owners.set(e.id, e);
    if (lastRoundEndedAt !== null && e.ts - lastRoundEndedAt < ROUND_BREAK_MS) {
      verdicts.set(e.id, 'round-break');
      continue;
    }
    const tooSoon =
      game === 'football'
        ? e.ts - lastAny < GOAL_MIN_INTERVAL_MS
        : e.ts - lastBy[e.scorer] < SPLASH_MIN_INTERVAL_MS;
    if (tooSoon) {
      verdicts.set(e.id, 'rate-limited');
      continue;
    }
    verdicts.set(e.id, 'accepted');
    accepted++;
    lastAny = e.ts;
    lastBy[e.scorer] = e.ts;
    scores[e.scorer - 1]++;
    if (scores[e.scorer - 1] >= target) {
      roundsWon[e.scorer - 1]++;
      lastWinner = e.scorer;
      lastRoundEndedAt = e.ts;
      roundEnders.set(e.id, { winner: e.scorer, round });
      round++;
      scores = [0, 0];
      lastAny = -Infinity;
      lastBy[1] = lastBy[2] = -Infinity;
    }
  }

  return {
    round,
    scores,
    roundsWon,
    lastWinner,
    lastRoundEndedAt,
    acceptedEvents: accepted,
    verdicts,
    owners,
    roundEnders,
  };
}
