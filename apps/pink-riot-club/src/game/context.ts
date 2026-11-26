import type * as THREE from 'three';
import type { RoomSession } from '../net/session.ts';
import type { Effects } from './effects.ts';
import type { Avatar } from './Avatar.ts';
import type { World } from '../world/World.ts';
import type { Seat } from '../../shared/world.ts';

export interface Hud {
  toast(text: string, kind?: 'info' | 'good' | 'warn'): void;
  banner(title: string, sub?: string, emoji?: string): void;
  replyPrompt(text: string, onReply: () => void, seconds?: number): void;
}

export interface GameCtx {
  scene: THREE.Scene;
  world: World;
  effects: Effects;
  session: RoomSession | null; // null in solo preview
  local: Avatar;
  remote: Avatar | null;
  /** Remote avatar's horizontal velocity (for ball dribbling on the host). */
  remoteVel: THREE.Vector3;
  localVel: THREE.Vector3;
  mySeat: Seat;
  peerOnline: () => boolean;
  hud: Hud;
  nameOf: (seat: Seat) => string;
  now: () => number;
}

export function rid(prefix = ''): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return prefix + [...a].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 10);
}
