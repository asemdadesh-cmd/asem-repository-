// The other player as seen on this screen: their avatar driven by network
// snapshots (interpolated ~100 ms in the past so motion stays smooth through
// jitter), a kinematic capsule so you bump into each other, and their seat.
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type Physics } from '../engine/physics.ts';
import { Avatar, type AvatarId, type Emote, type MoveMode, type PoseInput } from '../player/avatar.ts';
import { CAPSULE } from '../player/controller.ts';
import type { SeatSpot } from '../world/World.ts';
import { seatPose } from './player.ts';

export interface PlayerSnapshot {
  t: number; // sender clock (s)
  p: [number, number, number];
  y: number;
  m: MoveMode;
  v: number;
  seat: string | null;
  held: string | null;
  e?: [Emote, number, number]; // emote, seed, sequence
  pose?: [number, number, number, number, number, number];
}

const DELAY = 0.11;

export class RemotePlayer {
  avatar: Avatar | null = null;
  private buf: PlayerSnapshot[] = [];
  private offset: number | null = null;
  private body: RAPIER.RigidBody;
  private lastEmote = -1;
  readonly position = new THREE.Vector3();
  yaw = 0;
  seat: string | null = null;
  held: string | null = null;
  mode: MoveMode = 'ground';
  lastSeen = performance.now();
  private loading: Promise<void>;

  constructor(
    readonly id: string,
    public name: string,
    public avatarId: AvatarId,
    private scene: THREE.Object3D,
    private physics: Physics,
  ) {
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -100, 0));
    physics.world.createCollider(RAPIER.ColliderDesc.capsule(CAPSULE.half, CAPSULE.radius).setCollisionGroups(groups(GROUP.PLAYER, 0xffff)), this.body);
    this.loading = this.load();
  }

  private async load() {
    const a = await Avatar.create(this.avatarId);
    if (this.avatar) this.avatar.dispose();
    this.avatar = a;
    this.scene.add(a.root);
  }

  async setAvatar(id: AvatarId) {
    if (id === this.avatarId) return;
    this.avatarId = id;
    await this.loading;
    this.loading = this.load();
  }

  push(s: PlayerSnapshot) {
    const now = performance.now() / 1000;
    const d = now - s.t;
    // lowest observed (receive − send) ≈ clock offset + one-way latency; relax slowly
    this.offset = this.offset === null ? d : Math.min(d, this.offset + 0.002);
    const last = this.buf[this.buf.length - 1];
    if (last && s.t <= last.t) return;
    this.buf.push(s);
    if (this.buf.length > 30) this.buf.shift();
    this.lastSeen = performance.now();
  }

  update(dt: number, seats: Map<string, SeatSpot>) {
    if (!this.buf.length || this.offset === null) return;
    const rt = performance.now() / 1000 - this.offset - DELAY;
    let a = this.buf[0];
    let b = this.buf[this.buf.length - 1];
    for (let i = 0; i < this.buf.length - 1; i++) {
      if (this.buf[i].t <= rt && this.buf[i + 1].t >= rt) {
        a = this.buf[i];
        b = this.buf[i + 1];
        break;
      }
    }
    const span = b.t - a.t;
    const k = span > 1e-4 ? THREE.MathUtils.clamp((rt - a.t) / span, 0, 1.15) : 1;
    this.position.set(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k);
    let dy = b.y - a.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw = a.y + dy * Math.min(1, k);
    const cur = k < 0.5 ? a : b;
    this.mode = cur.m;
    this.held = cur.held;
    // their seat (the other client sets the seat as occupied)
    const prevSeat = this.seat;
    this.seat = cur.seat;
    if (prevSeat !== this.seat) {
      if (prevSeat) {
        const s = seats.get(prevSeat);
        if (s && s.occupied === this.id) s.occupied = null;
      }
    }
    const seat = this.seat ? seats.get(this.seat) : undefined;
    if (seat) seat.occupied = this.id;

    // collision capsule (off while seated)
    const col = this.body.collider(0);
    col.setEnabled(!seat);
    this.body.setNextKinematicTranslation({ x: this.position.x, y: this.position.y + CAPSULE.half + CAPSULE.radius, z: this.position.z });

    const av = this.avatar;
    if (!av) return;
    if (seat) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      seatPose(av, seat.frame(new THREE.Matrix4()), p, q);
      av.root.position.copy(p);
      av.root.quaternion.copy(q);
    } else {
      av.root.position.copy(this.position);
      av.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    }
    // emotes: play each new one once (not the one in progress when we joined)
    const latest = this.buf[this.buf.length - 1];
    const seq = latest.e?.[2] ?? 0;
    if (this.lastEmote === -1) this.lastEmote = seq;
    else if (latest.e && seq !== this.lastEmote) {
      av.play(latest.e[0], { seed: latest.e[1] });
      this.lastEmote = seq;
    }
    const pose = cur.pose;
    const P: PoseInput = av.pose;
    if (pose) [P.carry, P.recline, P.steer, P.steerAngle, P.row, P.rowPhase] = pose;
    av.update(dt, { speed: cur.v, mode: this.mode });
  }

  /** estimated (local clock − sender clock), seconds */
  get clockOffset(): number | null {
    return this.offset;
  }

  get stale(): boolean {
    return performance.now() - this.lastSeen > 8000;
  }

  dispose() {
    this.avatar?.dispose();
    this.physics.world.removeRigidBody(this.body);
  }
}
