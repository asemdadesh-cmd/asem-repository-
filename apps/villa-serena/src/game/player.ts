// The person you play: the avatar, its physical body (character controller)
// and what it is doing — standing, sitting on a seat (which may be moving:
// buggy, boat, swing), carrying something.
import * as THREE from 'three';
import { Avatar, type AvatarId, type Emote, type MoveMode } from '../player/avatar.ts';
import type { CharacterController } from '../player/controller.ts';
import type { SeatSpot } from '../world/World.ts';
import type { Held } from './props.ts';

const HIP_CLEAR = 0.1; // hip joint height above the seat surface

/** Where an avatar's root goes so its hips sit on a seat frame. */
export function seatPose(avatar: Avatar, frame: THREE.Matrix4, outPos: THREE.Vector3, outQuat: THREE.Quaternion) {
  const s = new THREE.Vector3();
  frame.decompose(outPos, outQuat, s);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(outQuat);
  const hips = avatar.sitHips.clone().applyQuaternion(outQuat);
  outPos.addScaledVector(up, HIP_CLEAR).sub(hips);
}

export class LocalPlayer {
  seat: SeatSpot | null = null;
  held: Held | null = null;
  private seatBlend = 0;
  private from = new THREE.Vector3();
  private fromQ = new THREE.Quaternion();
  readonly renderPos = new THREE.Vector3();
  readonly renderQuat = new THREE.Quaternion();
  emote: { e: Emote; seed: number; seq: number } | null = null;
  private emoteSeq = 0;
  lookYaw = 0;
  kickAt = -1;

  constructor(
    readonly id: string,
    public name: string,
    readonly avatarId: AvatarId,
    readonly avatar: Avatar,
    readonly ctrl: CharacterController,
  ) {}

  get mode(): MoveMode {
    if (this.seat) return this.seat.kind === 'driver' ? 'drive' : 'sit';
    return this.ctrl.mode;
  }

  /** Feet position (render-interpolated). */
  get position(): THREE.Vector3 {
    return this.renderPos;
  }

  /** Feet position for gameplay queries: the simulation's latest state. */
  get feet(): THREE.Vector3 {
    return this.seat ? this.renderPos : this.ctrl.position;
  }

  play(e: Emote, loop = false) {
    const seed = Math.floor(Math.random() * 1000);
    this.avatar.play(e, { seed, loop });
    this.emote = { e, seed, seq: ++this.emoteSeq };
  }

  sit(seat: SeatSpot) {
    this.from.copy(this.renderPos);
    this.fromQ.copy(this.renderQuat);
    this.seat = seat;
    this.seatBlend = 0;
    this.ctrl.setEnabled(false);
  }

  stand(at: THREE.Vector3, yaw: number) {
    this.seat = null;
    this.ctrl.setEnabled(true);
    this.ctrl.teleport(at, yaw);
    this.avatar.pose.recline = 0;
    this.avatar.pose.steer = 0;
    this.avatar.pose.row = 0;
  }

  /** Per render frame, after physics. */
  update(dt: number, alpha: number) {
    const root = this.avatar.root;
    if (this.seat) {
      const f = this.seat.frame(new THREE.Matrix4());
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      seatPose(this.avatar, f, p, q);
      this.seatBlend = Math.min(1, this.seatBlend + dt / 0.45);
      const k = THREE.MathUtils.smoothstep(this.seatBlend, 0, 1);
      this.renderPos.lerpVectors(this.from, p, k);
      this.renderQuat.slerpQuaternions(this.fromQ, q, k);
      this.avatar.pose.recline = this.seat.kind === 'lounger' ? 1 : 0;
    } else {
      this.ctrl.renderPosition(alpha, this.renderPos);
      this.renderQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.ctrl.renderYaw(alpha));
    }
    root.position.copy(this.renderPos);
    root.quaternion.copy(this.renderQuat);
    this.avatar.pose.carry = this.held ? 1 : 0;
    const speed = this.seat ? 0 : this.ctrl.speed;
    // moving cancels full-body emotes (dances, bows), not waves
    if (this.avatar.emote && speed > 0.6 && !['wave', 'yes', 'throw', 'interact', 'jump', 'land'].includes(this.avatar.emote)) this.avatar.stopEmote();
    this.avatar.update(dt, { speed, mode: this.mode, lookYaw: this.lookYaw });
  }

  /** Heading of the body (rad, 0 = +Z). */
  get yaw(): number {
    if (this.seat) {
      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.renderQuat);
      return Math.atan2(f.x, f.z);
    }
    return this.ctrl.yaw;
  }
}
