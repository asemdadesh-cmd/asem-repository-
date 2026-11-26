// Splash battle in the pool: throw water, land 5 splashes to win the round.
// The thrower detects hits; the server validates and de-duplicates them.
import * as THREE from 'three';
import { inPool, POOL } from '../../shared/world.ts';
import type { Msg } from '../../shared/protocol.ts';
import { api } from '../net/api.ts';
import type { GameCtx } from './context.ts';
import { rid } from './context.ts';
import { sfx } from './audio.ts';

interface Projectile {
  id: string;
  mine: boolean;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  done: boolean;
}

export class PoolBattle {
  private shots: Projectile[] = [];
  private cooldown = 0;
  private blobGeo = new THREE.SphereGeometry(1, 14, 10);
  private blobMat = new THREE.MeshPhysicalMaterial({ color: '#bff6ff', roughness: 0.05, transparent: true, opacity: 0.75, emissive: '#38c8dc', emissiveIntensity: 0.25, clearcoat: 1 });
  private practiceToastShown = false;

  constructor(private ctx: GameCtx) {}

  canSplash(): boolean {
    const p = this.ctx.local.root.position;
    return this.ctx.local.mode === 'swim' && inPool(p.x, p.z);
  }

  /** Local player throws a splash. */
  splash(): boolean {
    if (!this.canSplash() || this.cooldown > 0) return false;
    this.cooldown = 0.6;
    const me = this.ctx.local;
    const origin = me.root.position.clone().add(new THREE.Vector3(0, 0.25, 0));
    const facing = new THREE.Vector3(Math.sin(me.root.rotation.y), 0, Math.cos(me.root.rotation.y));
    let dir = facing.clone();
    // gentle aim assist toward the friend if they're roughly in front
    const r = this.ctx.remote;
    if (r && this.ctx.peerOnline() && r.mode === 'swim') {
      const to = r.root.position.clone().sub(me.root.position);
      to.y = 0;
      const dist = to.length();
      if (dist < 12 && facing.angleTo(to.clone().normalize()) < 0.7) dir = to.normalize();
    }
    const vel = dir.multiplyScalar(11).add(new THREE.Vector3(0, 3.2, 0));
    const id = rid('s');
    me.play('splash');
    window.setTimeout(() => {
      this.spawn(id, origin.add(new THREE.Vector3(vel.x, 0, vel.z).normalize().multiplyScalar(0.5)), vel, true);
      this.ctx.session?.send({ t: 'act', kind: 'splash', seat: this.ctx.mySeat, id, origin: [origin.x, origin.y, origin.z], dir: [vel.x, vel.y, vel.z] });
    }, 260);
    sfx.splash();
    this.ctx.effects.splash(origin, 0.6, POOL.waterY);
    this.ctx.world.poolWater.ripple(origin.x, origin.z, 0.8);
    return true;
  }

  private spawn(id: string, pos: THREE.Vector3, vel: THREE.Vector3, mine: boolean) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(this.blobGeo, this.blobMat);
      m.scale.setScalar(0.16 - i * 0.025);
      m.position.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, -i * 0.12);
      g.add(m);
    }
    g.position.copy(pos);
    this.ctx.scene.add(g);
    this.shots.push({ id, mine, mesh: g, pos: pos.clone(), vel: vel.clone(), life: 1.6, done: false });
  }

  onMsg(m: Msg) {
    if (m.t === 'act' && m.kind === 'splash' && m.origin && m.dir) {
      const r = this.ctx.remote;
      r?.play('splash');
      sfx.splash();
      this.spawn(m.id, new THREE.Vector3(...m.origin), new THREE.Vector3(...m.dir), false);
    } else if (m.t === 'hit' && m.target === this.ctx.mySeat) {
      this.getHit(this.ctx.local);
    }
  }

  private getHit(target: import('./Avatar.ts').Avatar) {
    target.play('splashed');
    const hp = target.headPos();
    this.ctx.effects.splash(hp, 1.2, POOL.waterY);
    this.ctx.effects.emojiBurst(hp.clone().add(new THREE.Vector3(0, 0.3, 0)), '💦', 5, 0.35);
    this.ctx.world.poolWater.ripple(hp.x, hp.z, 1.4);
    sfx.splash();
  }

  private async landed(shot: Projectile) {
    const r = this.ctx.remote;
    const s = this.ctx.session;
    if (!r || !s) return;
    this.getHit(r);
    const me = this.ctx.local.root.position;
    const them = r.root.position;
    s.send({ t: 'hit', id: shot.id, by: this.ctx.mySeat, target: s.peerSeat, game: 'pool' });
    try {
      const res = await api.score({ code: s.code, token: s.token, game: 'pool', eventId: shot.id, from: [me.x, me.z], to: [them.x, them.z] });
      s.applyState(res.state);
      if (res.accepted) {
        s.send({ t: 'score', game: 'pool', state: res.state, winner: res.roundEnded?.winner, round: res.roundEnded?.round });
        if (res.roundEnded) this.roundWon(res.roundEnded.winner, res.roundEnded.round);
      } else if (res.reason === 'opponent-offline' && !this.practiceToastShown) {
        this.practiceToastShown = true;
        this.ctx.hud.toast('تمرين 💦 — النقاط كتحسب غير ملي تكونو بجوج هنا', 'warn');
      }
    } catch {
      this.ctx.hud.toast('السيرفر ما جاوبش… الضربة ما تحسباتش 😅', 'warn');
    }
  }

  roundWon(winner: number, round: number) {
    const name = this.ctx.nameOf(winner as 1 | 2);
    this.ctx.hud.banner(`💦 ${name} ربح/ت معركة المسبح!`, `الجولة ${round} — 5 ضربات`, '🏆');
    sfx.cheer();
    const av = winner === this.ctx.mySeat ? this.ctx.local : this.ctx.remote;
    if (av) {
      av.play('celebrate');
      this.ctx.effects.confetti(av.headPos().add(new THREE.Vector3(0, 0.6, 0)));
    }
  }

  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const target = this.ctx.remote;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.vel.y -= 9 * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      s.mesh.lookAt(s.pos.clone().add(s.vel));
      if (s.mine && !s.done && target && this.ctx.peerOnline()) {
        const tp = target.root.position.clone().add(new THREE.Vector3(0, target.mode === 'swim' ? 0.2 : 0.9, 0));
        if (tp.distanceTo(s.pos) < 0.85 && inPool(target.root.position.x, target.root.position.z, 0.3)) {
          s.done = true;
          s.life = 0;
          void this.landed(s);
        }
      }
      if (s.pos.y < POOL.waterY && s.vel.y < 0 && s.life > 0) {
        s.life = 0;
        this.ctx.effects.splash(new THREE.Vector3(s.pos.x, POOL.waterY, s.pos.z), 0.7, POOL.waterY);
        if (inPool(s.pos.x, s.pos.z)) this.ctx.world.poolWater.ripple(s.pos.x, s.pos.z, 1);
      }
      if (s.life <= 0) {
        this.ctx.scene.remove(s.mesh);
        this.shots.splice(i, 1);
      }
    }
  }
}
