// Third-person camera: orbits the player, eases behind them while they move,
// pulls in when walls or trees get between, never dips under the ground and
// frames vehicles from further back. Under water the view turns green-blue.
import * as THREE from 'three';
import { GROUP, type Physics } from '../engine/physics.ts';

export type CameraMode = 'foot' | 'seat' | 'vehicle' | 'boat';

const PRESET: Record<CameraMode, { dist: number; min: number; max: number; height: number }> = {
  foot: { dist: 4.6, min: 1.6, max: 14, height: 1.45 },
  seat: { dist: 3.6, min: 1.4, max: 12, height: 1.0 },
  vehicle: { dist: 6.2, min: 3, max: 16, height: 1.5 },
  boat: { dist: 6.5, min: 3, max: 16, height: 1.2 },
};

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = Math.PI;
  pitch = 0.28;
  mode: CameraMode = 'foot';
  private dist = PRESET.foot.dist;
  private want = PRESET.foot.dist;
  private actual = PRESET.foot.dist;
  private height = PRESET.foot.height;
  readonly target = new THREE.Vector3();
  /** current distance from the focus (shorter than wanted when something is in the way) */
  get distance() {
    return this.actual;
  }
  private dir = new THREE.Vector3();
  private initialised = false;

  constructor(
    private physics: Physics,
    mobile: boolean,
  ) {
    this.camera = new THREE.PerspectiveCamera(mobile ? 62 : 55, 1, 0.1, 3000);
  }

  setMode(m: CameraMode) {
    if (m === this.mode) return;
    this.mode = m;
    this.want = PRESET[m].dist;
  }

  look(dx: number, dy: number) {
    this.yaw -= dx * 0.0052;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0042, -0.55, 1.25);
  }

  zoom(d: number) {
    const p = PRESET[this.mode];
    this.want = THREE.MathUtils.clamp(this.want + d * (this.want / 6), p.min, p.max);
  }

  /** Movement axes relative to the view (on the ground plane). */
  basis(fwd: THREE.Vector3, right: THREE.Vector3) {
    fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    right.set(-fwd.z, 0, fwd.x);
  }

  snapBehind(heading: number) {
    this.yaw = heading + Math.PI;
  }

  update(dt: number, focus: THREE.Vector3, heading: number, follow: number, lookIdle: number, groundAt: (x: number, z: number) => number) {
    const p = PRESET[this.mode];
    // ease behind the direction of travel once the user stops steering the view
    if (follow > 0 && lookIdle > 1.2) {
      let d = heading + Math.PI - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * follow);
      if (this.mode === 'vehicle' || this.mode === 'boat') this.pitch += (0.22 - this.pitch) * Math.min(1, dt * 0.8);
    }
    this.dist += (this.want - this.dist) * (1 - Math.exp(-8 * dt));
    this.height += (p.height - this.height) * (1 - Math.exp(-4 * dt));
    const want = new THREE.Vector3(focus.x, focus.y + this.height, focus.z);
    if (!this.initialised) {
      this.target.copy(want);
      this.initialised = true;
    } else {
      const k = 1 - Math.exp(-(this.mode === 'vehicle' ? 14 : 11) * dt);
      this.target.lerp(want, k);
    }
    const c = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * c, Math.sin(this.pitch), Math.cos(this.yaw) * c).normalize();
    // keep walls, trees and the house from blocking the view
    const hit = this.physics.ray(this.target, this.dir, this.dist + 0.3, GROUP.STATIC | GROUP.CAMERA);
    const free = hit === null ? this.dist : Math.max(0.4, hit - 0.3);
    this.actual = free < this.actual ? free : this.actual + (free - this.actual) * (1 - Math.exp(-3 * dt));
    const pos = this.target.clone().addScaledVector(this.dir, this.actual);
    const g = groundAt(pos.x, pos.z) + 0.3;
    if (pos.y < g) pos.y = g;
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }
}
