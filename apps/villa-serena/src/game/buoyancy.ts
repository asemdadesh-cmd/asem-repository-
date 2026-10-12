// Archimedes for every movable thing: each body is sampled at a few points on
// its hull; the part of each sample cell under the surface pushes up with the
// weight of the water it displaces (ρ·g·V), applied at that point so floating
// things self-right and bob on the swell. Water drag slows them down.
import * as THREE from 'three';
import type { RAPIER } from '../engine/physics.ts';
import type { Waterline } from './waterline.ts';

const RHO = 1000;
const G = 9.81;

export interface Floater {
  body: RAPIER.RigidBody;
  /** local sample points (body space) and the volume each one stands for */
  points: THREE.Vector3[];
  cell: number; // m³ per point
  height: number; // vertical extent of a cell (m)
  drag: THREE.Vector3; // linear drag coefficients in body space (x, y, z)
  angularDrag: number;
  /** last frame's submerged fraction (0..1), for splashes and sound */
  wet: number;
}

/**
 * A floater from a body-space box. `fill` is how much of the box is actually
 * displacing water (a hull is not a solid brick; a ball fills ~52 %).
 */
export function boxFloater(body: RAPIER.RigidBody, min: THREE.Vector3, max: THREE.Vector3, fill: number, nx = 2, nz = 2, drag = new THREE.Vector3(30, 60, 30)): Floater {
  const size = max.clone().sub(min);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) points.push(new THREE.Vector3(min.x + ((i + 0.5) / nx) * size.x, min.y, min.z + ((k + 0.5) / nz) * size.z));
  return { body, points, cell: (size.x * size.y * size.z * fill) / points.length, height: size.y, drag, angularDrag: 0.6, wet: 0 };
}

export class Buoyancy {
  readonly floaters: Floater[] = [];
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private up = new THREE.Vector3();

  constructor(private water: Waterline) {}

  add(f: Floater) {
    this.floaters.push(f);
    return f;
  }

  remove(body: RAPIER.RigidBody) {
    const i = this.floaters.findIndex((f) => f.body === body);
    if (i >= 0) this.floaters.splice(i, 1);
  }

  step(dt: number) {
    for (const f of this.floaters) {
      const b = f.body;
      if (!b.isDynamic() || !b.isEnabled()) continue;
      const t = b.translation();
      this.p.set(t.x, t.y, t.z);
      // cheap reject: far above any water
      const surfC = this.water.surfaceAt(this.p);
      if (surfC === null || t.y - f.height * 2 > surfC + 0.6) {
        f.wet = 0;
        continue;
      }
      const r = b.rotation();
      this.q.set(r.x, r.y, r.z, r.w);
      this.up.set(0, 1, 0).applyQuaternion(this.q);
      let wet = 0;
      for (const lp of f.points) {
        // the sample cell's column runs from the point up along the body's up axis
        const wp = this.v.copy(lp).applyQuaternion(this.q).add(this.p);
        const s = this.water.surfaceAt(wp);
        if (s === null) continue;
        const span = Math.max(0.02, f.height * Math.max(0.2, Math.abs(this.up.y)));
        const sub = THREE.MathUtils.clamp((s - wp.y) / span, 0, 1);
        if (sub <= 0) continue;
        wet += sub;
        const force = RHO * G * f.cell * sub;
        // apply at the centre of the submerged part of the cell
        const ay = wp.y + Math.min(span, s - wp.y) * 0.5;
        b.addForceAtPoint({ x: 0, y: force, z: 0 }, { x: wp.x, y: ay, z: wp.z }, true);
      }
      f.wet = wet / f.points.length;
      if (f.wet <= 0) continue;
      // drag in the body frame (keels resist sideways, hulls glide forward)
      const lv = b.linvel();
      const inv = this.q.clone().invert();
      const local = new THREE.Vector3(lv.x, lv.y, lv.z).applyQuaternion(inv);
      const m = b.mass();
      // even a shallow-floating hull is fully "in" the water for damping purposes
      const k = Math.min(1, f.wet * 4);
      local.set(-local.x * Math.abs(local.x) * f.drag.x - local.x * 0.2 * m, -local.y * Math.abs(local.y) * f.drag.y - local.y * 7 * m, -local.z * Math.abs(local.z) * f.drag.z - local.z * 0.2 * m).multiplyScalar(k);
      local.applyQuaternion(this.q);
      // never let drag reverse the motion in one step
      const maxF = (Math.hypot(lv.x, lv.y, lv.z) * m) / dt;
      if (local.length() > maxF) local.setLength(maxF);
      b.addForce({ x: local.x, y: local.y, z: local.z }, true);
      const av = b.angvel();
      const damp = Math.min(1, f.angularDrag * k * dt * 6);
      b.setAngvel({ x: av.x * (1 - damp), y: av.y * (1 - damp * 0.6), z: av.z * (1 - damp) }, true);
    }
  }

  /** Forces are per step: call after each world step. Rapier keeps user forces
   * AND torques (addForceAtPoint adds both) until reset, so clear both. */
  clear() {
    for (const f of this.floaters) {
      f.body.resetForces(false);
      f.body.resetTorques(false);
    }
  }
}
