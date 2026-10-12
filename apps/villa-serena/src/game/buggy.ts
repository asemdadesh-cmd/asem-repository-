// The SketchUp beach buggy as a real vehicle: Rapier's ray-cast vehicle model
// (spring/damper suspension, tyre friction slip, rear-wheel drive, braking),
// with a lowered centre of mass so it corners like a small car. The wheels,
// suspension travel and steering wheel of the SketchUp model are animated
// from the simulation.
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type BodyLink, type Physics } from '../engine/physics.ts';
import type { AssetTemplate, Kit } from '../engine/kit.ts';

const MASS = 420;
const TOP = 9.5; // m/s ≈ 34 km/h
const REVERSE = 3.5;
const ENGINE = 900; // N per driven wheel at standstill
const RADIUS = 0.28;
const REST = 0.22;
const LOADED = 0.15; // suspension length at rest under the car's weight

export interface DriveInput {
  throttle: number;
  steer: number;
  brake: number;
}

interface Wheel {
  node: THREE.Object3D;
  base: THREE.Matrix4; // model-local transform of the wheel at rest
  front: boolean;
}

export class Buggy {
  readonly id = 'buggy';
  readonly object: THREE.Object3D;
  readonly body: RAPIER.RigidBody;
  readonly link: BodyLink;
  readonly vehicle: RAPIER.DynamicRayCastVehicleController;
  readonly template: AssetTemplate;
  private wheels: Wheel[] = [];
  private steeringWheel: { node: THREE.Object3D; base: THREE.Quaternion; axis: THREE.Vector3 } | null = null;
  input: DriveInput = { throttle: 0, steer: 0, brake: 0 };
  /** driven by this client (otherwise it follows the network) */
  local = true;
  occupied = { driver: null as string | null, passenger: null as string | null };
  steer = 0;
  speed = 0;
  private upsideDown = 0;
  private spin: number[] = [0, 0, 0, 0];

  constructor(
    physics: Physics,
    kit: Kit,
    matrix: THREE.Matrix4,
  ) {
    this.template = kit.get('Buggy');
    this.object = kit.instance('Buggy');
    this.object.name = 'buggy';
    matrix.decompose(this.object.position, this.object.quaternion, this.object.scale);
    const p = this.object.position;
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(p.x, p.y + 0.12, p.z)
      .setRotation(this.object.quaternion)
      .setAdditionalMassProperties(MASS, { x: 0, y: 0.34, z: -0.08 }, { x: 260, y: 300, z: 90 }, { x: 0, y: 0, z: 0, w: 1 })
      .setLinearDamping(0.05)
      .setAngularDamping(0.4)
      .setCcdEnabled(true)
      .setCanSleep(true);
    this.body = physics.world.createRigidBody(desc);
    for (const c of this.template.colliders) {
      if (c.name === 'Wheel') continue;
      const pos = new THREE.Vector3();
      const q = new THREE.Quaternion();
      c.matrix.decompose(pos, q, new THREE.Vector3());
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(c.half.x, c.half.y, c.half.z)
          .setTranslation(pos.x, pos.y, pos.z)
          .setRotation(q)
          .setDensity(0)
          .setFriction(0.5)
          .setCollisionGroups(groups(GROUP.VEHICLE, 0xffff)),
        this.body,
      );
    }
    this.link = physics.link(this.body, this.object);

    this.vehicle = physics.world.createVehicleController(this.body);
    this.vehicle.indexUpAxis = 1;
    this.vehicle.setIndexForwardAxis = 2;
    const markers = this.template.markers.filter((m) => m.kind === 'WHEEL');
    for (const m of markers) {
      const at = new THREE.Vector3().setFromMatrixPosition(m.matrix);
      this.vehicle.addWheel({ x: at.x, y: at.y + LOADED, z: at.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, RADIUS);
      const i = this.vehicle.numWheels() - 1;
      this.vehicle.setWheelSuspensionStiffness(i, 32);
      this.vehicle.setWheelSuspensionCompression(i, 4.2);
      this.vehicle.setWheelSuspensionRelaxation(i, 3.2);
      this.vehicle.setWheelMaxSuspensionTravel(i, 0.18);
      this.vehicle.setWheelMaxSuspensionForce(i, 12000);
      this.vehicle.setWheelFrictionSlip(i, 1.6);
      this.vehicle.setWheelSideFrictionStiffness(i, 1.0);
      const node = this.object.getObjectByName(`Wheel_${m.name}`);
      if (node) this.wheels.push({ node, base: node.matrix.clone(), front: m.name.startsWith('F') });
      else this.wheels.push({ node: new THREE.Object3D(), base: new THREE.Matrix4(), front: m.name.startsWith('F') });
    }
    const sw = this.object.getObjectByName('Steering_Wheel');
    if (sw) {
      // the rim lies in the part's local XZ plane (SketchUp XY), so it turns about local Y
      const axis = new THREE.Vector3(0, 1, 0);
      this.steeringWheel = { node: sw, base: sw.quaternion.clone(), axis };
    }
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  get heading(): number {
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    return Math.atan2(f.x, f.z);
  }

  /** Fixed step: engine, brakes, steering, suspension. */
  step(dt: number) {
    if (!this.local) return;
    const v = this.vehicle;
    this.speed = v.currentVehicleSpeed();
    const driven = this.occupied.driver !== null;
    const { throttle, steer, brake } = driven ? this.input : { throttle: 0, steer: 0, brake: 1 };
    // steering: quick at low speed, gentle at speed (positive = left)
    const maxSteer = 0.6 * (1 - 0.55 * Math.min(1, Math.abs(this.speed) / TOP));
    const goal = -steer * maxSteer;
    this.steer += THREE.MathUtils.clamp(goal - this.steer, -2.2 * dt, 2.2 * dt);
    v.setWheelSteering(0, this.steer);
    v.setWheelSteering(1, this.steer);
    // engine: torque falls off toward top speed; pressing against the motion brakes
    let force = 0;
    let brakeF = brake * 18;
    if (throttle > 0.05) {
      if (this.speed < -0.4) brakeF = Math.max(brakeF, 14 * throttle);
      else force = ENGINE * throttle * Math.max(0, 1 - this.speed / TOP);
    } else if (throttle < -0.05) {
      if (this.speed > 0.4) brakeF = Math.max(brakeF, 14 * -throttle);
      else force = ENGINE * 0.8 * throttle * Math.max(0, 1 + this.speed / REVERSE);
    } else {
      brakeF = Math.max(brakeF, driven ? 0.6 : 6); // rolling resistance / parking brake
    }
    for (let i = 0; i < 4; i++) {
      const rear = i >= 2;
      v.setWheelEngineForce(i, rear ? force : 0);
      v.setWheelBrake(i, rear ? brakeF : brakeF * 0.6);
    }
    if (driven && (Math.abs(throttle) > 0.05 || Math.abs(this.speed) > 0.05)) this.body.wakeUp();
    v.updateVehicle(dt, undefined, groups(0xffff, GROUP.STATIC | GROUP.DYNAMIC), (c) => c.parent()?.handle !== this.body.handle);
    // flipped over for a while → set it back on its wheels
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.object.quaternion);
    this.upsideDown = up.y < 0.25 ? this.upsideDown + dt : 0;
  }

  get flipped() {
    return this.upsideDown > 1.5;
  }

  /** Back on its wheels where it is, facing the same way. */
  reset(ground: (x: number, z: number) => number) {
    const t = this.body.translation();
    const h = this.heading;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), h);
    this.body.setTranslation({ x: t.x, y: Math.max(t.y, ground(t.x, t.z)) + 0.6, z: t.z }, true);
    this.body.setRotation(q, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.upsideDown = 0;
  }

  /** Visual wheels: spin, steer and suspension travel. */
  updateVisual(dt: number) {
    const v = this.vehicle;
    const tmp = new THREE.Matrix4();
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      let travel = 0;
      if (this.local) {
        const len = v.wheelSuspensionLength(i) ?? LOADED;
        travel = LOADED - len;
        this.spin[i] = v.wheelRotation(i) ?? this.spin[i];
      } else {
        this.spin[i] += (this.speed / RADIUS) * dt;
      }
      const steer = w.front ? this.steer : 0;
      tmp.copy(w.base);
      tmp.multiply(new THREE.Matrix4().makeRotationY(steer));
      tmp.multiply(new THREE.Matrix4().makeRotationX(this.spin[i]));
      tmp.elements[13] += travel;
      w.node.matrix.copy(tmp);
      w.node.matrixAutoUpdate = false;
      w.node.matrixWorldNeedsUpdate = true;
    }
    if (this.steeringWheel) {
      const s = this.steeringWheel;
      s.node.quaternion.copy(s.base).multiply(new THREE.Quaternion().setFromAxisAngle(s.axis, this.steer * 2.6));
    }
  }

  /** Network-driven: kinematic, follows snapshots. */
  setLocal(local: boolean) {
    if (local === this.local) return;
    this.local = local;
    this.body.setBodyType(local ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
  }
}
