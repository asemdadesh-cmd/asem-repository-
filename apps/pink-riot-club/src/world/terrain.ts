// Island shape + height function shared by rendering and movement.
import * as THREE from 'three';
import { POOL } from '../../shared/world.ts';
import { rng } from '../gfx/textures.ts';

/** Radius of the grassy plateau edge at angle a. */
export function islandRadius(a: number): number {
  return 50 + 3.2 * Math.sin(3 * a + 0.4) + 2.4 * Math.cos(5 * a + 1.1) + 1.4 * Math.sin(7 * a + 2);
}

export const BEACH = 9; // sand band width
export const SEA_LEVEL = -0.35;

/** 0 on the plateau, slopes down across the beach into the sea. */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const edge = islandRadius(a);
  const t = (r - (edge - BEACH)) / BEACH; // 0 = start of sand, 1 = shoreline
  if (t <= 0) return 0;
  if (t <= 1) return -0.55 * t * t;
  return -0.55 - (r - edge) * 0.22;
}

/** 0 = grass, 1 = sand */
export function sandiness(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const edge = islandRadius(Math.atan2(z, x));
  return THREE.MathUtils.smoothstep(r, edge - BEACH - 1.5, edge - BEACH + 1.5);
}

export function inPoolBasin(x: number, z: number, margin = 0): boolean {
  return Math.abs(x - POOL.cx) < POOL.halfX + margin && Math.abs(z - POOL.cz) < POOL.halfZ + margin;
}

export function createTerrain(): THREE.Mesh {
  const size = 150;
  const seg = 150;
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const grassA = new THREE.Color('#9fe3c0');
  const grassB = new THREE.Color('#86d6ad');
  const sandA = new THREE.Color('#f8dcd2');
  const wet = new THREE.Color('#e9bfb4');
  const r = rng(99);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h + (h === 0 ? 0 : 0));
    const sd = sandiness(x, z);
    const n = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 + 0.5;
    c.copy(grassA).lerp(grassB, n * 0.6 + r() * 0.15);
    const sc = sandA.clone().lerp(wet, THREE.MathUtils.smoothstep(h, -0.25, -0.6));
    c.lerp(sc, sd);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  // drop the triangles inside the pool basin (the pool builds its own walls)
  const idx = g.index!;
  const keep: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    const b = idx.getX(i + 1);
    const d = idx.getX(i + 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(d)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(d)) / 3;
    if (inPoolBasin(cx, cz, 0.1)) continue;
    keep.push(a, b, d);
  }
  g.setIndex(keep);
  const tex = detailTexture();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.95 }));
  m.receiveShadow = true;
  return m;
}

function detailTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  const r = rng(5);
  for (let i = 0; i < 9000; i++) {
    const v = 0.86 + r() * 0.14;
    ctx.fillStyle = `rgb(${v * 255},${v * 255},${v * 255})`;
    ctx.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
