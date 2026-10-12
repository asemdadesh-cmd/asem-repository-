// Rapier physics: the world, fixed-step simulation with render interpolation,
// colliders built from the SketchUp kit (COL_* boxes, convex hulls or exact
// trimeshes for architecture) and the terrain heightfield.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { AssetTemplate } from './kit.ts';
import { TERRAIN, type Grid } from '../world/terrain.ts';

export { RAPIER };

// collision groups: membership in the high 16 bits, filter in the low 16
export const GROUP = {
  STATIC: 0x0001,
  DYNAMIC: 0x0002,
  PLAYER: 0x0004,
  VEHICLE: 0x0008,
  PROP_SMALL: 0x0010,
  /** camera-only blockers (tree crowns): nothing collides with them */
  CAMERA: 0x0020,
} as const;
export const groups = (member: number, filter: number) => (member << 16) | filter;
const ALL = 0xffff;

export interface BodyLink {
  body: RAPIER.RigidBody;
  object: THREE.Object3D;
  /** previous/current poses for interpolation */
  prevPos: THREE.Vector3;
  prevRot: THREE.Quaternion;
  currPos: THREE.Vector3;
  currRot: THREE.Quaternion;
  /** local offset between the body origin and the visual origin */
  offset?: THREE.Matrix4;
}

export const STEP = 1 / 60;

export class Physics {
  readonly world: RAPIER.World;
  readonly links: BodyLink[] = [];
  private acc = 0;
  alpha = 0;
  /** called before every fixed step (forces, buoyancy, character, vehicles) */
  readonly preStep: Array<(dt: number) => void> = [];
  readonly postStep: Array<(dt: number) => void> = [];
  readonly eventQueue: RAPIER.EventQueue;

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  static async create(): Promise<Physics> {
    await RAPIER.init();
    return new Physics();
  }

  addTerrain(grid: Grid) {
    const { nx, nz, heights } = grid;
    // Rapier wants column-major heights: index = x * (rows) + z
    const h = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) h[i * (nz + 1) + j] = heights[j * (nx + 1) + i];
    const sx = TERRAIN.maxX - TERRAIN.minX;
    const sz = TERRAIN.maxZ - TERRAIN.minZ;
    const desc = RAPIER.ColliderDesc.heightfield(nz, nx, h, { x: sx, y: 1, z: sz })
      .setTranslation((TERRAIN.minX + TERRAIN.maxX) / 2, 0, (TERRAIN.minZ + TERRAIN.maxZ) / 2)
      .setFriction(0.9)
      .setCollisionGroups(groups(GROUP.STATIC, ALL));
    this.world.createCollider(desc);
  }

  /** Exact triangle mesh for walkable architecture (villa, terrace, lighthouse). */
  addStaticMesh(geometry: THREE.BufferGeometry, friction = 0.8) {
    const pos = geometry.attributes.position.array as Float32Array;
    const idx = geometry.index ? new Uint32Array(geometry.index.array) : new Uint32Array([...Array(pos.length / 3).keys()]);
    const desc = RAPIER.ColliderDesc.trimesh(new Float32Array(pos), idx).setFriction(friction).setCollisionGroups(groups(GROUP.STATIC, ALL));
    this.world.createCollider(desc);
  }

  /** The asset's COL_* boxes as fixed colliders at a world transform. */
  addStaticBoxes(t: AssetTemplate, world: THREE.Matrix4) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.attachBoxes(body, t, world, GROUP.STATIC);
    return body;
  }

  private attachBoxes(body: RAPIER.RigidBody, t: AssetTemplate, base: THREE.Matrix4, group: number, density = 1) {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (const c of t.colliders) {
      m.multiplyMatrices(base, c.matrix).decompose(p, q, s);
      const desc = RAPIER.ColliderDesc.cuboid(c.half.x * s.x, c.half.y * s.y, c.half.z * s.z)
        .setTranslation(p.x, p.y, p.z)
        .setRotation(q)
        .setDensity(density)
        .setFriction(0.7)
        .setCollisionGroups(groups(group, ALL));
      this.world.createCollider(desc, body);
    }
  }

  /**
   * A dynamic body for a kit asset. shape: 'boxes' uses the COL_* boxes
   * (furniture, boat), 'hull' a convex hull of the mesh (chess pieces),
   * 'ball' a sphere from the bounds.
   */
  addDynamic(t: AssetTemplate, object: THREE.Object3D, opts: { shape: 'boxes' | 'hull' | 'ball'; mass: number; group?: number; restitution?: number; friction?: number; linearDamping?: number; angularDamping?: number; ccd?: boolean }): BodyLink {
    object.updateMatrixWorld(true);
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(object.position.x, object.position.y, object.position.z)
      .setRotation(object.quaternion)
      .setLinearDamping(opts.linearDamping ?? 0.05)
      .setAngularDamping(opts.angularDamping ?? 0.2)
      .setCcdEnabled(opts.ccd ?? false)
      .setCanSleep(true);
    const body = this.world.createRigidBody(desc);
    const group = opts.group ?? GROUP.DYNAMIC;
    const local = new THREE.Matrix4().makeScale(object.scale.x, object.scale.y, object.scale.z);
    if (opts.shape === 'boxes' && t.colliders.length) {
      this.attachBoxes(body, t, local, group);
    } else if (opts.shape === 'ball') {
      const r = ((t.bounds.max.x - t.bounds.min.x) / 2) * object.scale.x;
      const c = t.bounds.getCenter(new THREE.Vector3());
      this.world.createCollider(
        RAPIER.ColliderDesc.ball(r).setTranslation(c.x, c.y, c.z).setRestitution(opts.restitution ?? 0.6).setFriction(opts.friction ?? 0.5).setCollisionGroups(groups(group, ALL)),
        body,
      );
    } else {
      const pts = hullPoints(t.root, object.scale);
      const hull = RAPIER.ColliderDesc.convexHull(pts);
      if (hull) this.world.createCollider(hull.setFriction(opts.friction ?? 0.6).setRestitution(opts.restitution ?? 0.1).setCollisionGroups(groups(group, ALL)), body);
    }
    // scale colliders' density so the body weighs what we asked for
    let massNow = 0;
    for (let i = 0; i < body.numColliders(); i++) massNow += body.collider(i).mass();
    const k = massNow > 0 ? opts.mass / massNow : 1;
    for (let i = 0; i < body.numColliders(); i++) body.collider(i).setDensity(body.collider(i).density() * k);
    if (opts.restitution !== undefined) for (let i = 0; i < body.numColliders(); i++) body.collider(i).setRestitution(opts.restitution);
    return this.link(body, object);
  }

  link(body: RAPIER.RigidBody, object: THREE.Object3D): BodyLink {
    const t = body.translation();
    const r = body.rotation();
    const l: BodyLink = {
      body,
      object,
      prevPos: new THREE.Vector3(t.x, t.y, t.z),
      currPos: new THREE.Vector3(t.x, t.y, t.z),
      prevRot: new THREE.Quaternion(r.x, r.y, r.z, r.w),
      currRot: new THREE.Quaternion(r.x, r.y, r.z, r.w),
    };
    this.links.push(l);
    return l;
  }

  unlink(l: BodyLink) {
    const i = this.links.indexOf(l);
    if (i >= 0) this.links.splice(i, 1);
  }

  /** Advances the simulation in fixed steps and interpolates the visuals. */
  update(dt: number) {
    this.acc += Math.min(dt, 0.1);
    let steps = 0;
    while (this.acc >= STEP && steps < 5) {
      for (const l of this.links) {
        l.prevPos.copy(l.currPos);
        l.prevRot.copy(l.currRot);
      }
      for (const f of this.preStep) f(STEP);
      this.world.step(this.eventQueue);
      for (const f of this.postStep) f(STEP);
      for (const l of this.links) {
        const t = l.body.translation();
        const r = l.body.rotation();
        l.currPos.set(t.x, t.y, t.z);
        l.currRot.set(r.x, r.y, r.z, r.w);
      }
      this.acc -= STEP;
      steps++;
    }
    if (steps === 5) this.acc = 0;
    this.alpha = this.acc / STEP;
    for (const l of this.links) {
      if (l.body.isSleeping() && l.object.userData.settled) continue;
      l.object.position.lerpVectors(l.prevPos, l.currPos, this.alpha);
      l.object.quaternion.slerpQuaternions(l.prevRot, l.currRot, this.alpha);
      l.object.userData.settled = l.body.isSleeping();
    }
  }

  /** A box only the camera bumps into (keeps it out of tree crowns). */
  addCameraBlocker(centre: THREE.Vector3, half: THREE.Vector3, rotation: THREE.Quaternion) {
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
        .setTranslation(centre.x, centre.y, centre.z)
        .setRotation(rotation)
        .setCollisionGroups(groups(GROUP.CAMERA, GROUP.CAMERA)),
    );
  }

  /** Whether an upright capsule standing at `feet` would touch nothing solid. */
  fits(feet: THREE.Vector3, radius: number, half: number, mask: number = GROUP.STATIC | GROUP.DYNAMIC | GROUP.VEHICLE): boolean {
    const centre = { x: feet.x, y: feet.y + radius + half + 0.05, z: feet.z };
    const hit = this.world.intersectionWithShape(centre, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Capsule(half, radius), undefined, groups(ALL & ~GROUP.CAMERA, mask));
    return hit === null;
  }

  /** First hit along a ray (camera collision, ground probes). */
  ray(from: THREE.Vector3, dir: THREE.Vector3, max: number, mask: number = GROUP.STATIC | GROUP.DYNAMIC | GROUP.VEHICLE): number | null {
    const ray = new RAPIER.Ray(from, dir);
    const member = mask & GROUP.CAMERA ? GROUP.CAMERA | GROUP.STATIC : ALL & ~GROUP.CAMERA;
    const hit = this.world.castRay(ray, max, true, undefined, groups(member, mask));
    return hit ? hit.timeOfImpact : null;
  }
}

function hullPoints(root: THREE.Object3D, scale: THREE.Vector3): Float32Array {
  const pts: number[] = [];
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 400));
    const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(mw);
      pts.push(v.x * scale.x, v.y * scale.y, v.z * scale.z);
    }
  });
  return new Float32Array(pts);
}
