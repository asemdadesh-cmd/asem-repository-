// Movable things you can pick up, carry, put down, throw and kick. A carried
// prop becomes kinematic and follows the hands; letting go hands it back to
// the simulation with the velocity you gave it, so a beach ball sails and a
// 14 kg crate barely leaves your hands (same throwing energy, F = ma).
import * as THREE from 'three';
import { RAPIER, GROUP, type Physics } from '../engine/physics.ts';
import type { DynamicProp, World } from '../world/World.ts';

const THROW_ENERGY = 55; // joules a relaxed throw puts into an object
const NO_CARRY = new Set(['Lounger', 'Kayak', 'Barrel', 'SideTable']);

export function canCarry(p: DynamicProp): boolean {
  return (p.placement.mass ?? 10) <= 15 && !NO_CARRY.has(p.placement.asset);
}

export function isBall(p: DynamicProp): boolean {
  return p.placement.shape === 'ball';
}

export interface Held {
  prop: DynamicProp;
  yawOffset: number; // prop yaw relative to the carrier
  lift: number; // height of the hold point above the feet
  reach: number; // distance in front of the body
  bottom: number; // local min y of the prop
}

export class PropSystem {
  private tmpQ = new THREE.Quaternion();
  private bumpCool = new Map<number, number>();
  /** called when this client starts simulating a prop (claim ownership) */
  onTouch: (p: DynamicProp) => void = () => {};

  constructor(
    private physics: Physics,
    private world: World,
  ) {}

  byBody(body: RAPIER.RigidBody | null): DynamicProp | undefined {
    if (!body) return undefined;
    return this.world.dynamics.find((d) => d.link.body.handle === body.handle);
  }

  /** The best prop within reach in front of `at` facing `yaw`. */
  nearest(at: THREE.Vector3, yaw: number, reach: number, filter: (p: DynamicProp) => boolean): DynamicProp | null {
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    let best: DynamicProp | null = null;
    let bestScore = Infinity;
    for (const d of this.world.dynamics) {
      if (!filter(d) || d.heldBy) continue;
      const p = d.object.position;
      const dx = p.x - at.x;
      const dz = p.z - at.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + d.radius || Math.abs(p.y - at.y) > 1.6) continue;
      const facing = dist > 0.01 ? (dx * fwd.x + dz * fwd.z) / dist : 1;
      if (facing < -0.2) continue;
      const score = dist - facing * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  pickUp(p: DynamicProp, by: string, carrierYaw: number): Held {
    const b = p.link.body;
    b.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    p.heldBy = by;
    this.onTouch(p);
    const r = b.rotation();
    const e = new THREE.Euler().setFromQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w), 'YXZ');
    const size = p.template.bounds.getSize(new THREE.Vector3()).multiply(p.object.scale);
    const reach = 0.3 + Math.max(size.x, size.z) * 0.5;
    const lift = THREE.MathUtils.clamp(1.15 - size.y * 0.5, 0.55, 1.05);
    return { prop: p, yawOffset: e.y - carrierYaw, lift, reach, bottom: p.template.bounds.min.y * p.object.scale.y };
  }

  /** Called every fixed step while carrying. */
  hold(h: Held, feet: THREE.Vector3, yaw: number) {
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const at = feet.clone().addScaledVector(fwd, h.reach);
    at.y += h.lift - h.bottom * 0.5;
    const q = this.tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + h.yawOffset);
    const b = h.prop.link.body;
    b.setNextKinematicTranslation(at);
    b.setNextKinematicRotation(q);
  }

  /** Let go: `v` is the release velocity (zero to just drop it). */
  release(h: Held, v: THREE.Vector3, spin = 0) {
    const b = h.prop.link.body;
    b.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    b.setLinvel(v, true);
    b.setAngvel({ x: (Math.random() - 0.5) * spin, y: (Math.random() - 0.5) * spin, z: (Math.random() - 0.5) * spin }, true);
    h.prop.heldBy = null;
  }

  /** Release speed for a throw: the same arm energy into any mass, capped. */
  throwVelocity(h: Held, yaw: number, carrierVel: THREE.Vector3): THREE.Vector3 {
    const m = h.prop.placement.mass ?? 10;
    const speed = Math.min(12, Math.sqrt((2 * THROW_ENERGY) / m));
    const dir = new THREE.Vector3(Math.sin(yaw), 0.42, Math.cos(yaw)).normalize();
    return dir.multiplyScalar(speed).add(new THREE.Vector3(carrierVel.x, 0, carrierVel.z));
  }

  /** Put it down in front of you, upright, resting on whatever is there. */
  placeDown(h: Held, feet: THREE.Vector3, yaw: number) {
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const at = feet.clone().addScaledVector(fwd, h.reach + 0.1);
    const from = at.clone();
    from.y += 1.6;
    const hit = this.physics.ray(from, new THREE.Vector3(0, -1, 0), 4, GROUP.STATIC | GROUP.DYNAMIC);
    const floor = hit === null ? feet.y : from.y - hit;
    const b = h.prop.link.body;
    b.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    b.setTranslation({ x: at.x, y: floor - h.bottom + 0.02, z: at.z }, true);
    b.setRotation(this.tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + h.yawOffset), true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    h.prop.heldBy = null;
  }

  /** A kick: balls fly, furniture gets a shove. Returns what was kicked. */
  kick(feet: THREE.Vector3, yaw: number): DynamicProp | null {
    const target = this.nearest(feet, yaw, 0.95, () => true);
    if (!target) return null;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const m = target.placement.mass ?? 10;
    const v = isBall(target) ? 13 : Math.min(3, 70 / m);
    const lift = isBall(target) ? 0.38 : 0.12;
    const imp = fwd.clone().add(new THREE.Vector3(0, lift, 0)).normalize().multiplyScalar(v * m);
    const b = target.link.body;
    b.wakeUp();
    b.applyImpulse(imp, true);
    if (isBall(target)) b.setAngvel({ x: fwd.z * -12, y: (Math.random() - 0.5) * 6, z: fwd.x * 12 }, true);
    this.onTouch(target);
    return target;
  }

  /** Walking into a ball dribbles it ahead of you. */
  bump(body: RAPIER.RigidBody, dir: THREE.Vector3, speed: number, now: number) {
    const p = this.byBody(body);
    if (!p || p.heldBy) return;
    this.onTouch(p);
    if (!isBall(p) || speed < 0.4) return;
    if ((this.bumpCool.get(body.handle) ?? 0) > now) return;
    this.bumpCool.set(body.handle, now + 0.3);
    const m = p.placement.mass ?? 0.4;
    const v = new THREE.Vector3(dir.x, 0, dir.z).normalize().multiplyScalar(speed * 1.35 + 0.6);
    v.y = 0.6;
    body.applyImpulse(v.multiplyScalar(m), true);
  }
}
