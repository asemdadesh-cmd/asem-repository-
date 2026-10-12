// Builds the scene and the physics world from the layout: static SketchUp
// assets are baked into a few merged meshes per region (cheap to draw), the
// walkable architecture gets exact trimesh colliders, everything movable
// becomes a Rapier rigid body. Also gathers the lights, water volumes and
// markers the gameplay systems need.
import * as THREE from 'three';
import { Kit, StaticBatcher, type AssetTemplate, type Marker } from '../engine/kit.ts';
import { Physics, GROUP, type BodyLink } from '../engine/physics.ts';
import { makePoolWater } from '../engine/water.ts';
import { LAYOUT, type Placement } from './layout.ts';
import type { LeafSource } from './foliage.ts';

export interface DynamicProp {
  id: string;
  placement: Placement;
  template: AssetTemplate;
  object: THREE.Object3D;
  link: BodyLink;
  /** horizontal half size (m), for reach checks */
  radius: number;
  /** id of the player carrying it */
  heldBy: string | null;
  /** network: who simulates it ('' = nobody claimed it yet, everyone simulates) */
  owner: string;
}

export type SeatKind = 'chair' | 'lounger' | 'stool' | 'swing' | 'driver' | 'passenger' | 'rower' | 'boat' | 'bed';

export interface SeatSpot {
  id: string;
  asset: string;
  kind: SeatKind;
  /** how far away you can be to take it */
  reach: number;
  /** returns the seat's current world transform (follows moving props) */
  frame(out: THREE.Matrix4): THREE.Matrix4;
  object: THREE.Object3D | null; // moving owner, if any
  occupied: string | null;
}

export interface WaterVolume {
  min: THREE.Vector3;
  max: THREE.Vector3;
  surface: number;
}

export interface LightSpot {
  position: THREE.Vector3;
  kind: 'warm' | 'fire' | 'beacon';
  indoor: boolean;
}

const CELL = 48;
const CROWNS = new Set(['OliveTree', 'Palm', 'Cypress']);

export class World {
  readonly root = new THREE.Group();
  readonly dynamics: DynamicProp[] = [];
  readonly byId = new Map<string, DynamicProp>();
  readonly seats: SeatSpot[] = [];
  readonly volumes: WaterVolume[] = [];
  readonly lights: LightSpot[] = [];
  /** what stands on the ground (no grass grows there) */
  readonly floors: THREE.BufferGeometry[] = [];
  readonly footprints: THREE.Box3[] = [];
  /** crown surfaces for Foliage (cleared once the leaves are built) */
  readonly leaves: LeafSource[] = [];
  readonly markers: Array<{ placement: Placement; marker: Marker; world: THREE.Matrix4 }> = [];
  /** placements handled by specialised systems (buggy, swing, boat) */
  readonly special = new Map<string, { placement: Placement; template: AssetTemplate; matrix: THREE.Matrix4 }>();

  constructor(
    kit: Kit,
    physics: Physics,
    renderer: THREE.WebGLRenderer,
    texSize: number,
  ) {
    this.root.name = 'world';
    const batches = new Map<string, StaticBatcher>();
    const batch = (x: number, z: number) => {
      const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      let b = batches.get(key);
      if (!b) batches.set(key, (b = new StaticBatcher()));
      return b;
    };
    const ivory = new THREE.MeshPhysicalMaterial({ color: '#efe6d2', roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2 });
    const ebony = new THREE.MeshPhysicalMaterial({ color: '#2b2522', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 });

    for (const p of LAYOUT) {
      const t = kit.assets.get(p.asset);
      if (!t) {
        console.warn('[world] missing asset', p.asset);
        continue;
      }
      const m = placementMatrix(p);
      this.collectMarkers(p, t, m);
      if (p.asset === 'Buggy' || p.asset === 'SwingFrame') {
        this.special.set(p.id ?? p.asset, { placement: p, template: t, matrix: m });
        if (p.asset === 'Buggy') continue;
      }
      if (p.physics === 'dynamic') {
        const obj = kit.instance(p.asset);
        obj.name = p.id ?? p.asset;
        m.decompose(obj.position, obj.quaternion, obj.scale);
        // start a hair above where it rests and let it settle (never inside the ground)
        obj.position.y += 0.03;
        if (p.tint) {
          const mat = p.tint === 'ivory' ? ivory : ebony;
          obj.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) mesh.material = mat;
          });
        }
        this.root.add(obj);
        const small = (p.mass ?? 10) < 3;
        const link = physics.addDynamic(t, obj, {
          shape: p.shape ?? 'boxes',
          mass: p.mass ?? 10,
          group: small ? GROUP.PROP_SMALL : GROUP.DYNAMIC,
          restitution: p.shape === 'ball' ? 0.72 : 0.05,
          friction: p.shape === 'ball' ? 0.45 : 0.75,
          linearDamping: p.shape === 'ball' ? 0.25 : 0.1,
          angularDamping: p.shape === 'ball' ? 0.35 : 0.4,
          ccd: p.shape === 'ball',
        });
        const id = p.id ?? `${p.asset}-${this.dynamics.length}`;
        const size = t.bounds.getSize(new THREE.Vector3()).multiplyScalar(p.scale ?? 1);
        const prop: DynamicProp = { id, placement: p, template: t, object: obj, link, radius: Math.max(size.x, size.z) / 2, heldBy: null, owner: '' };
        this.dynamics.push(prop);
        this.byId.set(id, prop);
        this.addSeats(id, p.asset, t, null, obj);
        continue;
      }
      batch(p.x, p.z).add(t.root, m);
      this.collectLeaves(t, m);
      if (CROWNS.has(p.asset)) {
        // the leafy part of the tree (above the trunk), slightly inset
        const b = t.bounds;
        const s = p.scale ?? 1;
        const y0 = b.min.y + (b.max.y - b.min.y) * (p.asset === 'Cypress' ? 0.12 : 0.45);
        const half = new THREE.Vector3(((b.max.x - b.min.x) / 2) * 0.8 * s, ((b.max.y - y0) / 2) * 0.9 * s, ((b.max.z - b.min.z) / 2) * 0.8 * s);
        const c = new THREE.Vector3((b.min.x + b.max.x) / 2, (y0 + b.max.y) / 2, (b.min.z + b.max.z) / 2).applyMatrix4(m);
        physics.addCameraBlocker(c, half, new THREE.Quaternion().setFromRotationMatrix(m));
      }
      if (p.physics === 'static-mesh') {
        const geo = worldGeometry(t.root, m);
        physics.addStaticMesh(geo);
        this.floors.push(geo);
      } else {
        if (!CROWNS.has(p.asset) && p.physics !== 'none') this.footprints.push(t.bounds.clone().applyMatrix4(m));
        if (p.physics === 'static' && t.colliders.length) physics.addStaticBoxes(t, m);
      }
      this.addSeats(p.id ?? `${p.asset}@${p.x.toFixed(1)},${p.z.toFixed(1)}`, p.asset, t, m, null);
      for (const v of t.volumes) {
        const c = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(m, v.matrix));
        const min = c.clone().sub(v.half);
        const max = c.clone().add(v.half);
        this.volumes.push({ min, max, surface: max.y });
        if (v.name === 'Pool') {
          const water = makePoolWater(renderer, new THREE.Vector2(v.half.x * 2, v.half.z * 2), texSize);
          water.position.set(c.x, max.y, c.z);
          this.root.add(water);
        }
      }
    }
    for (const [key, b] of batches) this.root.add(b.build(`static ${key}`));
  }

  /** Crown surfaces of the trees and shrubs, in world space, for the leaf cards. */
  private collectLeaves(t: AssetTemplate, m: THREE.Matrix4) {
    t.root.updateMatrixWorld(true);
    t.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as THREE.Material).name;
      const kind = name.startsWith('Leaf_Olive') ? 'olive' : name.startsWith('Leaf_Shrub') ? 'shrub' : name.startsWith('Leaf_Cypress') ? 'cypress' : null;
      if (!kind) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', mesh.geometry.attributes.position.clone());
      g.setIndex(mesh.geometry.index!.clone());
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
      this.leaves.push({ geometry: g, kind });
    });
  }

  private collectMarkers(p: Placement, t: AssetTemplate, m: THREE.Matrix4) {
    for (const mk of t.markers) {
      const w = new THREE.Matrix4().multiplyMatrices(m, mk.matrix);
      this.markers.push({ placement: p, marker: mk, world: w });
      if (mk.kind === 'LIGHT' || mk.kind === 'BEACON') {
        const pos = new THREE.Vector3().setFromMatrixPosition(w);
        const indoor = p.asset === 'Villa' && pos.z < m.elements[14] + 1.6;
        this.lights.push({ position: pos, kind: mk.kind === 'BEACON' ? 'beacon' : mk.name === 'fire' ? 'fire' : 'warm', indoor });
      }
    }
  }

  addSeats(id: string, asset: string, t: AssetTemplate, m: THREE.Matrix4 | null, obj: THREE.Object3D | null, kind?: SeatKind, reach = 1.25) {
    for (const mk of t.markers) {
      if (mk.kind !== 'SEAT') continue;
      const local = mk.matrix.clone();
      const fixed = m ? new THREE.Matrix4().multiplyMatrices(m, local) : null;
      this.seats.push({
        id: `${id}#${mk.name}`,
        asset,
        kind: kind ?? seatKind(asset, mk.name),
        reach,
        object: obj,
        occupied: null,
        frame: (out) => (obj ? out.multiplyMatrices(obj.matrixWorld, local) : out.copy(fixed!)),
      });
    }
  }

  /** Water surface height at a point if it is inside a water volume (pool). */
  volumeSurfaceAt(p: THREE.Vector3): number | null {
    for (const v of this.volumes) {
      if (p.x > v.min.x && p.x < v.max.x && p.z > v.min.z && p.z < v.max.z && p.y > v.min.y - 0.5 && p.y < v.max.y + 2.5) return v.surface;
    }
    return null;
  }
}

function seatKind(asset: string, name: string): SeatKind {
  if (asset === 'Lounger') return 'lounger';
  if (asset === 'BarStool') return 'stool';
  if (asset === 'Bed') return 'bed';
  if (asset === 'SwingSeat') return 'swing';
  if (asset === 'Buggy') return name === 'driver' ? 'driver' : 'passenger';
  if (asset === 'Rowboat') return name === 'row' ? 'rower' : 'boat';
  return 'chair';
}

export function placementMatrix(p: Placement): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(p.yaw ?? 0));
  const s = p.scale ?? 1;
  return new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y ?? 0, p.z), q, new THREE.Vector3(s, s, s));
}

/** All of an asset's triangles in world space, for an exact static collider. */
function worldGeometry(root: THREE.Object3D, m: THREE.Matrix4): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material;
    // light fittings and flames are not solid; glass is (sliding doors, balustrade)
    if (/^(Light|Flame)/.test(mat.name)) return;
    const g = mesh.geometry;
    const base = pos.length / 3;
    const mw = new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mw);
      pos.push(v.x, v.y, v.z);
    }
    const index = g.index!;
    for (let i = 0; i < index.count; i++) idx.push(base + index.getX(i));
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}
