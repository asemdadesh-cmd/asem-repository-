// The player's body: a Rapier kinematic character controller (a capsule) that
// walks, jogs and sprints with real acceleration, climbs steps and stairs,
// slides off steep slopes, pushes movable props with its 72 kg, jumps and
// falls under real gravity, wades (slower in deep water) and swims at the
// surface of the sea or the pool, and can climb out over a pool edge.
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type Physics } from '../engine/physics.ts';
import type { MoveMode } from './avatar.ts';

export const CAPSULE = { radius: 0.3, half: 0.55 } as const;
const BODY_GROUPS = groups(GROUP.PLAYER, GROUP.STATIC | GROUP.DYNAMIC | GROUP.VEHICLE | GROUP.PROP_SMALL | GROUP.PLAYER);
const CENTRE = CAPSULE.radius + CAPSULE.half; // feet → capsule centre
const G = 9.81;
export const SPEED = { walk: 1.55, jog: 3.4, sprint: 5.9, swim: 1.15, swimFast: 1.9 } as const;
const JUMP_V = 3.9; // ≈ 0.78 m standing jump
const SWIM_DEPTH = 1.22; // water above the feet at which you start swimming (chest height)
const FLOAT = 1.3; // feet this far under the surface while swimming

export interface MoveIntent {
  /** desired direction on the ground plane, length 0..1 */
  dir: THREE.Vector3;
  pace: 'walk' | 'jog' | 'sprint';
  jump: boolean;
}

export interface ControllerEvents {
  jump(): void;
  land(fallSpeed: number): void;
  splash(speed: number, at: THREE.Vector3): void;
  step(surface: string): void;
  climb(): void;
  bump(collider: RAPIER.Collider, normal: THREE.Vector3, speed: number): void;
}

export interface WaterQuery {
  /** water surface height at a point, or null if there is no water there */
  surfaceAt(p: THREE.Vector3): number | null;
  /** ground height under the point (terrain or architecture), for footstep surfaces */
  surfaceKind(p: THREE.Vector3): string;
}

export class CharacterController {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private kcc: RAPIER.KinematicCharacterController;
  /** feet position after the latest fixed step, and the one before (for interpolation) */
  readonly position = new THREE.Vector3();
  readonly prev = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  prevYaw = 0;
  mode: MoveMode = 'ground';
  grounded = true;
  /** horizontal speed actually achieved (m/s), for animation and sound */
  speed = 0;
  water: number | null = null;
  enabled = true;
  /** bodies the capsule passes through (what you are carrying) */
  readonly ignore = new Set<number>();
  private coyote = 0;
  private jumpBuffer = 0;
  private stride = 0;
  private fallFrom = 0;
  private climbing: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private tmp = new THREE.Vector3();
  private intent: MoveIntent = { dir: new THREE.Vector3(), pace: 'jog', jump: false };

  constructor(
    private physics: Physics,
    private waterQuery: WaterQuery,
    private events: Partial<ControllerEvents>,
    at: THREE.Vector3,
    yaw = 0,
  ) {
    const w = physics.world;
    this.body = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(at.x, at.y + CENTRE, at.z));
    this.collider = w.createCollider(
      RAPIER.ColliderDesc.capsule(CAPSULE.half, CAPSULE.radius).setCollisionGroups(BODY_GROUPS),
      this.body,
    );
    this.kcc = w.createCharacterController(0.02);
    this.kcc.setUp({ x: 0, y: 1, z: 0 });
    this.kcc.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(48));
    this.kcc.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(55));
    this.kcc.enableAutostep(0.36, 0.18, false);
    this.kcc.enableSnapToGround(0.32);
    this.kcc.setApplyImpulsesToDynamicBodies(true);
    this.kcc.setCharacterMass(72);
    this.kcc.setSlideEnabled(true);
    this.position.copy(at);
    this.prev.copy(at);
    this.yaw = this.prevYaw = yaw;
  }

  setIntent(i: MoveIntent) {
    this.intent.dir.copy(i.dir);
    this.intent.pace = i.pace;
    if (i.jump) this.jumpBuffer = 0.15;
  }

  /** Puts the character somewhere (spawn, teleport, leaving a seat). */
  teleport(at: THREE.Vector3, yaw?: number) {
    this.position.copy(at);
    this.prev.copy(at);
    this.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = this.prevYaw = yaw;
    this.body.setTranslation({ x: at.x, y: at.y + CENTRE, z: at.z }, true);
    this.body.setNextKinematicTranslation({ x: at.x, y: at.y + CENTRE, z: at.z });
    this.mode = 'ground';
    this.climbing = null;
  }

  /** Seated/driving: the capsule is switched off and the seat drives the pose. */
  setEnabled(on: boolean) {
    this.enabled = on;
    this.collider.setEnabled(on);
    this.velocity.set(0, 0, 0);
  }

  /** One fixed physics step (called from Physics.preStep). */
  step(dt: number, time: number) {
    this.prev.copy(this.position);
    this.prevYaw = this.yaw;
    if (!this.enabled) return;
    if (this.climbing) return this.stepClimb(dt);

    const p = this.position;
    const water = this.waterQuery.surfaceAt(p);
    this.water = water;
    const depth = water === null ? 0 : water - p.y;
    const wasSwim = this.mode === 'swim';
    if (!wasSwim && depth > SWIM_DEPTH && !this.grounded) this.enterSwim(water!);
    else if (!wasSwim && depth > SWIM_DEPTH + 0.15) this.enterSwim(water!);
    else if (wasSwim && (water === null || depth < SWIM_DEPTH - 0.18)) this.mode = 'ground';

    const swim = this.mode === 'swim';
    const dir = this.intent.dir;
    const mag = Math.min(1, dir.length());
    let target = 0;
    if (swim) target = (this.intent.pace === 'sprint' ? SPEED.swimFast : SPEED.swim) * mag;
    else target = SPEED[this.intent.pace] * mag;
    // wading: water above the knees slows you down
    if (!swim && depth > 0.35) target *= 1 - 0.55 * THREE.MathUtils.smoothstep(depth, 0.35, 1.25);

    // horizontal velocity with real-feeling acceleration / braking
    const hv = this.tmp.set(this.velocity.x, 0, this.velocity.z);
    const want = new THREE.Vector3(dir.x, 0, dir.z);
    if (mag > 1e-3) want.normalize().multiplyScalar(target);
    const airborne = !swim && !this.grounded;
    const accel = swim ? 2.2 : airborne ? 1.6 : want.lengthSq() > hv.lengthSq() ? 9 : 13;
    const dv = want.sub(hv);
    const maxDv = accel * dt;
    if (dv.length() > maxDv) dv.setLength(maxDv);
    this.velocity.x += dv.x;
    this.velocity.z += dv.z;

    // facing follows the movement (quick on foot, lazy in water)
    if (mag > 0.05) {
      const goal = Math.atan2(dir.x, dir.z);
      let d = goal - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const rate = swim ? 3.5 : airborne ? 2.5 : 11;
      this.yaw += d * Math.min(1, rate * dt);
    }

    // vertical
    this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    this.jumpBuffer -= dt;
    if (swim) {
      const surf = water! - FLOAT + 0.04 * Math.sin(time * 2.1);
      this.velocity.y += ((surf - p.y) * 9 - this.velocity.y * 3.5) * dt;
      if (this.jumpBuffer > 0 && this.tryClimbOut(water!)) return;
    } else {
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.velocity.y = JUMP_V;
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.grounded = false;
        this.fallFrom = p.y;
        this.events.jump?.();
      }
      this.velocity.y = Math.max(this.velocity.y - G * dt, -50);
      if (depth > 0.2) this.velocity.y *= 1 - Math.min(1, 2.5 * dt); // water drag
    }

    // move the capsule through the world
    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
    const skip = this.ignore.size ? (c: RAPIER.Collider) => !this.ignore.has(c.parent()?.handle ?? -1) : undefined;
    this.kcc.computeColliderMovement(this.collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, BODY_GROUPS, skip);
    const m = this.kcc.computedMovement();
    const wasGrounded = this.grounded;
    this.grounded = !swim && this.kcc.computedGrounded();
    p.x += m.x;
    p.y += m.y;
    p.z += m.z;
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + CENTRE, z: p.z });

    // what we hit: stop rising at ceilings, report pushes on props
    if (this.velocity.y > 0 && m.y < desired.y * 0.5 && !swim) this.velocity.y = 0;
    for (let i = 0; i < this.kcc.numComputedCollisions(); i++) {
      const c = this.kcc.computedCollision(i);
      if (!c?.collider) continue;
      const parent = c.collider.parent();
      if (parent && parent.isDynamic()) {
        const n = new THREE.Vector3(c.normal1.x, c.normal1.y, c.normal1.z);
        this.events.bump?.(c.collider, n, Math.hypot(this.velocity.x, this.velocity.z));
      }
    }
    // the speed we really moved at (walls stop you, animation follows)
    const real = Math.hypot(m.x, m.z) / dt;
    this.speed += (real - this.speed) * Math.min(1, 14 * dt);
    if (this.grounded) {
      if (!wasGrounded) {
        const fall = Math.max(0, -this.velocity.y);
        if (fall > 2.2 || this.fallFrom - p.y > 0.5) this.events.land?.(fall);
      }
      this.velocity.y = -0.5;
      this.fallFrom = p.y;
    } else if (wasGrounded && this.velocity.y <= 0) {
      this.fallFrom = p.y;
    }

    // entering the water from above
    if (water !== null && !wasSwim && this.prev.y > water - 0.1 && p.y <= water - 0.1 && this.velocity.y < -1.5) {
      this.events.splash?.(-this.velocity.y, new THREE.Vector3(p.x, water, p.z));
    }

    // footsteps from distance travelled
    if ((this.grounded || swim) && real > 0.3) {
      this.stride += real * dt;
      const len = swim ? 1.4 : real < 2.2 ? 0.72 : real < 4.5 ? 1.05 : 1.45;
      if (this.stride > len) {
        this.stride = 0;
        this.events.step?.(swim ? 'swim' : depth > 0.15 ? 'water' : this.waterQuery.surfaceKind(p));
      }
    }

    this.mode = swim ? 'swim' : this.grounded ? 'ground' : 'air';
    if (p.y < -40) this.events.land?.(-1);
  }

  private enterSwim(water: number) {
    this.mode = 'swim';
    this.velocity.y *= 0.3;
    this.grounded = false;
    void water;
  }

  /** From the water, pull yourself up onto an edge that is close to the surface. */
  private tryClimbOut(water: number): boolean {
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const from = new THREE.Vector3().copy(this.position).addScaledVector(fwd, 0.62);
    from.y = water + 1.0;
    const hit = this.physics.ray(from, new THREE.Vector3(0, -1, 0), 1.6, GROUP.STATIC);
    if (hit === null) return false;
    const top = from.y - hit;
    if (top < water - 0.05 || top > water + 0.75) return false;
    // room to stand up there?
    const head = new THREE.Vector3(from.x, top + 0.2, from.z);
    if (this.physics.ray(head, new THREE.Vector3(0, 1, 0), 1.6, GROUP.STATIC) !== null) return false;
    this.jumpBuffer = 0;
    this.climbing = { from: this.position.clone(), to: new THREE.Vector3(from.x, top + 0.02, from.z).addScaledVector(fwd, 0.05), t: 0 };
    this.collider.setEnabled(false);
    this.events.climb?.();
    return true;
  }

  private stepClimb(dt: number) {
    const c = this.climbing!;
    c.t += dt / 0.85;
    const t = Math.min(1, c.t);
    // up first, then over the edge
    const up = THREE.MathUtils.smoothstep(t, 0, 0.65);
    const over = THREE.MathUtils.smoothstep(t, 0.35, 1);
    this.position.set(
      THREE.MathUtils.lerp(c.from.x, c.to.x, over),
      THREE.MathUtils.lerp(c.from.y, c.to.y, up),
      THREE.MathUtils.lerp(c.from.z, c.to.z, over),
    );
    this.body.setNextKinematicTranslation({ x: this.position.x, y: this.position.y + CENTRE, z: this.position.z });
    this.speed = 0;
    this.mode = 'air';
    if (t >= 1) {
      this.climbing = null;
      this.collider.setEnabled(true);
      this.velocity.set(0, 0, 0);
      this.mode = 'ground';
      this.grounded = true;
    }
  }

  get isClimbing() {
    return !!this.climbing;
  }

  /** Interpolated feet position for rendering. */
  renderPosition(alpha: number, out: THREE.Vector3): THREE.Vector3 {
    return out.lerpVectors(this.prev, this.position, alpha);
  }

  renderYaw(alpha: number): number {
    let d = this.yaw - this.prevYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return this.prevYaw + d * alpha;
  }

  dispose() {
    this.physics.world.removeCharacterController(this.kcc);
    this.physics.world.removeRigidBody(this.body);
  }
}
