// One InstancedMesh = every confetti / sparkle / puff particle in a single draw call.
import * as THREE from 'three';

const MAX = 320;
const _d = new THREE.Object3D();
const _c = new THREE.Color();

export class Particles {
  constructor(scene) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(g, m, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _c.set(0xffffff));
    this.p = Array.from({ length: MAX }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0.1, g: 10, spin: 0 }));
    this.next = 0;
    this.reduced = false;
    for (let i = 0; i < MAX; i++) {
      _d.position.set(0, -50, 0);
      _d.scale.setScalar(0);
      _d.updateMatrix();
      this.mesh.setMatrixAt(i, _d.matrix);
    }
    scene.add(this.mesh);
  }

  spawn(x, y, z, vx, vy, vz, color, size, life, gravity) {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    Object.assign(this.p[i], { life, max: life, x, y, z, vx, vy, vz, size, g: gravity });
    this.mesh.setColorAt(i, _c.set(color));
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Radial burst: stars collected, bonks, power-ups. */
  burst(pos, color, n = 10, speed = 5, size = 0.12, life = 0.6, gravity = 10) {
    if (this.reduced) n = Math.ceil(n / 2.5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const r = Math.sqrt(1 - u * u);
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(pos.x, pos.y, pos.z, Math.cos(a) * r * s, u * s + 1.5, Math.sin(a) * r * s, color, size * (0.6 + Math.random() * 0.8), life * (0.7 + Math.random() * 0.6), gravity);
    }
  }

  /** Falling multicolour confetti from above the player. */
  confetti(x, y, z, n = 40) {
    if (this.reduced) n = Math.ceil(n / 3);
    const cols = ['#ff5c8a', '#ffd23f', '#5cd6ff', '#7cf2a0', '#b58cff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * 4, y + 2 + Math.random() * 2.5, z + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, cols[i % cols.length], 0.1 + Math.random() * 0.1, 1.3 + Math.random() * 0.8, 6);
    }
  }

  /** A small puff behind the feet. */
  puff(x, y, z, color = '#ffffff') {
    if (this.reduced && Math.random() < 0.6) return;
    this.spawn(x + (Math.random() - 0.5) * 0.5, y, z, (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), 0.4 + Math.random(), color, 0.07 + Math.random() * 0.05, 0.35, 1);
  }

  update(dt, worldSpeed) {
    const p = this.p;
    for (let i = 0; i < MAX; i++) {
      const q = p[i];
      if (q.life <= 0) {
        if (q.size !== 0) {
          q.size = 0;
          _d.position.set(0, -50, 0);
          _d.scale.setScalar(0);
          _d.updateMatrix();
          this.mesh.setMatrixAt(i, _d.matrix);
        }
        continue;
      }
      q.life -= dt;
      q.vy -= q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += (q.vz + worldSpeed) * dt;
      const k = Math.max(0, q.life / q.max);
      _d.position.set(q.x, q.y, q.z);
      _d.rotation.set(q.life * 6, q.life * 4, 0);
      _d.scale.setScalar(q.size * Math.min(1, k * 2.5));
      _d.updateMatrix();
      this.mesh.setMatrixAt(i, _d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
