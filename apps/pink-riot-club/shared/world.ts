// World layout + game rules shared by the client and the server.
// Units are metres. +X = east, -Z = north, Y = up.

export const FOOTBALL_TARGET = 3; // goals to win a football round
export const POOL_TARGET = 5; // splashes to win a pool battle
export const GOAL_MIN_INTERVAL_MS = 2500; // two goals closer than this = duplicate
export const SPLASH_MIN_INTERVAL_MS = 550; // per thrower
export const ROUND_BREAK_MS = 2500; // events right after a round ends are ignored
export const SEAT_LEASE_MS = 75_000; // a seat with no heartbeat for this long can be taken
export const PRESENCE_FRESH_MS = 45_000; // "opponent online" window for scoring

export const PITCH = {
  cx: 0,
  cz: -30,
  halfX: 17,
  halfZ: 10,
  goalHalfWidth: 2.9,
  goalHeight: 2.3,
  goalDepth: 2.2,
} as const;

export const POOL = {
  cx: 27,
  cz: 2,
  halfX: 8,
  halfZ: 4.5,
  waterY: -0.28,
  floorY: -1.75,
} as const;

export const STUDIO = { cx: -27, cz: 2 } as const;
export const GALLERY = { cx: -18, cz: 25 } as const;
export const BEACH_LOUNGE = { cx: 12, cz: 37 } as const;
export const SPAWN = { x: 0, z: -4.5 } as const;

export const WORLD_HALF = 50; // walkable square (minus coastline shaping)

export function inPool(x: number, z: number, margin = 0): boolean {
  return (
    Math.abs(x - POOL.cx) <= POOL.halfX + margin && Math.abs(z - POOL.cz) <= POOL.halfZ + margin
  );
}

export function onPitch(x: number, z: number, margin = 0): boolean {
  return (
    Math.abs(x - PITCH.cx) <= PITCH.halfX + margin && Math.abs(z - PITCH.cz) <= PITCH.halfZ + margin
  );
}

/** Seat 1 defends the west goal, seat 2 the east goal. */
export function goalOwnerForSide(side: 'west' | 'east'): 1 | 2 {
  return side === 'west' ? 1 : 2;
}

export type Seat = 1 | 2;
export type GameKind = 'football' | 'pool';

export const POIS = [
  { id: 'plaza', label: 'الساحة', emoji: '🌸', x: 0, z: -4.5 },
  { id: 'pitch', label: 'الملعب', emoji: '⚽', x: 0, z: -17 },
  { id: 'pool', label: 'المسبح', emoji: '🏊‍♀️', x: 27, z: 9.5 },
  { id: 'studio', label: 'المرسم', emoji: '🎨', x: -22, z: 6 },
  { id: 'gallery', label: 'المعرض', emoji: '🖼️', x: -18, z: 21 },
  { id: 'beach', label: 'البحر', emoji: '🌴', x: 9, z: 32 },
] as const;
