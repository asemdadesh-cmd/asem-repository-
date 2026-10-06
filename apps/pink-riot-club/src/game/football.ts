// One shared ball. The host (seat 1 when present) simulates it and streams
// snapshots; the other player predicts locally and sends kicks to the host.
// Goals are reported once per kickoff id and validated by the server.
import * as THREE from 'three';
import { PITCH, type Seat } from '../../shared/world.ts';
import type { Msg } from '../../shared/protocol.ts';
import { api } from '../net/api.ts';
import type { GameCtx } from './context.ts';
import { rid } from './context.ts';
import { sfx } from './audio.ts';

const R = 0.33;
const G = 18;
const BX = PITCH.halfX + PITCH.goalDepth + 0.5 - R; // boards (x)
const BZ = PITCH.halfZ + 1.2 - R; // boards (z)

function ballTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);
  const cols = ['#ff5fa2', '#2ec4b6'];
  for (let i = 0; i < 12; i++) {
    const x = (i % 6) * 85 + (i < 6 ? 20 : 62);
    const y = i < 6 ? 70 : 186;
    ctx.fillStyle = cols[i % 2];
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 30);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#ff5fa2';
  ctx.fillText('♥', 240, 135);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Football {
  mesh: THREE.Mesh;
  pos = new THREE.Vector3(PITCH.cx, R, PITCH.cz);
  vel = new THREE.Vector3();
  kid = rid('k');
  frozen = false;
  private sendTimer = 0;
  private resetTimer = 0;
  private lastHost: Seat | null = null;
  private practiceToastShown = false;
  private shadow: THREE.Mesh;
  private handoverWait = 0;

  constructor(private ctx: GameCtx) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 24),
      new THREE.MeshPhysicalMaterial({ map: ballTexture(), roughness: 0.35, clearcoat: 0.6 }),
    );
    this.mesh.castShadow = true;
    ctx.scene.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false }));
    ctx.scene.add(this.shadow);
    this.mesh.position.copy(this.pos);
  }

  /** Seat 1 hosts whenever it is around; otherwise seat 2. */
  get host(): Seat {
    if (!this.ctx.session) return this.ctx.mySeat;
    if (this.ctx.mySeat === 1) return 1;
    return this.ctx.peerOnline() ? 1 : 2;
  }

  get amHost(): boolean {
    return this.host === this.ctx.mySeat;
  }

  /** Called when the local player presses kick. */
  tryKick(): boolean {
    const me = this.ctx.local;
    const d = new THREE.Vector3().subVectors(this.pos, me.root.position);
    d.y = 0;
    if (d.length() > 1.7 || this.frozen) return false;
    const facing = new THREE.Vector3(Math.sin(me.root.rotation.y), 0, Math.cos(me.root.rotation.y));
    const dir = facing.multiplyScalar(0.65).add(d.normalize().multiplyScalar(0.35)).normalize();
    const imp: [number, number, number] = [dir.x * 13, 4.2, dir.z * 13];
    me.play('kick');
    window.setTimeout(() => {
      this.applyKick(imp);
      sfx.kick();
      if (!this.amHost && this.ctx.session) this.ctx.session.send({ t: 'kick', kid: this.kid, imp, at: [this.pos.x, this.pos.y, this.pos.z] });
    }, 230);
    return true;
  }

  private applyKick(imp: [number, number, number]) {
    this.vel.set(imp[0], imp[1], imp[2]);
  }

  onMsg(m: Msg) {
    if (m.t === 'kick' && this.amHost && m.kid === this.kid) {
      this.applyKick(m.imp);
      sfx.kick();
    } else if (m.t === 'ball' && !this.amHost) {
      // authoritative snapshot from the host
      const p = new THREE.Vector3(...m.p);
      const v = new THREE.Vector3(...m.v);
      const lag = 0.08;
      p.addScaledVector(v, lag);
      if (m.kid !== this.kid) this.kid = m.kid;
      this.frozen = !!m.frozen;
      const err = p.distanceTo(this.pos);
      if (err > 1.2) this.pos.copy(p);
      else this.pos.lerp(p, 0.35);
      this.vel.lerp(v, 0.6);
    } else if (m.t === 'goal') {
      this.frozen = true;
      this.celebrate(m.scorer);
    } else if (m.t === 'handover' && m.to === this.ctx.mySeat) {
      this.kid = m.kid;
      this.pos.set(...m.p);
      this.vel.set(...m.v);
      this.handoverWait = 0;
    }
  }

  /** The peer (seat 1) came back: give them the ball state. */
  onPeerOnline() {
    if (this.ctx.mySeat === 2 && this.ctx.session) {
      this.ctx.session.send({ t: 'handover', to: 1, kid: this.kid, p: [this.pos.x, this.pos.y, this.pos.z], v: [this.vel.x, this.vel.y, this.vel.z] });
    }
    if (this.ctx.mySeat === 1) this.handoverWait = 1.2;
  }

  private celebrate(scorer: Seat) {
    const name = this.ctx.nameOf(scorer);
    this.ctx.hud.banner('گووووول! ⚽', `${name} سجل/ات`, '🎉');
    sfx.whistle();
    sfx.cheer();
    const scorerAvatar = scorer === this.ctx.mySeat ? this.ctx.local : this.ctx.remote;
    if (scorerAvatar) {
      scorerAvatar.play('celebrate');
      this.ctx.effects.confetti(scorerAvatar.headPos().add(new THREE.Vector3(0, 0.5, 0)));
    }
    this.ctx.effects.confetti(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 50);
  }

  lastGoalKid: string | null = null;

  private async goal(side: 'west' | 'east') {
    this.frozen = true;
    const scorer: Seat = side === 'west' ? 2 : 1;
    const kid = this.kid;
    this.lastGoalKid = kid;
    this.celebrate(scorer);
    const s = this.ctx.session;
    this.resetTimer = 3;
    if (!s) return;
    s.send({ t: 'goal', kid, scorer, side });
    try {
      const r = await api.score({ code: s.code, token: s.token, game: 'football', eventId: kid, scorer });
      s.applyState(r.state);
      if (r.accepted) {
        s.send({ t: 'score', game: 'football', state: r.state, winner: r.roundEnded?.winner, round: r.roundEnded?.round });
        if (r.roundEnded) this.roundWon(r.roundEnded.winner, r.roundEnded.round);
      } else if (r.reason === 'opponent-offline' && !this.practiceToastShown) {
        this.practiceToastShown = true;
        this.ctx.hud.toast('تمرين ⚽ — الأهداف كتحسب غير ملي يكون صاحبك هنا', 'warn');
      }
    } catch {
      this.ctx.hud.toast('ما قدرناش نسجلو الهدف فالسيرفر… غادي نعاودو 🔁', 'warn');
    }
  }

  roundWon(winner: Seat, round: number) {
    this.ctx.hud.banner(`🏆 ${this.ctx.nameOf(winner)} ربح/ت الجولة ${round}!`, 'الماتش الجاي بدا 0 - 0', '⚽');
    sfx.cheer();
  }

  private resetBall() {
    this.kid = rid('k');
    this.pos.set(PITCH.cx, R + 1.5, PITCH.cz);
    this.vel.set(0, 0, 0);
    this.frozen = false;
    this.sendNow();
  }

  private sendNow() {
    this.ctx.session?.send({
      t: 'ball',
      kid: this.kid,
      host: this.ctx.mySeat,
      p: [round3(this.pos.x), round3(this.pos.y), round3(this.pos.z)],
      v: [round3(this.vel.x), round3(this.vel.y), round3(this.vel.z)],
      ts: Date.now(),
      frozen: this.frozen || undefined,
    });
  }

  private collidePlayer(p: THREE.Vector3, v: THREE.Vector3, radius: number) {
    if (this.pos.y > 1.3) return;
    const dx = this.pos.x - p.x;
    const dz = this.pos.z - p.z;
    const d = Math.hypot(dx, dz);
    const min = radius + R;
    if (d < min && d > 1e-4) {
      const nx = dx / d;
      const nz = dz / d;
      this.pos.x = p.x + nx * min;
      this.pos.z = p.z + nz * min;
      const along = v.x * nx + v.z * nz;
      const push = Math.max(along, 0) * 1.25 + 1.2;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn < push) {
        this.vel.x += nx * (push - vn);
        this.vel.z += nz * (push - vn);
      }
    }
  }

  private step(dt: number, detectGoals: boolean) {
    if (this.frozen && this.amHost) {
      this.vel.multiplyScalar(1 - 3 * dt);
    }
    this.vel.y -= G * dt;
    this.pos.addScaledVector(this.vel, dt);
    // ground
    if (this.pos.y < R) {
      this.pos.y = R;
      if (this.vel.y < -1.5) this.vel.y = -this.vel.y * 0.55;
      else this.vel.y = 0;
      const f = Math.exp(-1.1 * dt);
      this.vel.x *= f;
      this.vel.z *= f;
    } else {
      const f = Math.exp(-0.15 * dt);
      this.vel.x *= f;
      this.vel.z *= f;
    }
    const lx = this.pos.x - PITCH.cx;
    const lz = this.pos.z - PITCH.cz;
    const inMouth = Math.abs(lz) < PITCH.goalHalfWidth - R * 0.4 && this.pos.y < PITCH.goalHeight - R * 0.5;
    // goal detection
    if (detectGoals && !this.frozen && inMouth && Math.abs(lx) > PITCH.halfX + R * 0.6) {
      void this.goal(lx < 0 ? 'west' : 'east');
    }
    // nets
    if (Math.abs(lx) > PITCH.halfX && Math.abs(lz) < PITCH.goalHalfWidth + 0.2) {
      const back = PITCH.halfX + PITCH.goalDepth - R;
      if (Math.abs(lx) > back) {
        this.pos.x = PITCH.cx + Math.sign(lx) * back;
        this.vel.x *= -0.2;
      }
      if (inMouth || Math.abs(lz) < PITCH.goalHalfWidth) {
        const side = PITCH.goalHalfWidth - R;
        if (Math.abs(lz) > side && Math.abs(lx) > PITCH.halfX + R) {
          this.pos.z = PITCH.cz + Math.sign(lz) * side;
          this.vel.z *= -0.3;
        }
      }
      if (this.pos.y > PITCH.goalHeight - R && Math.abs(lx) > PITCH.halfX + R) {
        this.pos.y = PITCH.goalHeight - R;
        this.vel.y = -Math.abs(this.vel.y) * 0.3;
      }
    }
    // posts
    for (const sz of [-PITCH.goalHalfWidth, PITCH.goalHalfWidth])
      for (const sx of [-PITCH.halfX, PITCH.halfX]) {
        const dx = this.pos.x - (PITCH.cx + sx);
        const dz = this.pos.z - (PITCH.cz + sz);
        const d = Math.hypot(dx, dz);
        if (d < R + 0.08 && this.pos.y < PITCH.goalHeight) {
          const nx = dx / d;
          const nz = dz / d;
          this.pos.x = PITCH.cx + sx + nx * (R + 0.08);
          this.pos.z = PITCH.cz + sz + nz * (R + 0.08);
          const vn = this.vel.x * nx + this.vel.z * nz;
          this.vel.x -= 1.7 * vn * nx;
          this.vel.z -= 1.7 * vn * nz;
          sfx.plop();
        }
      }
    // boards
    if (Math.abs(this.pos.x - PITCH.cx) > BX) {
      this.pos.x = PITCH.cx + Math.sign(this.pos.x - PITCH.cx) * BX;
      this.vel.x *= -0.7;
    }
    if (Math.abs(this.pos.z - PITCH.cz) > BZ) {
      this.pos.z = PITCH.cz + Math.sign(this.pos.z - PITCH.cz) * BZ;
      this.vel.z *= -0.7;
    }
  }

  update(dt: number) {
    const host = this.host;
    if (host !== this.lastHost) {
      this.lastHost = host;
      if (this.amHost) this.sendNow();
    }
    if (this.handoverWait > 0) this.handoverWait -= dt;
    const sub = 3;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      this.step(h, this.amHost && this.handoverWait <= 0);
      // players push the ball (host is authoritative, the other predicts)
      this.collidePlayer(this.ctx.local.root.position, this.ctx.localVel, this.ctx.local.radius);
      if (this.ctx.remote && this.ctx.peerOnline()) this.collidePlayer(this.ctx.remote.root.position, this.ctx.remoteVel, this.ctx.remote.radius);
    }
    if (this.amHost) {
      if (this.resetTimer > 0) {
        this.resetTimer -= dt;
        if (this.resetTimer <= 0) this.resetBall();
      }
      this.sendTimer -= dt;
      const moving = this.vel.lengthSq() > 0.01 || this.pos.y > R + 0.01;
      if (this.sendTimer <= 0) {
        this.sendNow();
        this.sendTimer = moving ? 1 / 15 : 0.5;
      }
    }
    // roll visually
    this.mesh.position.copy(this.pos);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.01) {
      const axis = new THREE.Vector3(this.vel.z, 0, -this.vel.x).normalize();
      this.mesh.rotateOnWorldAxis(axis, (sp * dt) / R);
    }
    this.shadow.position.set(this.pos.x, 0.03, this.pos.z);
    const sc = THREE.MathUtils.clamp(1.2 - (this.pos.y - R) * 0.15, 0.4, 1.2);
    this.shadow.scale.setScalar(sc);
  }

  nearBall(p: THREE.Vector3, r = 2): boolean {
    return Math.hypot(this.pos.x - p.x, this.pos.z - p.z) < r;
  }
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
