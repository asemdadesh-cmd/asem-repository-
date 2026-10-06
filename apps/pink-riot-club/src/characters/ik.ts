// Rig-agnostic pose overrides applied after animation: two-bone arm IK,
// body lean and head tilt. Everything works from world positions, so the same
// code drives the skinned avatars' bones and the sculpted rigs' joints.
import * as THREE from 'three';

const A = new THREE.Vector3();
const B = new THREE.Vector3();
const C = new THREE.Vector3();
const D = new THREE.Vector3();
const P = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
const q = new THREE.Quaternion();
const wq = new THREE.Quaternion();
const pq = new THREE.Quaternion();
const ID = new THREE.Quaternion();

// The animation mixer only writes a bone when its animated value changes, so an
// override left in place would be compounded next frame. Every overridden bone
// is journaled and put back (restorePose) before the next animation step.
const journal = new Map<THREE.Object3D, THREE.Quaternion>();
function remember(bone: THREE.Object3D) {
  if (!journal.has(bone)) journal.set(bone, bone.quaternion.clone());
}
/** Undo this frame's overrides; call before the rigs animate. */
export function restorePose() {
  for (const [bone, q] of journal) bone.quaternion.copy(q);
  journal.clear();
}

/** Rotates `bone` in world space so direction `a` turns toward `b` (by fraction w). */
function rotateWorld(bone: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, w: number) {
  if (a.lengthSq() < 1e-10 || b.lengthSq() < 1e-10 || !bone.parent) return;
  remember(bone);
  q.setFromUnitVectors(from.copy(a).normalize(), to.copy(b).normalize());
  if (w < 1) q.copy(ID.clone().slerp(q, Math.max(0, w)));
  bone.getWorldQuaternion(wq);
  bone.parent.getWorldQuaternion(pq);
  bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
  bone.updateMatrixWorld(true);
}

/**
 * Bends [upper, lower, end] so `end` reaches `target`. The elbow bends toward
 * `pole` (a world point). `weight` blends from the animated pose (0) to the reach (1).
 */
export function reach(chain: [THREE.Object3D, THREE.Object3D, THREE.Object3D], target: THREE.Vector3, pole: THREE.Vector3, weight: number) {
  if (weight <= 0.001) return;
  const [s, e, h] = chain;
  s.updateWorldMatrix(true, true);
  s.getWorldPosition(A);
  e.getWorldPosition(B);
  h.getWorldPosition(C);
  const l1 = A.distanceTo(B);
  const l2 = B.distanceTo(C);
  if (l1 < 1e-4 || l2 < 1e-4) return;
  const dir = D.copy(target).sub(A);
  const d = THREE.MathUtils.clamp(dir.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999);
  dir.normalize();
  // the plane holding the elbow, oriented toward the pole
  P.copy(pole).sub(A);
  P.addScaledVector(dir, -P.dot(dir));
  if (P.lengthSq() < 1e-8) P.copy(B).sub(A).addScaledVector(dir, -B.clone().sub(A).dot(dir));
  P.normalize();
  const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const elbow = A.clone().addScaledVector(dir, cosA * l1).addScaledVector(P, sinA * l1);
  rotateWorld(s, B.clone().sub(A), elbow.sub(A), weight);
  e.getWorldPosition(B);
  h.getWorldPosition(C);
  rotateWorld(e, C.clone().sub(B), target.clone().sub(B), weight);
}

/** Leans a joint so its "up" tips toward a world direction by `angle` radians. */
export function lean(joint: THREE.Object3D, toward: THREE.Vector3, angle: number) {
  if (Math.abs(angle) < 1e-4) return;
  joint.updateWorldMatrix(true, false);
  const up = new THREE.Vector3(0, 1, 0);
  const axis = up.clone().cross(toward).normalize();
  if (axis.lengthSq() < 1e-8) return;
  const tilted = up.clone().applyAxisAngle(axis, angle);
  rotateWorld(joint, up, tilted, 1);
}

/** Turns a joint about the world up axis (yaw) and then rolls it about `forward`. */
export function turn(joint: THREE.Object3D, yaw: number, roll = 0, forward?: THREE.Vector3) {
  if (!joint.parent) return;
  remember(joint);
  joint.updateWorldMatrix(true, false);
  const r = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  if (roll && forward) r.multiply(new THREE.Quaternion().setFromAxisAngle(forward.clone().normalize(), roll));
  joint.getWorldQuaternion(wq);
  joint.parent.getWorldQuaternion(pq);
  joint.quaternion.copy(pq.invert().multiply(r.multiply(wq)));
  joint.updateMatrixWorld(true);
}
