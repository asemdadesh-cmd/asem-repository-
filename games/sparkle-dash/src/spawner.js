// Generates the course ahead of the player in hand-designed "patterns", pools the
// meshes, moves them with the scrolling world and answers collision queries.
//
// Everything is positioned by its track coordinate `s` (distance along the track).
// A prop's world z is simply (traveled - s), so there is no accumulated drift.
import * as THREE from 'three';
import { LANE_W, SPAWN_AHEAD, DESPAWN_BEHIND, JUMP_V, GRAVITY, HURDLE_H, BLOB_H, LEVEL_LENGTH } from './config.js';
import { makeBlob, makeHurdle, makePickup, starMat } from './props.js';
import { geo } from './gfx.js';

const AIR_TIME = (2 * JUMP_V) / GRAVITY;
const laneX = (l) => l * LANE_W;
const STAR_Y = 0.95;
const MAX_STARS = 260;
const _o = new THREE.Object3D();

// ---- patterns ----------------------------------------------------------------
// Each pattern receives a context `c` and returns how much track it used.
// Rule for every pattern: at least one lane is always passable by lane-change, or
// every lane is jumpable. Gaps between patterns leave time to change lanes.

const sign = (n) => (n < 0 ? -1 : 1);

function arcStars(c, lane, ds0, count = 5) {
  for (let i = 0; i < count; i++) {
    const t = (AIR_TIME * (i + 0.5)) / count;
    const y = STAR_Y + JUMP_V * t - 0.5 * GRAVITY * t * t;
    c.star(lane, y, ds0 + c.speed * (t - AIR_TIME / 2));
  }
}
const arcHalf = (c) => (c.speed * AIR_TIME) / 2;

function pLine(c) {
  const lane = c.rng.int(-1, 1);
  const n = c.rng.int(5, 8);
  for (let i = 0; i < n; i++) c.star(lane, STAR_Y, i * 2.4);
  return (n - 1) * 2.4 + 2;
}

function pSnake(c) {
  let lane = c.rng.int(-1, 1);
  let dir = lane === 0 ? c.rng.pick([-1, 1]) : -sign(lane);
  for (let i = 0; i < 9; i++) {
    c.star(lane, STAR_Y, i * 2.4);
    if (i % 2 === 1) {
      if (lane + dir > 1 || lane + dir < -1) dir = -dir;
      lane += dir;
    }
  }
  return 9 * 2.4;
}

function pRain(c) {
  for (let row = 0; row < 4; row++) for (let lane = -1; lane <= 1; lane++) c.star(lane, STAR_Y, row * 2.4);
  return 4 * 2.4 + 1;
}

function pHurdle(c) {
  const lane = c.rng.int(-1, 1);
  const half = arcHalf(c);
  c.hurdle(lane, half + 1);
  arcStars(c, lane, half + 1);
  if (c.rng.chance(0.5)) {
    const other = (lane + c.rng.pick([1, 2]) + 4) % 3 - 1;
    for (let i = 0; i < 4; i++) c.star(other, STAR_Y, 1 + i * 2.4);
  }
  return half * 2 + 2;
}

function pHurdleAll(c) {
  const half = arcHalf(c);
  for (let lane = -1; lane <= 1; lane++) c.hurdle(lane, half + 1);
  arcStars(c, 0, half + 1, 6);
  return half * 2 + 2;
}

function pBlob(c) {
  const lane = c.rng.int(-1, 1);
  const free = (lane + c.rng.pick([1, 2]) + 4) % 3 - 1;
  c.blob(lane, 6);
  for (let i = 0; i < 6; i++) c.star(free, STAR_Y, i * 2.4);
  return 13;
}

function pWall(c) {
  const free = c.rng.int(-1, 1);
  for (let lane = -1; lane <= 1; lane++) if (lane !== free) c.blob(lane, 7);
  for (let i = 0; i < 7; i++) c.star(free, STAR_Y, i * 2.4);
  return 15;
}

function pZigzag(c) {
  const gap = Math.max(10, c.speed * 0.85 * c.gapMul);
  let free = c.rng.int(-1, 1);
  let ds = 2;
  for (let row = 0; row < 3; row++) {
    for (let lane = -1; lane <= 1; lane++) if (lane !== free) c.blob(lane, ds + 4.8);
    c.star(free, STAR_Y, ds);
    c.star(free, STAR_Y, ds + 2.4);
    c.star(free, STAR_Y, ds + 4.8);
    c.star(free, STAR_Y, ds + 7.2);
    const step = free === 0 ? c.rng.pick([-1, 1]) : -sign(free);
    free += step;
    ds += gap;
  }
  return ds + 4;
}

function pMixed(c) {
  const half = arcHalf(c);
  const hurdleLane = c.rng.int(-1, 1);
  const rest = [-1, 0, 1].filter((l) => l !== hurdleLane);
  const blobLane = c.rng.pick(rest);
  const freeLane = rest.find((l) => l !== blobLane);
  c.hurdle(hurdleLane, half + 1);
  c.blob(blobLane, half + 1);
  arcStars(c, hurdleLane, half + 1);
  for (let i = 0; i < 6; i++) c.star(freeLane, STAR_Y, i * 2.4);
  return half * 2 + 2;
}

function pHurdleChain(c) {
  const half = arcHalf(c);
  const lane = c.rng.int(-1, 1);
  const spacing = half * 2 + 3;
  for (let i = 0; i < 2; i++) {
    c.hurdle(lane, half + 1 + i * spacing);
    arcStars(c, lane, half + 1 + i * spacing);
  }
  return spacing + half * 2 + 2;
}

const PATTERNS = [
  { id: 'line', w: 3, min: 0, safe: true, fn: pLine },
  { id: 'snake', w: 2, min: 0, safe: true, fn: pSnake },
  { id: 'rain', w: 1.2, min: 0, safe: true, fn: pRain },
  { id: 'hurdle', w: 3, min: 0, fn: pHurdle },
  { id: 'blob', w: 3, min: 0, fn: pBlob },
  { id: 'wall', w: 2, min: 1, fn: pWall },
  { id: 'hurdleAll', w: 1.6, min: 1, fn: pHurdleAll },
  { id: 'zigzag', w: 2, min: 1, fn: pZigzag },
  { id: 'mixed', w: 2.2, min: 2, fn: pMixed },
  { id: 'chain', w: 1.5, min: 2, fn: pHurdleChain },
];

function pPickup(c, type) {
  const lane = c.rng.int(-1, 1);
  for (let i = 0; i < 4; i++) c.star(lane, STAR_Y, i * 2.4);
  c.pickup(lane, 4 * 2.4 + 1, type);
  return 4 * 2.4 + 3;
}

// ---- spawner -----------------------------------------------------------------

export class Spawner {
  constructor(scene, rng, world) {
    this.scene = scene;
    this.rng = rng;
    this.world = world;
    this.pool = new Map();
    this.obstacles = [];
    this.stars = [];
    this.pickups = [];
    this.time = 0;
    this.cursor = 0;
    this.lastPattern = '';
    this.nextPickupS = 0;
    this.warmEnd = 0;
    this.enabled = false;

    // every star in the scene is one instance of a single mesh (1 draw call)
    this.starMesh = new THREE.InstancedMesh(geo.star, starMat, MAX_STARS);
    this.starMesh.frustumCulled = false;
    this.starMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.starMesh.count = 0;
    scene.add(this.starMesh);
  }

  reset(traveled, { warmup = 60 } = {}) {
    for (const e of [...this.obstacles, ...this.stars, ...this.pickups]) this.release(e);
    this.obstacles.length = this.stars.length = this.pickups.length = 0;
    this.cursor = traveled + 28;
    this.warmEnd = traveled + warmup;
    this.nextPickupS = traveled + 150;
    this.lastPattern = '';
  }

  acquire(key, make) {
    const list = this.pool.get(key);
    const mesh = list && list.length ? list.pop() : make();
    mesh.userData.poolKey = key;
    mesh.visible = true;
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(1);
    if (mesh.userData.body) mesh.userData.body.scale.set(1, 1, 1);
    this.scene.add(mesh);
    return mesh;
  }

  release(e) {
    if (!e.mesh) return;      // stars are instances, nothing to pool
    this.scene.remove(e.mesh);
    const key = e.mesh.userData.poolKey;
    if (!this.pool.has(key)) this.pool.set(key, []);
    this.pool.get(key).push(e.mesh);
  }

  // -- entity creation ---------------------------------------------------------

  addStar(s, x, y) {
    if (this.stars.length >= MAX_STARS) return;
    this.stars.push({ type: 'star', s, x, y, pos: new THREE.Vector3(x, y, 0), attracted: false, phase: this.rng.next() * 6.28 });
  }

  addObstacle(kind, s, lane) {
    const biome = this.world.biomeAt(s);
    const variant = kind === 'blob' ? this.rng.int(0, 2) : 0;
    const key = `${kind}|${biome}|${variant}`;
    const mesh = this.acquire(key, () => (kind === 'blob' ? makeBlob(biome, variant) : makeHurdle(biome)));
    this.obstacles.push({
      type: kind, s, x: laneX(lane), mesh,
      halfW: kind === 'blob' ? 0.72 : 0.9,
      halfD: kind === 'blob' ? 0.8 : 0.4,
      height: kind === 'blob' ? BLOB_H : HURDLE_H,
      knocked: false, knockT: 0, ox: 0, oy: 0, oz: 0, vx: 0, vy: 0, vz: 0,
      phase: this.rng.next() * 6.28,
    });
  }

  addPickup(s, x, sub) {
    const mesh = this.acquire(`pickup|${sub}`, () => makePickup(sub));
    this.pickups.push({ type: 'pickup', sub, s, x, y: 1.25, mesh });
  }

  // -- generation ----------------------------------------------------------------

  spawnPattern(speed, gapMul) {
    const s = this.cursor;
    const r = this.rng;
    const level = Math.floor(Math.max(0, s - this.world.runStart) / LEVEL_LENGTH);
    const c = {
      rng: r, speed, level, gapMul,
      star: (lane, y, ds) => this.addStar(s + ds, laneX(lane), y),
      hurdle: (lane, ds) => this.addObstacle('hurdle', s + ds, lane),
      blob: (lane, ds) => this.addObstacle('blob', s + ds, lane),
      pickup: (lane, ds, type) => this.addPickup(s + ds, laneX(lane), type),
    };

    let len;
    if (s >= this.nextPickupS && s > this.warmEnd) {
      const type = r.chance(0.3) ? 'heart' : r.pick(['magnet', 'shield', 'dash']);
      len = pPickup(c, type);
      this.nextPickupS = s + r.range(240, 380);
      this.lastPattern = 'pickup';
    } else {
      const warm = s < this.warmEnd;
      const options = PATTERNS.filter((p) => p.min <= level && p.id !== this.lastPattern && (!warm || p.safe));
      let total = 0;
      for (const p of options) total += p.w;
      let pick = r.next() * total;
      let chosen = options[0];
      for (const p of options) {
        pick -= p.w;
        if (pick <= 0) { chosen = p; break; }
      }
      len = chosen.fn(c);
      this.lastPattern = chosen.id;
    }
    const gap = Math.min(28, Math.max(9, speed * 0.95 * gapMul));
    this.cursor = s + len + gap;
  }

  // -- per frame -----------------------------------------------------------------

  update(dt, traveled, speed, gapMul, player, magnetRadius) {
    this.time += dt;
    if (this.enabled) while (this.cursor < traveled + SPAWN_AHEAD) this.spawnPattern(speed, gapMul);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const e = this.obstacles[i];
      const z = traveled - e.s;
      if (e.knocked) {
        e.knockT += dt;
        e.vy -= 30 * dt;
        e.ox += e.vx * dt; e.oy += e.vy * dt; e.oz += e.vz * dt;
        e.mesh.rotation.z += 9 * dt * Math.sign(e.vx || 1);
        e.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 1.5));
        e.mesh.position.set(e.x + e.ox, Math.max(0, e.oy), z + e.oz);
        if (e.knockT > 0.7) { this.release(e); this.obstacles.splice(i, 1); continue; }
      } else {
        e.mesh.position.set(e.x, 0, z);
        const body = e.mesh.userData.body;
        if (body) body.scale.y = 1 + Math.sin(this.time * 4 + e.phase) * 0.035;
      }
      if (z > DESPAWN_BEHIND) { this.release(e); this.obstacles.splice(i, 1); }
    }

    let k = 0;
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const e = this.stars[i];
      const z = traveled - e.s;
      if (e.attracted) {
        const f = 1 - Math.exp(-dt * 11);
        e.pos.x += (player.x - e.pos.x) * f;
        e.pos.y += (player.y + 0.9 - e.pos.y) * f;
        e.pos.z += (0 - e.pos.z) * f;
      } else {
        e.pos.set(e.x, e.y + Math.sin(this.time * 3 + e.phase) * 0.1, z);
        if (magnetRadius > 0 && z > -magnetRadius && z < 2 && Math.abs(e.x - player.x) < magnetRadius) e.attracted = true;
      }
      if (z > 6 && !e.attracted) { this.stars.splice(i, 1); continue; }
      // missed stars shrink away behind the hero instead of ballooning past the camera
      const sc = e.attracted || z < 1.5 ? 1 : Math.max(0, 1 - (z - 1.5) / 4);
      _o.position.copy(e.pos);
      _o.rotation.set(0, this.time * 2.8 + e.phase, 0);
      _o.scale.setScalar(sc * 1.15);
      _o.updateMatrix();
      this.starMesh.setMatrixAt(k++, _o.matrix);
    }
    this.starMesh.count = k;
    this.starMesh.instanceMatrix.needsUpdate = true;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const e = this.pickups[i];
      const z = traveled - e.s;
      e.mesh.position.set(e.x, e.y + Math.sin(this.time * 2.5) * 0.18, z);
      e.mesh.userData.icon.rotation.y = this.time * 2.2;
      e.mesh.scale.setScalar(z < 1.5 ? 1 : Math.max(0, 1 - (z - 1.5) / 4));
      if (z > 6) { this.release(e); this.pickups.splice(i, 1); }
    }
  }

  // -- collisions ----------------------------------------------------------------

  /** First obstacle the player (x, feet-height y) is overlapping, or null. */
  hitObstacle(traveled, player) {
    for (const e of this.obstacles) {
      if (e.knocked) continue;
      const z = traveled - e.s;
      if (Math.abs(z) > e.halfD + 0.3) continue;
      if (Math.abs(player.x - e.x) > e.halfW + 0.32) continue;
      if (player.y < e.height - 0.12) return e;
    }
    return null;
  }

  knock(e, fromX) {
    e.knocked = true;
    e.vx = (e.x - fromX) * 2 + this.rng.range(-3, 3);
    if (Math.abs(e.vx) < 2.5) e.vx = 2.5 * sign(e.vx || 1);
    e.vy = 11;
    e.vz = -4;
  }

  /** Collect stars touching the player; calls onStar(worldPosition) for each. */
  collectStars(player, onStar) {
    const cy = player.y + 0.9;
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const m = this.stars[i].pos;
      if (Math.abs(m.z) < 1.0 && Math.abs(m.x - player.x) < 0.95 && Math.abs(m.y - cy) < 1.15) {
        onStar(m);
        this.release(this.stars[i]);
        this.stars.splice(i, 1);
      } else if (this.stars[i].attracted) {
        const dx = m.x - player.x, dy = m.y - cy, dz = m.z;
        if (dx * dx + dy * dy + dz * dz < 1.2) {
          onStar(m);
          this.release(this.stars[i]);
          this.stars.splice(i, 1);
        }
      }
    }
  }

  collectPickups(traveled, player, onPickup) {
    const cy = player.y + 0.9;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const e = this.pickups[i];
      const z = traveled - e.s;
      if (Math.abs(z) < 1.3 && Math.abs(e.x - player.x) < 1.2 && Math.abs(e.y - cy) < 1.7) {
        onPickup(e);
        this.release(e);
        this.pickups.splice(i, 1);
      }
    }
  }
}
