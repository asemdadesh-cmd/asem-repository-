// Paired moments between the two friends: a hug, cheek kisses (the bise),
// a high five, dancing together and holding hands. Each one is asked first and
// the friend can always say no («لا، لم روحك 🤣»). A kiss blown through the air
// 💋 needs no consent. Both devices compute the same meeting spot from the
// 'go' message and pose BOTH avatars locally, so it looks right on each screen
// whatever the network delay.
import * as THREE from 'three';
import type { Msg, PairKind } from '../../shared/protocol.ts';
import type { CharacterId } from '../../shared/api-types.ts';
import type { Seat } from '../../shared/world.ts';
import type { Avatar } from './Avatar.ts';
import { rid, type GameCtx } from './context.ts';
import { lean, reach, turn } from '../characters/ik.ts';
import { emojiTexture } from './effects.ts';
import { sfx } from './audio.ts';

export interface PairUi {
  /** show "X wants to…" with yes/no; auto-hides after `seconds` */
  ask(text: string, onYes: () => void, onNo: () => void, seconds: number): void;
  hideAsk(): void;
  /** a small button to end long moments (holding hands); null hides it */
  setActive(text: string | null, onEnd: () => void): void;
  /** get the local player ready (stand up, close panels) */
  prepare(): void;
}

/** `ask` is the Darija verb phrase in the masculine; `askF` in the feminine. */
export const PAIR_INFO: Record<PairKind, { label: string; ask: string; askF: string; emoji: string; dur: number; near: number; gap: number }> = {
  hug: { label: 'عنقة', ask: 'يعنقك', askF: 'تعنقك', emoji: '🤗', dur: 3.8, near: 3, gap: 0.36 },
  kiss: { label: 'بوسة على الخد', ask: 'يبوسك على الخد', askF: 'تبوسك على الخد', emoji: '😘', dur: 2.6, near: 3, gap: 0.42 },
  highfive: { label: 'تصفيقة', ask: 'يصفق معاك', askF: 'تصفق معاك', emoji: '✋', dur: 1.5, near: 3.5, gap: 0.72 },
  dance: { label: 'شطحة مع بعض', ask: 'يشطح معاك', askF: 'تشطح معاك', emoji: '💃', dur: 7, near: 5, gap: 1.3 },
  hands: { label: 'نشدّو اليدين', ask: 'يشدّ ليك يدك', askF: 'تشدّ ليك يدك', emoji: '🤝', dur: 60, near: 3, gap: 0.56 },
};

/** Characters voiced in the feminine (يسو, the captain, the duck and the cat). */
const FEMININE = new Set<CharacterId>(['yasso', 'yasso-kaftan', 'captain', 'duck', 'cat']);

/** Accepts only well-formed moment messages from the friend. */
export function validPairMsg(m: Extract<Msg, { t: 'pair' }>): boolean {
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1000;
  if (typeof m.id !== 'string' || m.id.length > 40 || (m.from !== 1 && m.from !== 2)) return false;
  if ((m.op === 'ask' || m.op === 'go') && !(m.kind in PAIR_INFO)) return false;
  if (m.op === 'go') return Array.isArray(m.at) && m.at.length === 3 && m.at.every(finite) && finite(m.yaw) && finite(m.seed);
  return m.op === 'ask' || m.op === 'no' || m.op === 'end';
}

interface Active {
  id: string;
  kind: PairKind;
  leader: Seat; // who asked
  at: THREE.Vector3; // meeting point
  yaw: number; // the leader's facing
  seed: number;
  t: number;
  dur: number;
  fired: Set<string>;
}

interface BlownKiss {
  from: Avatar;
  to: Avatar | null;
  t: number;
  sprite: THREE.Sprite | null;
  start: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);
const fwd = (yaw: number) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
/** the character's left (+X when facing +Z) */
const leftOf = (yaw: number) => new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
const smooth = (x: number) => x * x * (3 - 2 * x);
/** 0 → 1 between a..b, holds, 1 → 0 between c..d */
const env = (t: number, a: number, b: number, c: number, d: number) =>
  t < a ? 0 : t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : t < d ? 1 - smooth((t - c) / (d - c)) : 0;

export class PairManager {
  active: Active | null = null;
  private outgoing: { id: string; kind: PairKind; timer: number } | null = null;
  private incoming: { id: string; kind: PairKind } | null = null;
  private kisses: BlownKiss[] = [];
  private v0 = new THREE.Vector3();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();

  constructor(
    private ctx: GameCtx,
    private ui: PairUi,
  ) {}

  private get name() {
    return this.ctx.nameOf(this.ctx.mySeat === 1 ? 2 : 1);
  }

  /** the friend's character is voiced in the feminine */
  private get fem() {
    return FEMININE.has(this.ctx.remote?.characterId ?? 'yasso');
  }

  // ------------------------------------------------------------------ asking

  /** Ask the friend for a moment together. */
  request(kind: PairKind) {
    const s = this.ctx.session;
    const me = this.ctx.local;
    const r = this.ctx.remote;
    if (this.active) {
      this.ctx.hud.toast('كمّلو اللي بديتو أولا 😄');
      return;
    }
    if (!s || !r || !this.ctx.peerOnline()) {
      this.ctx.hud.toast(this.fem ? 'صاحبتك ماشي هنا دابا 📡' : 'صاحبك ماشي هنا دابا 📡', 'warn');
      return;
    }
    if (me.mode === 'swim' || r.mode === 'swim' || me.mode === 'air' || r.mode === 'air') {
      this.ctx.hud.toast('خرجو من الما ووقفو على الأرض 🙂');
      return;
    }
    if (me.root.position.distanceTo(r.root.position) > PAIR_INFO[kind].near) {
      this.ctx.hud.toast(`قرّب من ${this.name} شوية 👣`);
      return;
    }
    if (this.outgoing) clearTimeout(this.outgoing.timer);
    const id = rid('p');
    this.outgoing = {
      id,
      kind,
      timer: window.setTimeout(() => {
        if (this.outgoing?.id !== id) return;
        this.outgoing = null;
        s.send({ t: 'pair', op: 'end', id, from: this.ctx.mySeat });
        this.ctx.hud.toast('ما كاينش جواب… 🙈');
      }, 12000),
    };
    s.send({ t: 'pair', op: 'ask', id, kind, from: this.ctx.mySeat });
    me.say(`${PAIR_INFO[kind].emoji}؟`, 2.2);
    this.ctx.hud.toast(`كنتسناو الجواب… ${PAIR_INFO[kind].emoji}`);
  }

  private accept(id: string, kind: PairKind, leader: Seat) {
    this.incoming = null;
    this.ui.hideAsk();
    const s = this.ctx.session;
    const me = this.ctx.local;
    const r = this.ctx.remote;
    if (!s || !r || !this.ctx.peerOnline() || this.active) return;
    this.ui.prepare();
    const a = r.root.position;
    const b = me.root.position;
    const at = a.clone().add(b).multiplyScalar(0.5);
    // the leader (who asked) faces me; holding hands keeps their current heading
    const yaw = kind === 'hands' ? r.root.rotation.y : Math.atan2(b.x - a.x, b.z - a.z);
    const seed = Math.floor(Math.random() * 1000);
    s.send({ t: 'pair', op: 'go', id, kind, from: this.ctx.mySeat, at: [at.x, at.y, at.z], yaw, seed });
    this.start({ id, kind, leader, at, yaw, seed });
  }

  private decline(id: string) {
    this.incoming = null;
    this.ui.hideAsk();
    this.ctx.session?.send({ t: 'pair', op: 'no', id, from: this.ctx.mySeat });
    this.ctx.local.play('reply');
    this.ctx.local.say('لم روحك 🤣', 2.4);
    sfx.laugh();
  }

  onMsg(m: Extract<Msg, { t: 'pair' }>) {
    if (m.from === this.ctx.mySeat || !validPairMsg(m)) return;
    switch (m.op) {
      case 'ask': {
        if (this.active) {
          this.ctx.session?.send({ t: 'pair', op: 'no', id: m.id, from: this.ctx.mySeat });
          return;
        }
        this.incoming = { id: m.id, kind: m.kind };
        const info = PAIR_INFO[m.kind];
        const ask = this.fem ? `بغات ${info.askF}` : `بغا ${info.ask}`;
        this.ui.ask(`${this.ctx.nameOf(m.from)} ${ask} ${info.emoji}`, () => this.accept(m.id, m.kind, m.from), () => this.decline(m.id), 10);
        this.ctx.remote?.say(`${info.emoji}؟`, 2.2);
        sfx.pop();
        break;
      }
      case 'no':
        if (this.outgoing?.id !== m.id) return;
        clearTimeout(this.outgoing.timer);
        this.outgoing = null;
        this.ctx.remote?.play('reply');
        this.ctx.remote?.say('لم روحك 🤣', 2.4);
        this.ctx.hud.toast(`${this.name} ${this.fem ? 'قالت' : 'قال'}: لم روحك 🤣`);
        sfx.laugh();
        break;
      case 'go':
        if (this.outgoing?.id !== m.id) return;
        clearTimeout(this.outgoing.timer);
        this.outgoing = null;
        this.ui.prepare();
        this.start({ id: m.id, kind: m.kind, leader: this.ctx.mySeat, at: new THREE.Vector3(...m.at), yaw: m.yaw, seed: m.seed });
        break;
      case 'end':
        if (this.incoming?.id === m.id) {
          this.incoming = null;
          this.ui.hideAsk();
        }
        if (this.active?.id === m.id) this.stop(false);
        break;
    }
  }

  onPeerOffline() {
    this.incoming = null;
    this.ui.hideAsk();
    this.stop(false);
  }

  // ------------------------------------------------------------------ running

  private start(a: Omit<Active, 't' | 'dur' | 'fired'>) {
    this.active = { ...a, t: 0, dur: PAIR_INFO[a.kind].dur, fired: new Set() };
    this.ui.setActive(a.kind === 'hands' ? 'سيب يدي 🤝' : null, () => this.end());
  }

  /** Ends the current moment (and tells the friend). */
  end() {
    if (!this.active) return;
    this.ctx.session?.send({ t: 'pair', op: 'end', id: this.active.id, from: this.ctx.mySeat });
    this.stop(false);
  }

  private stop(_notify: boolean) {
    if (!this.active) return;
    this.active = null;
    this.ui.setActive(null, () => {});
  }

  private gap(kind: PairKind): number {
    const bulk = (av: Avatar | null) => Math.max(0, (av?.radius ?? 0.34) - 0.34);
    return PAIR_INFO[kind].gap + (kind === 'hands' ? 0 : (bulk(this.ctx.local) + bulk(this.ctx.remote)) * 1.1);
  }

  /** Where an avatar should stand during the moment. */
  private slot(seat: Seat): { pos: THREE.Vector3; yaw: number } | null {
    const a = this.active;
    if (!a) return null;
    const leader = seat === a.leader;
    if (a.kind === 'hands') {
      // the follower walks on the leader's right
      const lead = leader ? null : a.leader === this.ctx.mySeat ? this.ctx.local : this.ctx.remote;
      if (leader || !lead) return null;
      const yaw = lead.root.rotation.y;
      return { pos: lead.root.position.clone().addScaledVector(leftOf(yaw), -this.gap('hands')), yaw };
    }
    const f = fwd(a.yaw);
    const g = this.gap(a.kind);
    const sway = a.kind === 'hug' ? Math.sin(a.t * 2.4) * 0.07 * env(a.t, 0.5, 1, a.dur - 0.8, a.dur) : 0;
    return { pos: a.at.clone().addScaledVector(f, leader ? -g / 2 : g / 2), yaw: (leader ? a.yaw : a.yaw + Math.PI) + sway };
  }

  /** Local placement while a moment runs; 'cancel' if the player walks away. */
  control(hasInput: boolean): { pos: THREE.Vector3; yaw: number; speed: number } | 'cancel' | null {
    const a = this.active;
    if (!a) return null;
    const leader = a.leader === this.ctx.mySeat;
    if (a.kind === 'hands' && leader) return null; // the leader walks freely
    if (hasInput && (a.kind === 'hands' || a.t > 0.5)) return 'cancel';
    const s = this.slot(this.ctx.mySeat);
    if (!s) return 'cancel';
    return { ...s, speed: a.kind === 'hands' ? (this.ctx.remote?.speed ?? 0) : 0 };
  }

  /** Display placement for the friend's avatar (keeps it glued in place despite lag). */
  remoteControl(): { pos: THREE.Vector3; yaw: number; speed: number } | null {
    const a = this.active;
    if (!a || !this.ctx.remote) return null;
    const peer: Seat = this.ctx.mySeat === 1 ? 2 : 1;
    if (a.kind === 'hands' && a.leader === peer) return null; // they lead: follow their real position
    const s = this.slot(peer);
    return s ? { ...s, speed: a.kind === 'hands' ? this.ctx.local.speed : 0 } : null;
  }

  // ------------------------------------------------------------------ blown kiss

  blowKiss() {
    this.kisses.push({ from: this.ctx.local, to: this.ctx.remote, t: 0, sprite: null, start: new THREE.Vector3() });
    this.ctx.local.say('مواااه 😘', 1.8);
    this.ctx.session?.send({ t: 'act', kind: 'blowkiss', seat: this.ctx.mySeat, id: rid('k') });
  }

  remoteBlowKiss() {
    const r = this.ctx.remote;
    if (!r) return;
    this.kisses.push({ from: r, to: this.ctx.local, t: 0, sprite: null, start: new THREE.Vector3() });
    r.say('مواااه 😘', 1.8);
  }

  // ------------------------------------------------------------------ per frame

  /** Pose overrides + timeline events; call after both avatars have animated. */
  update(dt: number) {
    this.updateKisses(dt);
    const a = this.active;
    if (!a) return;
    const L = this.ctx.local;
    const R = this.ctx.remote;
    if (!R) {
      this.stop(false);
      return;
    }
    a.t += dt;
    if (a.t >= a.dur || (a.kind === 'hands' && (L.mode === 'swim' || R.mode === 'swim'))) {
      this.stop(false);
      return;
    }
    const leaderAv = a.leader === this.ctx.mySeat ? L : R;
    const partnerAv = leaderAv === L ? R : L;
    L.root.updateMatrixWorld(true);
    R.root.updateMatrixWorld(true);
    this.pose(leaderAv, partnerAv, a, true);
    this.pose(partnerAv, leaderAv, a, false);
    this.events(a, leaderAv, partnerAv);
  }

  private pose(X: Avatar, Y: Avatar, a: Active, isLeader: boolean) {
    const rig = X.rig;
    const t = a.t;
    const yaw = X.root.rotation.y;
    const f = fwd(yaw);
    const left = leftOf(yaw);
    const { spine, head } = rig.bend();
    const pole = (side: 'L' | 'R', out: number, down: number, back: number) =>
      rig.arm(side)[0].getWorldPosition(new THREE.Vector3()).addScaledVector(left, side === 'L' ? out : -out).addScaledVector(UP, -down).addScaledVector(f, -back);
    switch (a.kind) {
      case 'hug': {
        const w = env(t, 0.15, 0.65, a.dur - 0.7, a.dur);
        rig.setMood('love', 0.3);
        lean(spine, f, 0.14 * w);
        const chest = Y.rig.point('chest', this.v0);
        const back = fwd(Y.root.rotation.y).negate();
        const tL = chest.clone().addScaledVector(back, 0.1).addScaledVector(left, 0.11).addScaledVector(UP, 0.08);
        const tR = chest.clone().addScaledVector(back, 0.1).addScaledVector(left, -0.13).addScaledVector(UP, -0.12);
        reach(rig.arm('L'), tL, pole('L', 0.45, 0.3, 0.05), w);
        reach(rig.arm('R'), tR, pole('R', 0.45, 0.4, 0.05), w);
        turn(head, -0.42 * w, 0.16 * w, f);
        break;
      }
      case 'kiss': {
        const w = env(t, 0.1, 0.45, a.dur - 0.45, a.dur);
        lean(spine, f, 0.2 * w);
        // hands rest on the friend's upper arms (their right arm is on my left)
        const tL = Y.rig.arm('R')[0].getWorldPosition(this.v0).addScaledVector(UP, -0.12);
        const tR = Y.rig.arm('L')[0].getWorldPosition(this.v1).addScaledVector(UP, -0.12);
        reach(rig.arm('L'), tL, pole('L', 0.35, 0.35, 0.1), 0.8 * w);
        reach(rig.arm('R'), tR, pole('R', 0.35, 0.35, 0.1), 0.8 * w);
        // two kisses: cheek, then the other cheek
        const k1 = env(t, 0.4, 0.7, 0.95, 1.2);
        const k2 = env(t, 1.25, 1.55, 1.8, 2.05);
        turn(head, (k1 - k2) * 0.62, (k1 - k2) * 0.14, f);
        rig.setMood(k1 > 0.3 || k2 > 0.3 ? 'kiss' : 'shy', 0.3);
        break;
      }
      case 'highfive': {
        const w = env(t, 0, 0.32, 0.7, 1.25);
        const meet = X.root.position.clone().add(Y.root.position).multiplyScalar(0.5);
        // between both heads: the taller one reaches down a little, the shorter one up
        const hx = X.headPos(this.v0).y;
        const hy = Y.headPos(this.v1).y;
        meet.y = Math.min((hx + hy) / 2 - 0.04, Math.min(hx, hy) + 0.22);
        reach(rig.arm('R'), meet, pole('R', 0.3, 0.45, 0.15), w);
        rig.setMood(t > 0.38 ? 'laugh' : 'smile', 0.3);
        break;
      }
      case 'dance': {
        const key = isLeader ? 'dl' : 'dp';
        if (!a.fired.has(key) || (rig.currentAction === null && t < a.dur - 1.2)) {
          a.fired.add(key);
          rig.play('dance', a.seed);
        }
        rig.setMood('smile', 0.3);
        break;
      }
      case 'hands': {
        const w = env(t, 0, 0.5, a.dur - 0.5, a.dur);
        const side = isLeader ? 'R' : 'L';
        const meet = X.rig.point('pelvis', this.v0).add(Y.rig.point('pelvis', this.v1)).multiplyScalar(0.5);
        meet.y -= 0.06;
        meet.addScaledVector(f, 0.07);
        reach(rig.arm(side), meet, pole(side, 0.15, 0.35, 0.3), w);
        rig.setMood('smile', 0.3);
        break;
      }
    }
  }

  private events(a: Active, leader: Avatar, partner: Avatar) {
    const once = (key: string, at: number, fn: () => void) => {
      if (a.t >= at && !a.fired.has(key)) {
        a.fired.add(key);
        fn();
      }
    };
    const between = () => leader.headPos(this.v2).add(partner.headPos(new THREE.Vector3())).multiplyScalar(0.5);
    const fx = this.ctx.effects;
    switch (a.kind) {
      case 'hug':
        once('h1', 0.7, () => {
          sfx.hug();
          fx.emojiBurst(between().add(new THREE.Vector3(0, 0.25, 0)), '💗', 8, 0.32);
        });
        once('h2', 2.1, () => fx.emojiBurst(between().add(new THREE.Vector3(0, 0.3, 0)), '💞', 5, 0.3));
        break;
      case 'kiss':
        once('k1', 0.8, () => {
          sfx.kiss();
          leader.say('مواه 😘', 1.4);
          fx.emojiBurst(between(), '💋', 3, 0.22);
        });
        once('k2', 1.65, () => {
          sfx.kiss();
          partner.say('مواه 😘', 1.4);
          fx.emojiBurst(between().add(new THREE.Vector3(0, 0.2, 0)), '💗', 6, 0.28);
        });
        break;
      case 'highfive':
        once('clap', 0.36, () => {
          sfx.clap();
          fx.emojiBurst(between().add(new THREE.Vector3(0, 0.2, 0)), '✨', 10, 0.3);
        });
        break;
      case 'dance':
        for (let i = 0; i < 4; i++) once(`n${i}`, 0.2 + i * 1.6, () => fx.emojiBurst(between().add(new THREE.Vector3(0, 0.4, 0)), i % 2 ? '🎶' : '💃', 4, 0.32));
        break;
      case 'hands':
        once('hold', 0.45, () => {
          sfx.pop();
          fx.emojiBurst(leader.rig.point('pelvis', new THREE.Vector3()).add(partner.rig.point('pelvis', new THREE.Vector3())).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0)), '💗', 4, 0.25);
        });
        break;
    }
  }

  private updateKisses(dt: number) {
    for (const k of this.kisses) {
      k.t += dt;
      const rig = k.from.rig;
      const yaw = k.from.root.rotation.y;
      const f = fwd(yaw);
      k.from.root.updateMatrixWorld(true);
      // hand to the lips, then thrown toward the friend
      const toMouth = env(k.t, 0, 0.3, 0.45, 0.6);
      const throwW = env(k.t, 0.45, 0.6, 0.8, 1.1);
      const mouth = rig.point('mouth', this.v0).addScaledVector(f, 0.05);
      const out = rig.arm('R')[0].getWorldPosition(this.v1).addScaledVector(f, 0.55).addScaledVector(UP, 0.05);
      const pole = rig.arm('R')[0].getWorldPosition(this.v2).addScaledVector(leftOf(yaw), -0.3).addScaledVector(UP, -0.4);
      if (toMouth > 0) reach(rig.arm('R'), mouth, pole, toMouth);
      else if (throwW > 0) reach(rig.arm('R'), out, pole, throwW);
      rig.setMood(k.t < 0.6 ? 'kiss' : 'smile', 0.3);
      if (k.t >= 0.5 && !k.sprite) {
        sfx.kiss();
        k.start.copy(mouth);
        k.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('💋'), transparent: true, depthWrite: false }));
        k.sprite.scale.setScalar(0.3);
        k.sprite.renderOrder = 6;
        this.ctx.scene.add(k.sprite);
      }
      if (k.sprite) {
        const p = Math.min(1, (k.t - 0.5) / 0.9);
        const end = k.to ? k.to.headPos(new THREE.Vector3()) : k.start.clone().addScaledVector(f, 3).add(new THREE.Vector3(0, 0.8, 0));
        k.sprite.position.lerpVectors(k.start, end, p).add(new THREE.Vector3(0, Math.sin(p * Math.PI) * 0.6, 0));
        k.sprite.scale.setScalar(0.3 + Math.sin(p * Math.PI) * 0.12);
        (k.sprite.material as THREE.SpriteMaterial).opacity = k.to ? 1 : 1 - p;
        if (p >= 1 && k.sprite.visible) {
          k.sprite.visible = false;
          if (k.to) {
            this.ctx.effects.emojiBurst(end, '💖', 7, 0.3);
            k.to.rig.setMood('shy', 2.2);
            k.to.say('🙈💗', 1.6);
            if (k.to === this.ctx.local) this.ctx.hud.toast(`${this.name} ${this.fem ? 'صيفطات' : 'صيفط'} ليك بوسة 💋`, 'good');
          }
        }
      }
    }
    this.kisses = this.kisses.filter((k) => {
      if (k.t < 1.6) return true;
      k.sprite?.removeFromParent();
      k.sprite?.material.dispose();
      return false;
    });
  }
}
