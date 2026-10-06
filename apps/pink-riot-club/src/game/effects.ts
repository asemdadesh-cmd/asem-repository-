// Particle effects: cartoon bonk stars, water splashes, confetti, emoji rain.
import * as THREE from 'three';

const emojiCache = new Map<string, THREE.Texture>();
export function emojiTexture(e: string): THREE.Texture {
  let t = emojiCache.get(e);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.fillText(e, 64, 70);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  emojiCache.set(e, t);
  return t;
}

function starTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.translate(64, 64);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 24 : 56;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ff7a00';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-12, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Particle {
  obj: THREE.Object3D;
  vel: THREE.Vector3;
  life: number;
  max: number;
  gravity: number;
  spin: number;
  grow: number;
  orbit?: { center: () => THREE.Vector3; r: number; a: number; speed: number; y: number };
  fade: boolean;
  onWaterKill?: number;
}

export class Effects {
  group = new THREE.Group();
  private parts: Particle[] = [];
  private star = starTexture();
  private dropGeo = new THREE.SphereGeometry(1, 8, 6);
  private dropMat = new THREE.MeshStandardMaterial({ color: '#d9fbff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.6, emissive: '#5fd3e6', emissiveIntensity: 0.3, depthWrite: false });
  private confettiGeo = new THREE.PlaneGeometry(0.12, 0.07);
  private ringGeo = new THREE.RingGeometry(0.6, 0.75, 32).rotateX(-Math.PI / 2);

  private sprite(tex: THREE.Texture, size: number): THREE.Sprite {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(size, size, size);
    s.renderOrder = 5;
    this.group.add(s);
    return s;
  }

  /** Cartoon stars orbiting someone's head after a bonk. */
  stars(center: () => THREE.Vector3, count = 5, dur = 1.8) {
    for (let i = 0; i < count; i++) {
      const s = this.sprite(this.star, 0.28);
      this.parts.push({
        obj: s,
        vel: new THREE.Vector3(),
        life: dur,
        max: dur,
        gravity: 0,
        spin: 0,
        grow: 0,
        fade: true,
        orbit: { center, r: 0.42, a: (i / count) * Math.PI * 2, speed: 5, y: 0.15 },
      });
    }
    // impact burst
    const c = center();
    for (let i = 0; i < 8; i++) {
      const s = this.sprite(this.star, 0.18);
      s.position.copy(c);
      const a = (i / 8) * Math.PI * 2;
      this.parts.push({ obj: s, vel: new THREE.Vector3(Math.cos(a) * 3, 2 + Math.random() * 2, Math.sin(a) * 3), life: 0.5, max: 0.5, gravity: 6, spin: 0, grow: -0.2, fade: true });
    }
  }

  splash(at: THREE.Vector3, power = 1, waterY = at.y) {
    const n = Math.round(22 * power);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.dropGeo, this.dropMat);
      const s = 0.025 + Math.random() * 0.035 * Math.min(power, 1.2);
      m.scale.setScalar(s);
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const sp = (1 + Math.random() * 2.5) * power;
      this.group.add(m);
      this.parts.push({ obj: m, vel: new THREE.Vector3(Math.cos(a) * sp, 2.5 + Math.random() * 3.5 * power, Math.sin(a) * sp), life: 1.2, max: 1.2, gravity: 11, spin: 0, grow: 0, fade: false, onWaterKill: waterY });
    }
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.set(at.x, waterY + 0.02, at.z);
    this.group.add(ring);
    this.parts.push({ obj: ring, vel: new THREE.Vector3(), life: 0.7, max: 0.7, gravity: 0, spin: 0, grow: 3.5, fade: true });
  }

  confetti(at: THREE.Vector3, n = 70) {
    const cols = ['#ff7eb6', '#2ec4b6', '#ffd84a', '#ffffff', '#a8e6cf', '#ff5fa2'];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.confettiGeo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      this.group.add(m);
      this.parts.push({ obj: m, vel: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 4, Math.sin(a) * sp), life: 2.6, max: 2.6, gravity: 5, spin: 8 + Math.random() * 8, grow: 0, fade: true });
    }
  }

  emojiBurst(at: THREE.Vector3, emoji: string, n = 8, size = 0.4, rain = false) {
    const tex = emojiTexture(emoji);
    for (let i = 0; i < n; i++) {
      const s = this.sprite(tex, size * (0.7 + Math.random() * 0.6));
      if (rain) {
        s.position.set(at.x + (Math.random() - 0.5) * 2.2, at.y + 1.8 + Math.random() * 1.5, at.z + (Math.random() - 0.5) * 2.2);
        this.parts.push({ obj: s, vel: new THREE.Vector3(0, -1.5 - Math.random(), 0), life: 2.2, max: 2.2, gravity: 2, spin: 0, grow: 0, fade: true });
      } else {
        s.position.copy(at);
        const a = Math.random() * Math.PI * 2;
        this.parts.push({ obj: s, vel: new THREE.Vector3(Math.cos(a) * 0.8, 1.6 + Math.random() * 1.4, Math.sin(a) * 0.8), life: 1.6, max: 1.6, gravity: 0.6, spin: 0, grow: 0.2, fade: true });
      }
    }
  }

  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.orbit) {
        p.orbit.a += p.orbit.speed * dt;
        const c = p.orbit.center();
        p.obj.position.set(c.x + Math.cos(p.orbit.a) * p.orbit.r, c.y + p.orbit.y + Math.sin(p.orbit.a * 2) * 0.05, c.z + Math.sin(p.orbit.a) * p.orbit.r);
      } else {
        p.vel.y -= p.gravity * dt;
        p.obj.position.addScaledVector(p.vel, dt);
        if (p.spin) {
          p.obj.rotation.x += p.spin * dt;
          p.obj.rotation.z += p.spin * 0.7 * dt;
          p.vel.multiplyScalar(1 - 1.5 * dt);
        }
      }
      if (p.grow) {
        const s = p.obj.scale.x * (1 + p.grow * dt);
        p.obj.scale.setScalar(Math.max(0.001, s));
      }
      const mat = (p.obj as THREE.Mesh).material as THREE.Material & { opacity: number };
      if (p.fade && mat) mat.opacity = Math.min(1, (p.life / p.max) * 2);
      const dead = p.life <= 0 || (p.onWaterKill !== undefined && p.vel.y < 0 && p.obj.position.y < p.onWaterKill);
      if (dead) {
        this.group.remove(p.obj);
        if (mat && mat !== this.dropMat) mat.dispose?.();
        this.parts.splice(i, 1);
      }
    }
  }
}
