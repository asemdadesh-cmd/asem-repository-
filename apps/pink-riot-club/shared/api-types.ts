import type { GameKind, Seat } from './world.ts';

export const CHARACTER_IDS = [
  'asem',
  'yasso',
  'duck',
  'cat',
  'beaver',
  'captain',
  'yasso-kaftan',
  'teddy',
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface SeatView {
  seat: Seat;
  name: string;
  character: CharacterId;
  online: boolean; // heartbeat within the lease window
  lastSeen: number;
}

export interface GameScore {
  round: number; // 1-based, the round currently being played
  scores: [number, number]; // [seat1, seat2] in the current round
  roundsWon: [number, number];
  lastWinner: Seat | null;
  lastRoundEndedAt: number | null;
  acceptedEvents: number;
}

export interface RoomState {
  code: string;
  seats: SeatView[];
  football: GameScore;
  pool: GameScore;
  canvasEpoch: number;
  serverTime: number;
  version: number; // monotonic-ish: sum of accepted events + seat changes
}

export interface JoinResponse {
  ok: true;
  code: string;
  seat: Seat;
  token: string;
  topic: string; // realtime channel id (secret)
  key: string; // base64 AES-256-GCM room key (secret)
  state: RoomState;
  reclaimed: boolean;
}

export interface ScoreRequest {
  code: string;
  token: string;
  game: GameKind;
  eventId: string;
  /** football: the seat credited with the goal. pool: ignored (thrower = caller). */
  scorer?: Seat;
  /** pool: thrower + target positions at hit time (validated against the pool). */
  from?: [number, number];
  to?: [number, number];
}

export interface ScoreResponse {
  ok: true;
  accepted: boolean;
  reason?: 'duplicate' | 'rate-limited' | 'opponent-offline' | 'round-break' | 'invalid';
  roundEnded?: { game: GameKind; winner: Seat; round: number };
  state: RoomState;
}

export interface Stroke {
  id: string;
  seat: Seat;
  color: string; // #rrggbb
  size: number; // px in canvas space
  erase?: boolean;
  ts?: number; // client time the stroke started (render order)
  pts: number[]; // flat [x0,y0,x1,y1,...] integers in canvas space
}

export interface CanvasResponse {
  ok: true;
  epoch: number;
  strokes: Stroke[];
}

export interface ApiError {
  ok: false;
  error: string;
  message: string;
}

export const CANVAS_W = 1600;
export const CANVAS_H = 1200;
