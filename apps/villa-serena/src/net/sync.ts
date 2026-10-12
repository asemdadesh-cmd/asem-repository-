// Keeps two (or more) players' worlds in step over the encrypted relay.
//
// People: each client sends its own player ~15×/s; the others interpolate.
// Physics: every movable body has exactly one simulating client. Whoever
// touches a thing (pushes, kicks, picks up, drives, sits on the swing) claims
// it and simulates it; everyone else shows it kinematically from that
// client's snapshots. Untouched bodies belong to the host (lowest id), so a
// late joiner snaps to the host's state. Sleeping bodies send nothing.
import * as THREE from 'three';
import { RAPIER } from '../engine/physics.ts';
import { AVATARS, type AvatarId } from '../player/avatars.ts';
import type { Game } from '../game/Game.ts';
import { RemotePlayer, type PlayerSnapshot } from '../game/remote.ts';
import type { DynamicProp } from '../world/World.ts';
import { Relay, type RelayStatus } from './relay.ts';

type BodyState = [string, number, number, number, number, number, number, number, number, ...number[]];

export type Msg =
  | { k: 'hi'; name: string; av: AvatarId; h: number; cyc: boolean; reply?: boolean }
  | { k: 'bye' }
  | ({ k: 'me' } & PlayerSnapshot)
  | { k: 'b'; t: number; l: BodyState[] }
  | { k: 'claim'; id: string }
  | { k: 'time'; h: number; cyc: boolean };

interface Syncable {
  id: string;
  body: RAPIER.RigidBody;
  owner: string;
  local: boolean;
  setLocal(local: boolean): void;
  extra?(): number[];
  applyExtra?(e: number[]): void;
  /** true while this client is holding/driving it (never give it away then) */
  busy?(): boolean;
  buf: Array<{ t: number; p: THREE.Vector3; q: THREE.Quaternion; sleep: boolean }>;
  from: string;
  reportedAsleep: boolean;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

const num = (v: unknown, lim = 1e4) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < lim;
const MODES = new Set(['ground', 'air', 'swim', 'sit', 'drive']);

/** Shape checks for everything that arrives over the relay. */
function valid(m: Msg): boolean {
  if (!m || typeof m !== 'object') return false;
  switch (m.k) {
    case 'hi':
      if (typeof m.name !== 'string' || !(m.av in AVATARS) || !num(m.h, 25)) return false;
      m.name = m.name.slice(0, 18).replace(/[\u0000-\u001f]/g, '') || 'Guest';
      return true;
    case 'me':
      return num(m.t, 1e9) && Array.isArray(m.p) && m.p.length === 3 && m.p.every((v) => num(v)) && num(m.y, 100) && MODES.has(m.m) && num(m.v, 100) && (m.seat === null || typeof m.seat === 'string') && (m.held === null || typeof m.held === 'string');
    case 'b':
      return num(m.t, 1e9) && Array.isArray(m.l) && m.l.length <= 80 && m.l.every((st) => Array.isArray(st) && typeof st[0] === 'string' && st.slice(1).every((v) => num(v)));
    case 'claim':
      return typeof m.id === 'string';
    case 'time':
      return num(m.h, 25) && typeof m.cyc === 'boolean';
    case 'bye':
      return true;
  }
  return false;
}

export class NetSync {
  readonly remotes = new Map<string, RemotePlayer>();
  relay: Relay<Msg> | null = null;
  status: RelayStatus | 'solo' = 'solo';
  readonly code: string | null;
  private bodies = new Map<string, Syncable>();
  private sendAcc = 0;
  private bodyAcc = 0;
  private hiAcc = 0;
  private tmpP = new THREE.Vector3();
  private tmpQ = new THREE.Quaternion();

  constructor(
    private game: Game,
    code: string | null,
  ) {
    this.code = code;
    for (const d of game.world.dynamics) this.addProp(d);
    const g = game;
    this.addVehicle('buggy', g.buggy.body, (l) => g.buggy.setLocal(l), () => [r3(g.buggy.steer), r3(g.buggy.speed)], (e) => {
      g.buggy.steer = e[0] ?? 0;
      g.buggy.speed = e[1] ?? 0;
    }, () => g.buggy.occupied.driver === g.player.id);
    this.addVehicle('rowboat', g.boat.body, (l) => g.boat.setLocal(l), () => [r3(g.boat.phase), r3(g.boat.rowing), g.boat.moored ? 1 : 0], (e) => {
      g.boat.phase = e[0] ?? 0;
      g.boat.rowing = e[1] ?? 0;
    }, () => g.boat.occupied.row === g.player.id);
    this.addVehicle('swing', g.swing.body, (l) => g.swing.setLocal(l), undefined, undefined, () => g.player.seat?.kind === 'swing');
    if (code) void this.connect(code);
    addEventListener('pagehide', () => void this.relay?.send({ k: 'bye' }));
  }

  get me(): string {
    return this.relay?.id ?? 'solo';
  }

  private addProp(d: DynamicProp) {
    const s: Syncable = {
      id: d.id,
      body: d.link.body,
      owner: '',
      local: true,
      buf: [],
      from: '',
      reportedAsleep: true,
      busy: () => d.heldBy === this.game.player.id,
      setLocal: (l) => {
        if (l === s.local) return;
        s.local = l;
        if (d.heldBy === this.game.player.id) return; // carried: stays kinematic
        d.link.body.setBodyType(l ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
      },
    };
    this.bodies.set(d.id, s);
  }

  private addVehicle(id: string, body: RAPIER.RigidBody, set: (l: boolean) => void, extra?: () => number[], apply?: (e: number[]) => void, busy?: () => boolean) {
    const s: Syncable = {
      id,
      body,
      owner: '',
      local: true,
      buf: [],
      from: '',
      reportedAsleep: true,
      extra,
      applyExtra: apply,
      busy,
      setLocal: (l) => {
        if (l === s.local) return;
        s.local = l;
        set(l);
      },
    };
    this.bodies.set(id, s);
  }

  private async connect(code: string) {
    const relay = new Relay<Msg>(code);
    this.relay = relay;
    relay.onStatus((s) => {
      this.status = s;
      this.pushStatus();
      if (s === 'online') void this.sendHi();
    });
    relay.on((m, from) => this.receive(m, from));
    this.status = 'connecting';
    this.pushStatus();
    try {
      await relay.connect();
    } catch {
      this.status = 'offline';
      this.pushStatus();
    }
  }

  pushStatus() {
    this.game.hud.setRoom({ code: this.code, status: this.status, peers: [...this.remotes.values()].map((r) => r.name) });
  }

  private host(): string {
    return [this.me, ...this.remotes.keys()].sort()[0];
  }

  private authority(s: Syncable): string {
    if (s.owner && (s.owner === this.me || this.remotes.has(s.owner))) return s.owner;
    return this.host();
  }

  private reassign() {
    for (const s of this.bodies.values()) {
      const local = this.authority(s) === this.me;
      if (!local && s.busy?.()) {
        // we are using it: take it back
        this.claimId(s.id);
        continue;
      }
      s.setLocal(local);
    }
  }

  // --------------------------------------------------------------- claims
  claim(d: DynamicProp) {
    this.claimId(d.id);
  }

  claimVehicle(id: 'buggy' | 'rowboat' | 'swing') {
    this.claimId(id);
  }

  private claimId(id: string) {
    const s = this.bodies.get(id);
    if (!s || !this.relay) return;
    if (s.owner === this.me && s.local) return;
    s.owner = this.me;
    s.setLocal(true);
    s.body.wakeUp();
    s.reportedAsleep = false;
    void this.relay.send({ k: 'claim', id });
  }

  // -------------------------------------------------------------- receive
  private receive(m: Msg, from: string) {
    const g = this.game;
    if (!valid(m)) return; // only invitees hold the key, but never trust a payload's shape
    switch (m.k) {
      case 'hi': {
        let r = this.remotes.get(from);
        const fresh = !r;
        if (!r) {
          r = new RemotePlayer(from, m.name, m.av, g.scene, g.physics);
          this.remotes.set(from, r);
          g['hud'].toast(`${m.name} is here`);
        } else {
          r.name = m.name;
          void r.setAvatar(m.av);
        }
        r.lastSeen = performance.now();
        if (fresh) {
          // the host shares its clock (time of day) and the state of everything
          if (this.host() === this.me && this.remotes.size >= 1) {
            void this.relay?.send({ k: 'time', h: g.hours, cyc: g.dayCycle });
            this.sendBodies(true);
          } else if (from === this.host()) {
            g.setTime(m.h, m.cyc);
          }
          if (!m.reply) void this.sendHi(true);
          this.reassign();
          this.pushStatus();
        }
        break;
      }
      case 'bye':
        this.drop(from);
        break;
      case 'me': {
        const r = this.remotes.get(from);
        if (!r) {
          void this.sendHi();
          return;
        }
        r.push(m);
        break;
      }
      case 'claim': {
        const s = this.bodies.get(m.id);
        if (!s) return;
        if (s.busy?.()) {
          void this.relay?.send({ k: 'claim', id: m.id }); // still ours
          return;
        }
        s.owner = from;
        s.buf.length = 0;
        s.setLocal(false);
        break;
      }
      case 'b':
        for (const st of m.l) this.receiveBody(st, m.t, from);
        break;
      case 'time':
        g.setTime(m.h, m.cyc);
        break;
    }
  }

  private receiveBody(st: BodyState, t: number, from: string) {
    const s = this.bodies.get(st[0]);
    if (!s || s.local) return;
    if (this.authority(s) !== from) return;
    s.buf.push({ t, p: new THREE.Vector3(st[1], st[2], st[3]), q: new THREE.Quaternion(st[4], st[5], st[6], st[7]).normalize(), sleep: st[8] === 1 });
    if (s.buf.length > 6) s.buf.shift();
    if (s.applyExtra) s.applyExtra(st.slice(9) as number[]);
    s.from = from;
  }

  private drop(id: string) {
    const r = this.remotes.get(id);
    if (!r) return;
    for (const s of this.game.world.seats) if (s.occupied === id) s.occupied = null;
    r.dispose();
    this.remotes.delete(id);
    this.game.hud.toast(`${r.name} left`);
    this.reassign();
    this.game.syncLoads();
    this.pushStatus();
  }

  // ----------------------------------------------------------------- send
  private async sendHi(reply = false) {
    const g = this.game;
    await this.relay?.send({ k: 'hi', name: g.player.name, av: g.player.avatarId, h: g.hours, cyc: g.dayCycle, reply });
  }

  sendTime() {
    void this.relay?.send({ k: 'time', h: this.game.hours, cyc: this.game.dayCycle });
  }

  private sendMe() {
    const p = this.game.player;
    const a = p.avatar.pose;
    const pos = p.seat ? p.ctrl.position : p.position;
    void this.relay?.send({
      k: 'me',
      t: performance.now() / 1000,
      p: [r3(pos.x), r3(pos.y), r3(pos.z)],
      y: r3(p.yaw),
      m: p.mode,
      v: r3(p.seat ? 0 : p.ctrl.speed),
      seat: p.seat?.id ?? null,
      held: p.held?.prop.id ?? null,
      e: p.emote ? [p.emote.e, p.emote.seed, p.emote.seq] : undefined,
      pose: [a.carry, a.recline, a.steer, r3(a.steerAngle), a.row, r3(a.rowPhase)],
    });
  }

  private sendBodies(all = false) {
    if (!this.relay) return;
    const l: BodyState[] = [];
    for (const s of this.bodies.values()) {
      if (!s.local || this.authority(s) !== this.me) continue;
      const asleep = s.body.isSleeping();
      if (!all && asleep && s.reportedAsleep) continue;
      s.reportedAsleep = asleep;
      const t = s.body.translation();
      const q = s.body.rotation();
      l.push([s.id, r3(t.x), r3(t.y), r3(t.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w), asleep ? 1 : 0, ...(s.extra?.() ?? [])]);
    }
    for (let i = 0; i < l.length; i += 40) void this.relay.send({ k: 'b', t: performance.now() / 1000, l: l.slice(i, i + 40) });
  }

  // ---------------------------------------------------------------- frame
  /** Moves bodies simulated elsewhere to their interpolated pose. */
  beforePhysics() {
    for (const s of this.bodies.values()) {
      if (s.local || !s.buf.length) continue;
      const r = this.remotes.get(s.from);
      const off = r ? r.clockOffset : null;
      const rt = off === null || off === undefined ? Infinity : performance.now() / 1000 - off - 0.11;
      let a = s.buf[s.buf.length - 1];
      let b = a;
      for (let i = 0; i < s.buf.length - 1; i++) {
        if (s.buf[i].t <= rt && s.buf[i + 1].t >= rt) {
          a = s.buf[i];
          b = s.buf[i + 1];
          break;
        }
      }
      const k = b.t > a.t ? THREE.MathUtils.clamp((rt - a.t) / (b.t - a.t), 0, 1) : 1;
      this.tmpP.lerpVectors(a.p, b.p, k);
      this.tmpQ.slerpQuaternions(a.q, b.q, k);
      if (s.body.isDynamic()) s.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      s.body.setNextKinematicTranslation(this.tmpP);
      s.body.setNextKinematicRotation(this.tmpQ);
    }
  }

  update(dt: number) {
    const seats = this.game.seats;
    for (const r of this.remotes.values()) {
      r.update(dt, seats);
      if (r.stale && performance.now() - r.lastSeen > 30000) this.drop(r.id);
    }
    if (!this.relay || this.status !== 'online') return;
    this.sendAcc += dt;
    this.bodyAcc += dt;
    this.hiAcc += dt;
    if (this.sendAcc > 1 / 15) {
      this.sendAcc = 0;
      this.sendMe();
    }
    if (this.bodyAcc > 1 / 12 && this.remotes.size) {
      this.bodyAcc = 0;
      this.sendBodies();
    }
    if (this.hiAcc > 3) {
      this.hiAcc = 0;
      void this.sendHi(true);
    }
    // a seat taken by someone on another screen syncs loads (boat, swing)
    this.game.syncLoads();
  }

  inviteLink(): string | null {
    if (!this.code) return null;
    return `${location.origin}${location.pathname}#room=${this.code.replace(/-/g, '')}`;
  }

  dispose() {
    void this.relay?.send({ k: 'bye' });
    this.relay?.close();
  }
}
