// The garden swing: the SketchUp seat hangs from the frame's hooks on a
// revolute joint (rigid ropes), so it is a real pendulum. Sitting adds your
// weight; pumping (W/S) adds energy in time with the swing like real legs do,
// and walking into it pushes it.
import * as THREE from 'three';
import { RAPIER, GROUP, groups, type BodyLink, type Physics } from '../engine/physics.ts';
import type { Kit } from '../engine/kit.ts';

const SEAT_MASS = 14;
const PERSON = 65;
const ROPE = 1.6; // hook to the riders' centre of mass (m)

export class Swing {
  readonly id = 'swing';
  readonly object: THREE.Object3D;
  readonly body: RAPIER.RigidBody;
  readonly link: BodyLink;
  private ropes: Array<{ mesh: THREE.Mesh; hook: THREE.Vector3; local: THREE.Vector3 }> = [];
  private axisWorld: THREE.Vector3;
  pump = 0;
  local = true;
  riders = 0;

  constructor(
    physics: Physics,
    kit: Kit,
    frame: THREE.Matrix4,
    scene: THREE.Object3D,
    ropeMaterial: THREE.Material,
  ) {
    const ft = kit.get('SwingFrame');
    const hook = (name: string) => new THREE.Vector3().setFromMatrixPosition(ft.markers.find((m) => m.kind === 'HOOK' && m.name === name)!.matrix).applyMatrix4(frame);
    const hookL = hook('L');
    const hookR = hook('R');
    const pivot = hookL.clone().add(hookR).multiplyScalar(0.5);
    const seatT = kit.get('SwingSeat');
    this.object = kit.instance('SwingSeat');
    this.object.name = 'swing-seat';
    // the seat hangs 0.42 m above the lawn, centred under the beam
    const rest = new THREE.Vector3(0, 0.42, 0).applyMatrix4(frame);
    const q = new THREE.Quaternion().setFromRotationMatrix(frame);
    this.object.position.copy(rest);
    this.object.quaternion.copy(q);
    scene.add(this.object);

    const body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(rest.x, rest.y, rest.z).setRotation(q).setAngularDamping(0.05).setLinearDamping(0.02).setCanSleep(true),
    );
    for (const c of seatT.colliders) {
      const p = new THREE.Vector3();
      const r = new THREE.Quaternion();
      c.matrix.decompose(p, r, new THREE.Vector3());
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(c.half.x, c.half.y, c.half.z).setTranslation(p.x, p.y, p.z).setRotation(r).setDensity(0).setFriction(0.7).setCollisionGroups(groups(GROUP.DYNAMIC, 0xffff & ~GROUP.STATIC)),
        body,
      );
    }
    body.setAdditionalMassProperties(SEAT_MASS, { x: 0, y: 0.15, z: 0 }, { x: 1.2, y: 2.2, z: 1.4 }, { x: 0, y: 0, z: 0, w: 1 }, true);
    this.body = body;
    this.link = physics.link(body, this.object);

    // hinge on the beam: both anchors at the pivot, axis along the beam
    const anchorFixed = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pivot.x, pivot.y, pivot.z));
    const axisLocal = new THREE.Vector3(1, 0, 0); // the beam runs along the frame's x
    this.axisWorld = axisLocal.clone().applyQuaternion(q);
    const toPivotLocal = pivot.clone().sub(rest).applyQuaternion(q.clone().invert());
    const joint = RAPIER.JointData.revoluteWithAxes(
      { x: 0, y: 0, z: 0 },
      { x: toPivotLocal.x, y: toPivotLocal.y, z: toPivotLocal.z },
      { x: this.axisWorld.x, y: this.axisWorld.y, z: this.axisWorld.z },
      { x: 1, y: 0, z: 0 },
    );
    physics.world.createImpulseJoint(joint, anchorFixed, body, true);

    // ropes: from each hook to the two attachment points on that side
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 1, 6, 1).translate(0, 0.5, 0);
    for (const m of seatT.markers.filter((mk) => mk.kind === 'ROPE')) {
      const local = new THREE.Vector3().setFromMatrixPosition(m.matrix);
      const mesh = new THREE.Mesh(geo, ropeMaterial);
      mesh.castShadow = true;
      mesh.name = `rope-${m.name}`;
      scene.add(mesh);
      this.ropes.push({ mesh, hook: m.name.startsWith('L') ? hookL : hookR, local });
    }
  }

  setRiders(n: number) {
    this.riders = n;
    this.body.setAdditionalMassProperties(SEAT_MASS + PERSON * n, { x: 0, y: 0.15 + 0.35 * Math.min(1, n), z: 0 }, { x: 1.2 + 10 * n, y: 2.2 + 8 * n, z: 1.4 + 6 * n }, { x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.wakeUp();
  }

  /** Pumping: torque about the hinge in the direction the swing is moving. */
  step(dt: number) {
    void dt;
    if (!this.local || this.riders === 0 || Math.abs(this.pump) < 0.05) return;
    const w = this.body.angvel();
    const along = w.x * this.axisWorld.x + w.y * this.axisWorld.y + w.z * this.axisWorld.z;
    const dir = Math.abs(along) > 0.08 ? Math.sign(along) : 1;
    // legs and lean shift the centre of mass in time with the swing: ~180 N·m each
    const torque = 150 * this.riders * this.pump * dir;
    // a rider can only pump so high: estimate this swing's peak angle from its
    // energy (pendulum: cos θmax = cos θ − ω²L / 2g) and stop adding above ~55°
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.object.quaternion);
    const cosPeak = up.y - (along * along * ROPE) / (2 * 9.81);
    // (W pumps — adds energy whichever way it swings; S drags your feet and slows it)
    if (cosPeak < Math.cos(THREE.MathUtils.degToRad(55)) && this.pump > 0) return;
    this.body.addTorque({ x: this.axisWorld.x * torque, y: this.axisWorld.y * torque, z: this.axisWorld.z * torque }, true);
  }

  /** Torques persist in Rapier: clear after each step. */
  clear() {
    this.body.resetTorques(false);
  }

  updateVisual() {
    this.object.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0);
    for (const r of this.ropes) {
      const end = r.local.clone().applyMatrix4(this.object.matrixWorld);
      const d = r.hook.clone().sub(end);
      r.mesh.position.copy(end);
      r.mesh.quaternion.setFromUnitVectors(up, d.clone().normalize());
      r.mesh.scale.set(1, d.length(), 1);
    }
  }

  setLocal(local: boolean) {
    if (local === this.local) return;
    this.local = local;
    this.body.setBodyType(local ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.KinematicPositionBased, true);
  }
}
