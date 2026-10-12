// The SketchUp rowboat: a floating rigid body (buoyancy samples along the hull)
// moored to the pier with a rope. The rower faces the stern and pulls; each
// stroke's blade force is applied out at the blade, so rowing one side turns
// the boat. Oars sweep, square and feather through the stroke.
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type BodyLink, type Physics } from '../engine/physics.ts';
import type { Kit } from '../engine/kit.ts';
import { boxFloater, type Buoyancy, type Floater } from './buoyancy.ts';

const HULL_MASS = 120;
const PERSON = 70;
const STROKE = 1.7; // seconds per stroke
const BLADE_FORCE = 300; // N per oar at mid-drive

interface Oar {
  pivot: THREE.Object3D;
  side: number; // +1 = +X side
  power: number;
}

export class Rowboat {
  readonly id = 'rowboat';
  readonly object: THREE.Object3D;
  readonly body: RAPIER.RigidBody;
  readonly link: BodyLink;
  readonly floater: Floater;
  private oars: Oar[] = [];
  private mooring: RAPIER.ImpulseJoint | null = null;
  private anchor: RAPIER.RigidBody;
  readonly moorPoint: THREE.Vector3;
  phase = 0;
  rowing = 0; // 0..1 how hard the rower is pulling
  input = { x: 0, y: 0 };
  local = true;
  occupied = { row: null as string | null, stern: null as string | null };

  constructor(
    private physics: Physics,
    kit: Kit,
    at: THREE.Matrix4,
    buoyancy: Buoyancy,
  ) {
    const t = kit.get('Rowboat');
    this.object = kit.instance('Rowboat');
    this.object.name = 'rowboat';
    at.decompose(this.object.position, this.object.quaternion, this.object.scale);
    const p = this.object.position;
    this.moorPoint = p.clone();
    const body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y - 0.05, p.z).setRotation(this.object.quaternion).setAngularDamping(0.3).setLinearDamping(0.02).setCanSleep(false),
    );
    const hull = t.colliders.find((c) => c.name === 'Hull')!;
    const hp = new THREE.Vector3().setFromMatrixPosition(hull.matrix);
    // a hull is mostly air: model it as a light box with the mass spread low
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(hull.half.x, hull.half.y, hull.half.z)
        .setTranslation(hp.x, hp.y, hp.z)
        .setDensity(0)
        .setFriction(0.6)
        .setCollisionGroups(groups(GROUP.VEHICLE, 0xffff)),
      body,
    );
    body.setAdditionalMassProperties(HULL_MASS, { x: 0, y: 0.16, z: 0 }, { x: 120, y: 130, z: 22 }, { x: 0, y: 0, z: 0, w: 1 }, true);
    this.body = body;
    this.link = physics.link(body, this.object);
    const min = hp.clone().sub(hull.half);
    const max = hp.clone().add(hull.half);
    this.floater = buoyancy.add(boxFloater(body, min, max, 0.55, 3, 5, new THREE.Vector3(260, 400, 22)));
    this.floater.angularDrag = 1.2;

    // oars in their oarlocks
    for (const m of t.markers.filter((mk) => mk.kind === 'OAR')) {
      const pivot = new THREE.Group();
      pivot.name = `oar-${m.name}`;
      pivot.position.setFromMatrixPosition(m.matrix);
      const oar = kit.instance('Oar');
      oar.position.set(0, 0, -0.62); // the oarlock sits 0.62 m up the shaft
      pivot.add(oar);
      this.object.add(pivot);
      this.oars.push({ pivot, side: Math.sign(pivot.position.x) || 1, power: 0 });
    }
    this.setOars(0);

    // tied to the pier: a rope from the bow to a ring on the deck
    this.anchor = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x + 1.45, p.y + 1.25, p.z + 1.2));
    this.tie();
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  get heading(): number {
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.object.quaternion);
    return Math.atan2(f.x, f.z);
  }

  get moored() {
    return this.mooring !== null;
  }

  tie() {
    if (this.mooring) return;
    const bow = { x: 0, y: 0.5, z: 1.45 };
    this.mooring = this.physics.world.createImpulseJoint(RAPIER.JointData.rope(2.4, bow, { x: 0, y: 0, z: 0 }), this.body, this.anchor, true);
  }

  castOff() {
    if (!this.mooring) return;
    this.physics.world.removeImpulseJoint(this.mooring, true);
    this.mooring = null;
  }

  /** Passengers make it sit lower in the water. */
  setLoad(people: number) {
    this.body.setAdditionalMassProperties(HULL_MASS + PERSON * people, { x: 0, y: 0.25, z: 0 }, { x: 120 + 40 * people, y: 130 + 40 * people, z: 22 + 8 * people }, { x: 0, y: 0, z: 0, w: 1 }, true);
  }

  step(dt: number) {
    if (!this.local) return;
    const rower = this.occupied.row !== null;
    const { x, y } = rower ? this.input : { x: 0, y: 0 };
    const left = THREE.MathUtils.clamp(y + x, -1, 1); // +X side
    const right = THREE.MathUtils.clamp(y - x, -1, 1);
    const want = Math.max(Math.abs(left), Math.abs(right));
    this.rowing += (want - this.rowing) * Math.min(1, dt * 3);
    if (this.rowing > 0.05) {
      if (this.moored && want > 0.1) this.castOff();
      this.phase = (this.phase + (dt / STROKE) * Math.PI * 2) % (Math.PI * 2);
    }
    const drive = Math.max(0, Math.sin(this.phase));
    for (const o of this.oars) {
      o.power += ((o.side > 0 ? left : right) - o.power) * Math.min(1, dt * 4);
      if (Math.abs(o.power) < 0.02 || this.floater.wet <= 0) continue;
      // the blade pushes water astern, the boat goes ahead (+Z)
      const blade = new THREE.Vector3(o.side * 1.55, 0.05, 0).applyMatrix4(this.object.matrixWorld);
      const f = new THREE.Vector3(0, 0, BLADE_FORCE * o.power * drive).applyQuaternion(this.object.quaternion);
      f.y = 0;
      this.body.addForceAtPoint({ x: f.x, y: 0, z: f.z }, { x: blade.x, y: blade.y, z: blade.z }, true);
    }
  }

  /** Oar animation for the current stroke phase. */
  updateVisual() {
    this.setOars(this.rowing);
  }

  private setOars(amount: number) {
    const ph = this.phase;
    for (const o of this.oars) {
      const dir = Math.sign(o.power) || 1;
      const sweep = THREE.MathUtils.degToRad(32) * Math.cos(ph) * amount * dir;
      const inWater = THREE.MathUtils.smoothstep(Math.sin(ph), -0.15, 0.25) * amount;
      const dip = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(10, 20, inWater) + 6 * (1 - amount));
      // oar axis (+Z of the oar model) points out over the side and down to the water
      const z = new THREE.Vector3(o.side * Math.cos(dip) * Math.cos(sweep), -Math.sin(dip), Math.sin(sweep) * Math.cos(dip)).normalize();
      const flat = new THREE.Vector3(0, 1, 0).sub(z.clone().multiplyScalar(z.y)).normalize(); // feathered
      const square = new THREE.Vector3().crossVectors(z, new THREE.Vector3(0, 1, 0)).normalize(); // blade upright
      const yAxis = flat.lerp(square, inWater).normalize();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, z).normalize();
      yAxis.crossVectors(z, xAxis);
      o.pivot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, z));
    }
  }

  setLocal(local: boolean) {
    if (local === this.local) return;
    this.local = local;
    this.body.setBodyType(local ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
  }
}
