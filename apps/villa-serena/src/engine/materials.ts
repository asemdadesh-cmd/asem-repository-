// SketchUp material names -> physically based three.js materials.
//
// The SketchUp model's colour is kept as the base colour (the kit exports it
// as baseColorFactor); the material's name picks a surface pattern (wood,
// linen, travertine…), its tiling in metres and its PBR response.
import * as THREE from 'three';
import { patternMaps, tiled, type PatternId } from './texgen.ts';

export interface SurfaceSpec {
  pattern?: PatternId;
  tile?: number; // metres per texture tile
  rough?: number; // multiplies the pattern roughness
  metal?: number;
  normal?: number; // normal map strength
  clearcoat?: number;
  sheen?: number;
  emissive?: number; // emissive intensity (uses base colour)
  opacity?: number;
  transmission?: number;
  envBoost?: number;
}

// First match wins: name prefix -> surface.
const SURFACES: Array<[string, SurfaceSpec]> = [
  ['Teak', { pattern: 'wood', tile: 0.9, rough: 0.9, normal: 0.7 }],
  ['Oak', { pattern: 'wood', tile: 0.9, rough: 0.85, normal: 0.6 }],
  ['Walnut', { pattern: 'wood', tile: 0.8, rough: 0.75, normal: 0.6, clearcoat: 0.25 }],
  ['Deck', { pattern: 'planks', tile: 1.2, rough: 1.0, normal: 1.0 }],
  ['Driftwood', { pattern: 'wood', tile: 1.2, rough: 1.0, normal: 1.0 }],
  ['Linen', { pattern: 'fabric', tile: 0.6, rough: 1.0, normal: 0.6, sheen: 0.6 }],
  ['Velvet', { pattern: 'fabric', tile: 0.4, rough: 1.0, normal: 0.4, sheen: 1.0 }],
  ['Wool', { pattern: 'fabric', tile: 0.35, rough: 1.0, normal: 1.0, sheen: 0.8 }],
  ['Canvas', { pattern: 'canvas', tile: 0.8, rough: 1.0, normal: 0.6, sheen: 0.3 }],
  ['Plaster', { pattern: 'plaster', tile: 2.5, rough: 1.0, normal: 0.6 }],
  ['Travertine', { pattern: 'travertine', tile: 1.2, rough: 1.0, normal: 0.7 }],
  ['Cobble', { pattern: 'cobble', tile: 2.0, rough: 1.0, normal: 1.0 }],
  ['Stone', { pattern: 'stone', tile: 1.6, rough: 1.0, normal: 1.0 }],
  ['Granite', { pattern: 'concrete', tile: 0.8, rough: 0.6, normal: 0.3 }],
  ['Concrete', { pattern: 'concrete', tile: 2.0, rough: 1.0, normal: 0.5 }],
  ['Terracotta', { pattern: 'terracotta', tile: 0.6, rough: 1.0, normal: 0.6 }],
  ['Tile', { pattern: 'tiles', tile: 1.2, rough: 1.0, normal: 0.8 }],
  ['Marble', { pattern: 'marble', tile: 1.4, rough: 1.0, normal: 0.2, clearcoat: 0.4 }],
  ['Ceramic', { pattern: 'paint', tile: 0.3, rough: 0.5, normal: 0.1, clearcoat: 0.6 }],
  ['Steel', { pattern: 'metal', tile: 0.4, rough: 1.0, metal: 1.0, normal: 0.3 }],
  ['Chrome', { pattern: 'metal', tile: 0.4, rough: 0.35, metal: 1.0, normal: 0.1 }],
  ['Brass', { pattern: 'metal', tile: 0.3, rough: 0.9, metal: 1.0, normal: 0.3 }],
  ['Bronze', { pattern: 'metal', tile: 0.3, rough: 1.1, metal: 1.0, normal: 0.4 }],
  ['Iron', { pattern: 'metal', tile: 0.4, rough: 1.6, metal: 0.85, normal: 0.6 }],
  ['Metal', { pattern: 'metal', tile: 0.4, rough: 1.0, metal: 1.0, normal: 0.3 }],
  ['Paint', { pattern: 'paint', tile: 0.5, rough: 1.0, normal: 0.3, clearcoat: 0.3 }],
  ['CarPaint', { pattern: 'paint', tile: 0.5, rough: 0.6, normal: 0.15, clearcoat: 1.0 }],
  ['Lacquer', { pattern: 'paint', tile: 0.5, rough: 0.6, normal: 0.1, clearcoat: 0.8 }],
  ['Leather', { pattern: 'fabric', tile: 0.25, rough: 0.7, normal: 0.5, clearcoat: 0.2 }],
  ['Rubber', { pattern: 'rubber', tile: 0.2, rough: 1.0, normal: 0.6 }],
  ['Straw', { pattern: 'straw', tile: 0.7, rough: 1.0, normal: 1.0 }],
  ['Rattan', { pattern: 'straw', tile: 0.3, rough: 0.9, normal: 1.0 }],
  ['Rope', { pattern: 'rope', tile: 0.12, rough: 1.0, normal: 1.0 }],
  ['Leaf', { pattern: 'foliage', tile: 0.9, rough: 1.0, normal: 1.0, sheen: 0.2 }],
  ['Bark', { pattern: 'bark', tile: 0.7, rough: 1.0, normal: 1.0 }],
  ['Grass', { pattern: 'grass', tile: 2.0, rough: 1.0, normal: 0.8 }],
  ['Sand', { pattern: 'sand', tile: 2.0, rough: 1.0, normal: 0.8 }],
  ['Soil', { pattern: 'soil', tile: 1.0, rough: 1.0, normal: 1.0 }],
  ['Rock', { pattern: 'rock', tile: 3.0, rough: 1.0, normal: 1.0 }],
  ['Glass', { rough: 0.05, opacity: 0.22, envBoost: 1.5 }],
  ['Light', { emissive: 3.2, rough: 0.6 }],
  ['Flame', { emissive: 6.0, rough: 1.0 }],
];

export function surfaceFor(name: string): SurfaceSpec {
  for (const [prefix, spec] of SURFACES) if (name.startsWith(prefix)) return spec;
  return { rough: 0.8 };
}

export interface MaterialOptions {
  texSize: number; // procedural texture resolution
  physical: boolean; // allow clearcoat/sheen (MeshPhysicalMaterial)
}

const built = new Map<string, THREE.Material>();

/** Replaces a glTF material by its Villa Serena counterpart (cached by name). */
export function upgradeMaterial(renderer: THREE.WebGLRenderer, src: THREE.MeshStandardMaterial, opts: MaterialOptions): THREE.Material {
  const name = src.name || 'Default';
  const hit = built.get(name);
  if (hit) return hit;
  const spec = surfaceFor(name);
  const physical = opts.physical && (spec.clearcoat || spec.sheen);
  const m = physical ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
  m.name = name;
  m.color.copy(src.color);
  m.roughness = spec.rough ?? 0.8;
  m.metalness = spec.metal ?? 0;
  if (spec.pattern) {
    const maps = tiled(patternMaps(renderer, spec.pattern, opts.texSize), spec.tile ?? 1);
    m.map = maps.map;
    m.normalMap = maps.normalMap;
    m.roughnessMap = maps.roughnessMap;
    const k = spec.normal ?? 1;
    m.normalScale.set(k, k);
  }
  if (spec.emissive) {
    m.emissive.copy(src.color);
    m.emissiveIntensity = spec.emissive;
  }
  if (spec.opacity !== undefined || src.transparent) {
    m.transparent = true;
    m.opacity = spec.opacity ?? src.opacity;
    m.depthWrite = false;
    m.side = THREE.DoubleSide;
  }
  if (spec.envBoost) m.envMapIntensity = spec.envBoost;
  if (m instanceof THREE.MeshPhysicalMaterial) {
    if (spec.clearcoat) {
      m.clearcoat = spec.clearcoat;
      m.clearcoatRoughness = 0.12;
    }
    if (spec.sheen) {
      m.sheen = spec.sheen;
      m.sheenRoughness = 0.7;
      m.sheenColor.copy(src.color).lerp(new THREE.Color(1, 1, 1), 0.4);
    }
  }
  built.set(name, m);
  return m;
}
