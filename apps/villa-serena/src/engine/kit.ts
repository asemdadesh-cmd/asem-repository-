// The SketchUp asset kit: one GLB (public/models/kit.glb) with a root node per
// SketchUp component definition. Hidden helper groups authored in SketchUp
// come through as data: COL_* boxes for physics, SEAT_/HINGE_/WHEEL_… markers.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { upgradeMaterial, type MaterialOptions } from './materials.ts';

export interface ColliderBox {
  name: string;
  /** asset-local transform of the box centre */
  matrix: THREE.Matrix4;
  half: THREE.Vector3;
}

export interface VolumeBox {
  name: string;
  matrix: THREE.Matrix4; // asset-local transform of the box centre
  half: THREE.Vector3;
}

export interface Marker {
  kind: string; // SEAT, HINGE, WHEEL…
  name: string;
  matrix: THREE.Matrix4; // asset-local
}

export interface AssetTemplate {
  name: string;
  root: THREE.Object3D;
  colliders: ColliderBox[];
  volumes: VolumeBox[];
  markers: Marker[];
  bounds: THREE.Box3;
  extras: Record<string, unknown>;
}

export class Kit {
  readonly assets = new Map<string, AssetTemplate>();

  static async load(url: string, renderer: THREE.WebGLRenderer, opts: MaterialOptions, onProgress?: (f: number) => void): Promise<Kit> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url, (e) => {
      if (onProgress && e.total) onProgress(e.loaded / e.total);
    });
    const kit = new Kit();
    for (const node of [...gltf.scene.children]) {
      if (!node.userData.asset) continue;
      // GLTFLoader de-duplicates names (a villa part called "Bed" turns the Bed asset into "Bed_1")
      const name = (node.userData.name as string | undefined) ?? node.name;
      node.name = name;
      kit.assets.set(name, kit.prepare(node, renderer, opts));
    }
    return kit;
  }

  private prepare(root: THREE.Object3D, renderer: THREE.WebGLRenderer, opts: MaterialOptions): AssetTemplate {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const colliders: ColliderBox[] = [];
    const volumes: VolumeBox[] = [];
    const markers: Marker[] = [];
    const hidden: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.userData.hidden) {
        hidden.push(o);
        const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        if (o.userData.collider === 'box' || o.userData.volume === 'box') {
          const b = o.userData.box as number[];
          const centre = new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
          const half = new THREE.Vector3((b[3] - b[0]) / 2, (b[4] - b[1]) / 2, (b[5] - b[2]) / 2);
          const entry = { name: ((o.userData.name as string | undefined) ?? o.name).slice(4), matrix: local.multiply(new THREE.Matrix4().makeTranslation(centre)), half };
          (o.userData.collider ? colliders : volumes).push(entry);
        } else {
          const full = (o.userData.name as string | undefined) ?? o.name;
          const kind = String(o.userData.marker ?? full.split('_')[0]);
          markers.push({ kind, name: full.slice(kind.length + 1), matrix: local });
        }
      }
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        dequantize(mesh.geometry);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const up = mats.map((m) => upgradeMaterial(renderer, m as THREE.MeshStandardMaterial, opts));
        mesh.material = Array.isArray(mesh.material) ? up : up[0];
        if (up.some((m) => (m as THREE.MeshStandardMaterial).transparent)) mesh.castShadow = false;
      }
    });
    for (const h of hidden) h.removeFromParent();
    if (!ANIMATED.has(root.name)) collapse(root);
    const bounds = new THREE.Box3().setFromObject(root);
    const extras = { ...root.userData };
    return { name: root.name, root, colliders, volumes, markers, bounds, extras };
  }

  get(name: string): AssetTemplate {
    const a = this.assets.get(name);
    if (!a) throw new Error(`asset ${name} is not in the kit`);
    return a;
  }

  /** A movable copy (shares geometry and materials with the template). */
  instance(name: string): THREE.Object3D {
    return this.get(name).root.clone(true);
  }
}

/**
 * The kit ships quantised (KHR_mesh_quantization: int16 positions, int8
 * normals) to download fast; merging and baking transforms need plain floats.
 */
function dequantize(g: THREE.BufferGeometry) {
  for (const [name, a] of Object.entries(g.attributes)) {
    const attr = a as THREE.BufferAttribute;
    if (attr.array instanceof Float32Array && !attr.normalized && !(a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) continue;
    const out = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.getComponent(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize));
  }
}

/** Assets whose parts move at runtime keep their node hierarchy. */
const ANIMATED = new Set(['Buggy']);

/**
 * Merges all of an asset's parts into one mesh per material (a dining chair
 * goes from a dozen draw calls to two). Geometry is baked into asset space.
 */
function collapse(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material)) meshes.push(m);
  });
  if (meshes.length < 2) return;
  for (const m of meshes) {
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    const mat = m.material as THREE.Material;
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat)!.push(g);
  }
  for (const c of [...root.children]) root.remove(c);
  for (const [mat, list] of groups) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = `${root.name}:${mat.name}`;
    mesh.castShadow = !(mat as THREE.MeshStandardMaterial).transparent;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

/**
 * Bakes many static placements of kit assets into one mesh per material
 * (a handful of draw calls for the whole villa, terrace, pier…).
 */
export class StaticBatcher {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private tmp = new THREE.Matrix4();

  add(template: THREE.Object3D, world: THREE.Matrix4) {
    template.updateMatrixWorld(true);
    template.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      this.tmp.multiplyMatrices(world, mesh.matrixWorld);
      const g = mesh.geometry;
      if (g.groups.length && mats.length > 1) {
        for (const grp of g.groups) this.push(mats[grp.materialIndex ?? 0], subset(g, grp.start, grp.count).applyMatrix4(this.tmp));
      } else {
        this.push(mats[0], g.clone().applyMatrix4(this.tmp));
      }
    });
  }

  private push(m: THREE.Material, g: THREE.BufferGeometry) {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    let list = this.parts.get(m);
    if (!list) this.parts.set(m, (list = []));
    list.push(g);
  }

  build(name = 'static'): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [m, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, m);
      mesh.name = `${name}:${m.name}`;
      mesh.castShadow = !(m as THREE.MeshStandardMaterial).transparent;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      for (const g of list) g.dispose();
    }
    this.parts.clear();
    return group;
  }
}

function subset(g: THREE.BufferGeometry, start: number, count: number): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(k);
    if (a) out.setAttribute(k, a.clone());
  }
  const idx = g.index!.array.slice(start, start + count);
  out.setIndex(Array.from(idx));
  return out;
}
