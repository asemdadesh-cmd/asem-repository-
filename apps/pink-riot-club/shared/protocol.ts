// Realtime messages exchanged between the two players over the relay.
// Every message is AES-GCM encrypted with the room key before it leaves the
// browser; relays only ever see ciphertext.

import type { CharacterId, RoomState, Stroke } from './api-types.ts';
import type { GameKind, Seat } from './world.ts';

export type AnimCode = 'idle' | 'walk' | 'run' | 'swim' | 'jump' | 'sit';
export type ActionKind =
  | 'bonk' // بضربك😂 foam-noodle bonk
  | 'splash' // throw water in the pool
  | 'kick'
  | 'laugh'
  | 'dance'
  | 'wave'
  | 'celebrate'
  | 'gandas' // يا قندس tease
  | 'reply' // لم روحك 🤣
  | 'blowkiss'; // 💋 a kiss blown through the air (needs no consent)

/** Moments that need both friends: always asked first, the friend can say no. */
export type PairKind = 'hug' | 'kiss' | 'highfive' | 'dance' | 'hands';

export type Msg =
  | { t: 'hello'; seat: Seat; name: string; ch: CharacterId; reply?: boolean }
  | {
      t: 'st';
      seat: Seat;
      p: [number, number, number];
      r: number; // yaw
      v: number; // horizontal speed (m/s)
      a: AnimCode;
      ts: number; // sender clock (ms)
    }
  | {
      t: 'ball';
      kid: string; // kickoff id
      host: Seat;
      p: [number, number, number];
      v: [number, number, number];
      ts: number;
      frozen?: boolean;
    }
  | { t: 'kick'; kid: string; imp: [number, number, number]; at: [number, number, number] }
  | { t: 'goal'; kid: string; scorer: Seat; side: 'west' | 'east' }
  | { t: 'handover'; to: Seat; kid: string; p: [number, number, number]; v: [number, number, number] }
  | { t: 'act'; kind: ActionKind; seat: Seat; target?: Seat; id: string; dir?: [number, number, number]; origin?: [number, number, number] }
  | { t: 'hit'; id: string; by: Seat; target: Seat; game: 'pool' }
  | { t: 'say'; seat: Seat; text: string }
  | { t: 'score'; game: GameKind; state: RoomState; winner?: Seat; round?: number }
  | { t: 'dr'; s: Stroke; done: boolean }
  | { t: 'undo'; id: string }
  | { t: 'clear'; epoch: number }
  | { t: 'cursor'; seat: Seat; x: number; y: number; on: boolean }
  | { t: 'pair'; op: 'ask'; id: string; kind: PairKind; from: Seat }
  | { t: 'pair'; op: 'no'; id: string; from: Seat }
  | { t: 'pair'; op: 'go'; id: string; kind: PairKind; from: Seat; at: [number, number, number]; yaw: number; seed: number }
  | { t: 'pair'; op: 'end'; id: string; from: Seat }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'bye'; seat: Seat };

export interface Envelope {
  f: string; // sender id (seat:nonce)
  n: number; // per-sender sequence number
  m: Msg;
}
