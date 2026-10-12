// Physics and world invariants: the terrain the player walks on is the terrain
// that is drawn, things float the way Archimedes says and stay stable, and
// room codes / encryption behave.
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Physics, RAPIER } from '../src/engine/physics.ts';
import { TERRAIN, gridHeight, heightAt, sampleGrid, type Grid } from '../src/world/terrain.ts';
import { waveHeight } from '../src/engine/water.ts';
import { Buoyancy, boxFloater } from '../src/game/buoyancy.ts';
import type { Waterline } from '../src/game/waterline.ts';
import { newRoomCode, normaliseCode, Relay } from '../src/net/relay.ts';

let grid: Grid;
beforeAll(async () => {
  await RAPIER.init();
  grid = sampleGrid();
});

describe('terrain', () => {
  it('the sampled grid matches the height function at its vertices', () => {
    for (let k = 0; k < 200; k++) {
      const i = Math.floor(Math.random() * grid.nx);
      const j = Math.floor(Math.random() * grid.nz);
      const x = TERRAIN.minX + i * TERRAIN.cell;
      const z = TERRAIN.minZ + j * TERRAIN.cell;
      expect(gridHeight(grid, x, z)).toBeCloseTo(heightAt(x, z), 4);
    }
  });

  it('the physics heightfield is the rendered terrain (same triangles)', async () => {
    const physics = await Physics.create();
    physics.addTerrain(grid);
    physics.world.step();
    let worst = 0;
    for (let k = 0; k < 300; k++) {
      // avoid exact grid lines, where a ray can slip between two triangles
      const x = TERRAIN.minX + 5 + Math.random() * (TERRAIN.maxX - TERRAIN.minX - 10) + 0.013;
      const z = TERRAIN.minZ + 5 + Math.random() * (TERRAIN.maxZ - TERRAIN.minZ - 10) + 0.017;
      const hit = physics.ray(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 200);
      expect(hit).not.toBeNull();
      worst = Math.max(worst, Math.abs(60 - hit! - gridHeight(grid, x, z)));
    }
    expect(worst).toBeLessThan(0.005);
  });

  it('the villa plateau, garden and beach are where the layout expects', () => {
    expect(heightAt(0, 0)).toBeCloseTo(7.98, 1);
    expect(heightAt(-10, 20)).toBeCloseTo(4.5, 1);
    expect(heightAt(0, 70)).toBeLessThan(0); // the sea
  });
});

describe('buoyancy', () => {
  // flat, still water at y = 0 everywhere
  const flat = { surfaceAt: () => 0 } as unknown as Waterline;

  async function floatBox(mass: number, size: THREE.Vector3, fill: number, seconds = 8) {
    const physics = await Physics.create();
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.5, 0).setCanSleep(false));
    physics.world.createCollider(RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(0, size.y / 2, 0).setDensity(0), body);
    body.setAdditionalMass(mass, true);
    const b = new Buoyancy(flat);
    b.add(boxFloater(body, new THREE.Vector3(-size.x / 2, 0, -size.z / 2), new THREE.Vector3(size.x / 2, size.y, size.z / 2), fill, 3, 3));
    physics.preStep.push((dt) => b.step(dt));
    physics.postStep.push(() => b.clear());
    let maxY = -Infinity;
    for (let i = 0; i < seconds * 60; i++) {
      physics.update(1 / 60);
      maxY = Math.max(maxY, body.translation().y);
    }
    return { body, maxY };
  }

  it('a 120 kg hull settles at the draft Archimedes predicts and stays upright', async () => {
    const size = new THREE.Vector3(1.24, 0.55, 3.4);
    const fill = 0.55;
    const { body, maxY } = await floatBox(120, size, fill);
    // weight = ρ g (area·fill) · draft  →  draft = m / (ρ · area · fill)
    const draft = 120 / (1000 * size.x * size.z * fill);
    expect(-body.translation().y).toBeCloseTo(draft, 1);
    expect(Math.abs(body.linvel().y)).toBeLessThan(0.05);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(body.rotation() as THREE.Quaternion);
    expect(up.y).toBeGreaterThan(0.99);
    expect(maxY).toBeLessThan(0.6); // never launched out of the water
  });

  it('forces and torques are cleared every step (nothing accumulates)', async () => {
    const { body } = await floatBox(14, new THREE.Vector3(0.6, 0.6, 0.6), 0.7, 3);
    const t = body.userTorque();
    const f = body.userForce();
    expect(Math.hypot(t.x, t.y, t.z)).toBeLessThan(1e-6);
    expect(Math.hypot(f.x, f.y, f.z)).toBeLessThan(1e-6);
  });

  it('something denser than water sinks', async () => {
    // a 2 kg lantern displacing ~1 litre
    const { body } = await floatBox(2, new THREE.Vector3(0.25, 0.4, 0.25), 0.04, 3);
    expect(body.translation().y).toBeLessThan(-0.6);
    expect(body.linvel().y).toBeLessThan(-0.1); // still going down, slowed by the water
  });
});

describe('sea', () => {
  it('waves are gentle swells (|h| < 0.35 m) and calm in the shallows', () => {
    let worst = 0;
    for (let k = 0; k < 500; k++) worst = Math.max(worst, Math.abs(waveHeight(Math.random() * 200, Math.random() * 200, Math.random() * 100)));
    expect(worst).toBeLessThan(0.35);
    expect(Math.abs(waveHeight(10, 10, 5, 0))).toBe(0);
  });
});

describe('rooms', () => {
  it('codes are long, unambiguous and round-trip through links', () => {
    const c = newRoomCode();
    expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(c).not.toMatch(/[IL01O]/);
    expect(normaliseCode(c.replace(/-/g, '').toLowerCase())).toBe(c);
    expect(normaliseCode('nope')).toBeNull();
    expect(normaliseCode('IIII-IIII-IIII')).toBeNull();
  });

  it('different rooms derive different topics and keys', async () => {
    const a = new Relay<unknown>('ABCD-EFGH-JKMN', []);
    const b = new Relay<unknown>('ABCD-EFGH-JKMP', []);
    await a.connect();
    await b.connect();
    expect(a['topic']).toMatch(/^villa-serena\/v1\/[0-9a-f]{32}$/);
    expect(a['topic']).not.toBe(b['topic']);
    expect(a['topic']).not.toContain('ABCD');
    a.close();
    b.close();
  });
});
