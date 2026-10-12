// Where the water is: the pool (a box volume from the SketchUp terrace) and the
// sea (Gerstner swells, damped in the shallows exactly like the sea shader).
import * as THREE from 'three';
import { waveHeight } from '../engine/water.ts';
import { gridHeight, ss, surfaceAt, type Grid } from '../world/terrain.ts';
import type { World } from '../world/World.ts';

export class Waterline {
  time = 0;
  constructor(
    private grid: Grid,
    private world: World,
  ) {}

  /** Surface height of the sea at (x, z) right now. */
  sea(x: number, z: number): number {
    const ground = gridHeight(this.grid, x, z);
    return waveHeight(x, z, this.time, ss(0, 4, -ground));
  }

  /** Surface height of whichever water contains the point, or null. */
  surfaceAt(p: THREE.Vector3): number | null {
    const pool = this.world.volumeSurfaceAt(p);
    if (pool !== null) return pool;
    const ground = gridHeight(this.grid, p.x, p.z);
    if (ground > 1.2) return null; // dry land: skip the wave maths
    return waveHeight(p.x, p.z, this.time, ss(0, 4, -ground));
  }

  ground(x: number, z: number): number {
    return gridHeight(this.grid, x, z);
  }

  /** What is underfoot, for footstep sounds. */
  surfaceKind(p: THREE.Vector3): string {
    const g = gridHeight(this.grid, p.x, p.z);
    if (p.y > g + 0.25) return 'hard'; // on architecture: decks, floors, stairs
    const [grass, sand, rock, paved] = surfaceAt(p.x, p.z, g, 0);
    const m = Math.max(grass, sand, rock, paved);
    return m === sand ? 'sand' : m === grass ? 'grass' : m === rock ? 'rock' : 'hard';
  }
}
