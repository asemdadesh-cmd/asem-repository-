// Where every SketchUp asset goes. Positions are world metres (x east, y up,
// z south). `y` defaults to the ground height; `yaw` is degrees about +Y
// (0 = the asset's front faces south, toward the sea).
//
// physics: 'static-mesh' exact walkable geometry, 'static' COL_* boxes,
// 'dynamic' a rigid body (shape + mass), 'none' decoration only.
import { GARDEN_Y, LIGHTHOUSE, VILLA, coastZ, heightAt } from './terrain.ts';

export type PhysicsKind = 'static-mesh' | 'static' | 'dynamic' | 'none';

export interface Placement {
  asset: string;
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  scale?: number;
  physics: PhysicsKind;
  shape?: 'boxes' | 'hull' | 'ball';
  mass?: number;
  id?: string; // stable id for networking / interactions
  tint?: 'ivory' | 'ebony';
}

const P: Placement[] = [];
const add = (p: Placement) => {
  P.push(p);
  return p;
};

/** Converts villa-local SketchUp coordinates (x east, y north, z up) to world. */
function villa(xs: number, ys: number, zs: number) {
  return { x: VILLA.x + xs, y: VILLA.y + zs, z: VILLA.z - ys };
}

// ------------------------------------------------------------ the villa
add({ asset: 'Villa', ...villa(0, 0, 0), yaw: 0, physics: 'static-mesh', id: 'villa' });
add({ asset: 'Terrace', ...villa(0, 0, 0), yaw: 0, physics: 'static-mesh', id: 'terrace' });

// living room facing the fireplace (west wall), in front of the living-room
// glass and clear of the kitchen island and its stools behind it
add({ asset: 'Rug', ...villa(-5.3, 1.6, 0), yaw: 90, physics: 'none' });
add({ asset: 'Sofa', ...villa(-4.0, 1.6, 0.012), yaw: -90, physics: 'static', id: 'sofa' });
add({ asset: 'CoffeeTable', ...villa(-5.6, 1.6, 0.012), physics: 'static' });
add({ asset: 'Armchair', ...villa(-6.1, -0.55, 0), yaw: 165, physics: 'static', id: 'armchair-1' });
add({ asset: 'FloorLamp', ...villa(-7.25, -0.75, 0), physics: 'static' });
add({ asset: 'SideTable', ...villa(-4.0, 0.2, 0), physics: 'dynamic', shape: 'boxes', mass: 8 });

// dining by the glass, kitchen island stools
add({ asset: 'DiningTable', ...villa(-0.2, 2.4, 0), physics: 'static', id: 'dining' });
for (const [i, [x, y, yaw]] of (
  [
    [-0.55, 3.05, 180],
    [0.45, 3.05, 180],
    [-0.55, 1.75, 0],
    [0.45, 1.75, 0],
    [-1.55, 2.4, -90],
    [1.15, 2.4, 90],
  ] as Array<[number, number, number]>
).entries()) {
  add({ asset: 'DiningChair', ...villa(x, y, 0), yaw, physics: 'dynamic', shape: 'boxes', mass: 7, id: `dining-chair-${i}` });
}
for (const x of [-0.7, 0.3]) add({ asset: 'PendantLamp', ...villa(x, 2.4, 3.4), physics: 'none' });
for (const [i, x] of [-5.6, -4.8, -4.0].entries()) add({ asset: 'BarStool', ...villa(x, 3.85, 0), yaw: 180, physics: 'dynamic', shape: 'boxes', mass: 6, id: `stool-${i}` });
add({ asset: 'PendantLamp', ...villa(-4.8, 4.75, 3.4), physics: 'none' });

// bedroom
add({ asset: 'Bed', ...villa(5.4, 6.07, 0), yaw: 0, physics: 'static', id: 'bed' });
add({ asset: 'Nightstand', ...villa(4.05, 6.8, 0), physics: 'static' });
add({ asset: 'Nightstand', ...villa(6.75, 6.8, 0), physics: 'static' });
add({ asset: 'FloorLamp', ...villa(7.2, 0.0, 0), physics: 'static' });

// loggia: outdoor dining and a lounge facing the pool
add({ asset: 'DiningTable', ...villa(-5.0, -2.85, 0), physics: 'static' });
for (const [i, [x, y, yaw]] of (
  [
    [-5.5, -2.2, 180],
    [-4.5, -2.2, 180],
    [-5.5, -3.5, 0],
    [-4.5, -3.5, 0],
  ] as Array<[number, number, number]>
).entries()) {
  add({ asset: 'DiningChair', ...villa(x, y, 0), yaw, physics: 'dynamic', shape: 'boxes', mass: 7, id: `loggia-chair-${i}` });
}
add({ asset: 'Sofa', ...villa(3.6, -2.0, 0), yaw: 0, physics: 'static', id: 'loggia-sofa' });
add({ asset: 'CoffeeTable', ...villa(3.6, -3.25, 0), physics: 'static' });
add({ asset: 'Lantern', ...villa(1.6, -3.3, 0), physics: 'dynamic', shape: 'boxes', mass: 2 });
add({ asset: 'Lantern', ...villa(6.3, -3.4, 0), physics: 'dynamic', shape: 'boxes', mass: 2 });

// pool deck: two pairs of loungers with parasols
for (const [i, x] of [-4.6, -2.4, 2.4, 4.4].entries()) add({ asset: 'Lounger', ...villa(x, -5.05, 0), yaw: 0, physics: 'dynamic', shape: 'boxes', mass: 18, id: `pool-lounger-${i}` });
for (const x of [-3.5, 3.5]) add({ asset: 'Parasol', ...villa(x, -5.0, 0), physics: 'static' });

// roof terrace under the pergola
const roof = 3.4 + 0.35 + 0.02;
for (const [i, x] of [-4.4, -2.4].entries()) add({ asset: 'Lounger', ...villa(x, -1.3, roof), yaw: 0, physics: 'dynamic', shape: 'boxes', mass: 18, id: `roof-lounger-${i}` });
add({ asset: 'SideTable', ...villa(-3.4, -1.6, roof), physics: 'static' });
add({ asset: 'Lantern', ...villa(-1.0, -3.6, roof), physics: 'static' });
add({ asset: 'Armchair', ...villa(-6.6, 3.0, roof), yaw: 140, physics: 'static' });

// ------------------------------------------------------- lower garden
const gy = GARDEN_Y;
add({ asset: 'ChessBoard', x: -17, y: gy, z: 21, physics: 'static', id: 'chess-board' });
add({ asset: 'SwingFrame', x: -4, y: gy, z: 23.5, yaw: 0, physics: 'static', id: 'swing-frame' });
add({ asset: 'Bench', x: 5, y: gy, z: 27, yaw: 0, physics: 'static' });
add({ asset: 'Bench', x: -27, y: gy, z: 26.5, yaw: 20, physics: 'static' });
for (const [x, z, s] of [
  [-28, 15, 1.0],
  [12, 21, 0.9],
  [-9, 28.5, 1.1],
  [16, 14.5, 0.85],
] as Array<[number, number, number]>)
  add({ asset: 'OliveTree', x, y: gy, z, yaw: x * 37, scale: s, physics: 'static' });
for (const [x, z] of [
  [-31, 13.5],
  [-31, 19],
  [-31, 24.5],
  [18, 26],
  [-13, 13.2],
  [-21, 13.2],
])
  add({ asset: 'Shrub', x, y: gy, z, yaw: x * 13, physics: 'none' });
for (const [x, z] of [
  [-6, 18],
  [-12, 25],
  [2, 21],
  [8, 26],
  [-22, 28],
])
  add({ asset: 'Lantern', x, y: gy, z, physics: 'dynamic', shape: 'boxes', mass: 2 });

// --------------------------------------------- around the house: cypresses
for (let i = 0; i < 9; i++) add({ asset: 'Cypress', x: -16 + i * 4, z: -16.5, yaw: i * 40, scale: 0.85 + 0.25 * ((i * 7) % 5) / 4, physics: 'static' });
for (const [x, z] of [
  [-15, -6],
  [-15.5, 2],
  [-15, 8],
  [15, 8.5],
  [21, 5],
])
  add({ asset: 'Cypress', x, z, yaw: x * 9, scale: 0.9, physics: 'static' });

// ---------------------------------------------------------- the buggy
add({ asset: 'Buggy', x: 18, y: VILLA.y, z: -6, yaw: 90, physics: 'dynamic', id: 'buggy' });

// --------------------------------------------------------------- beach
/** a point on the sand `inland` metres back from the waterline */
function sand(x: number, inland: number) {
  const z = coastZ(x) - inland;
  return { x, z, y: heightAt(x, z) };
}
add({ asset: 'BeachBar', ...sand(17, 10.5), yaw: 0, physics: 'static', id: 'beach-bar' });
{
  const bar = sand(17, 10.5);
  for (const [i, dx] of [-1, 0, 1].entries()) add({ asset: 'BarStool', x: bar.x + dx * 0.9, z: bar.z + 1.95, y: heightAt(bar.x + dx * 0.9, bar.z + 1.95), yaw: 180, physics: 'dynamic', shape: 'boxes', mass: 6, id: `bar-stool-${i}` });
}
for (const [k, x] of [-6, 3, 27].entries()) {
  const c = sand(x, 6.5);
  add({ asset: 'ParasolStraw', ...c, physics: 'static' });
  for (const [j, dx] of [-0.95, 0.95].entries())
    add({ asset: 'Lounger', x: c.x + dx, z: c.z + 0.6, y: heightAt(c.x + dx, c.z + 0.6), yaw: 0, physics: 'dynamic', shape: 'boxes', mass: 18, id: `beach-lounger-${k}-${j}` });
}
add({ asset: 'VolleyNet', ...sand(36, 7), yaw: 90, physics: 'static' });
for (const [x, inland] of [
  [-44, 15],
  [-33, 17],
  [-14, 16],
  [9, 14.5],
  [24, 15.5],
  [47, 13],
  [53, 15],
  [-52, 13],
])
  add({ asset: 'Palm', ...sand(x, inland), yaw: x * 23, scale: 0.9 + ((x * x) % 7) / 30, physics: 'static' });
add({ asset: 'Kayak', ...sand(-12, 3.5), yaw: 70, physics: 'dynamic', shape: 'boxes', mass: 22, id: 'kayak' });
add({ asset: 'Surfboard', ...sand(-9.5, 4.2), yaw: 50, physics: 'dynamic', shape: 'boxes', mass: 5, id: 'surfboard' });
add({ asset: 'BeachBall', ...sand(8, 5), y: heightAt(8, coastZ(8) - 5) + 0.25, physics: 'dynamic', shape: 'ball', mass: 0.12, id: 'beach-ball' });
add({ asset: 'Football', ...sand(32, 6), y: heightAt(32, coastZ(32) - 6) + 0.15, physics: 'dynamic', shape: 'ball', mass: 0.43, id: 'football' });
add({ asset: 'Football', x: -1, y: gy + 0.2, z: 21, physics: 'dynamic', shape: 'ball', mass: 0.43, id: 'garden-ball' });
// crates and barrels by the start of the pier
{
  const c = sand(-27.5, 10);
  const crates: Array<[number, number, number, number]> = [
    [0, 0, 0, 0],
    [0.68, 0.1, 0, 25],
    [0.3, 0.75, 0, 12],
    [0.35, 0.3, 0.6, 40],
  ];
  for (const [dx, dz, dy, yaw] of crates) add({ asset: 'Crate', x: c.x + dx, z: c.z + dz, y: heightAt(c.x + dx, c.z + dz) + dy, yaw, physics: 'dynamic', shape: 'boxes', mass: 14 });
  add({ asset: 'Barrel', x: c.x + 1.8, z: c.z - 0.6, y: heightAt(c.x + 1.8, c.z - 0.6), physics: 'dynamic', shape: 'hull', mass: 30 });
  add({ asset: 'Barrel', x: c.x + 2.4, z: c.z + 0.1, y: heightAt(c.x + 2.4, c.z + 0.1), physics: 'dynamic', shape: 'hull', mass: 30 });
}

// ---------------------------------------------------------------- pier
export const PIER = (() => {
  const x = -22;
  // start where the sand is ~1.15 m up so the deck (1.3 m) clears it
  let z = coastZ(x) - 20;
  while (heightAt(x, z) > 1.15 && z < coastZ(x)) z += 0.25;
  return { x, z0: z, deckY: 1.3, sections: 12 };
})();
for (let k = 0; k < PIER.sections; k++) add({ asset: 'PierSection', x: PIER.x, y: PIER.deckY, z: PIER.z0 + 1.5 + 3 * k, yaw: 180, physics: 'static', id: `pier-${k}` });
export const PIER_END = { x: PIER.x, y: PIER.deckY, z: PIER.z0 + 3 * PIER.sections + 3 };
add({ asset: 'PierEnd', ...PIER_END, yaw: 0, physics: 'static', id: 'pier-end' });
add({ asset: 'Lifebuoy', x: PIER.x + 0.95, y: PIER.deckY, z: PIER.z0 + 9, yaw: -90, physics: 'none' });
for (let k = 1; k < PIER.sections; k += 4) add({ asset: 'PierLamp', x: PIER.x - 0.95, y: PIER.deckY, z: PIER.z0 + 3 * k + 0.4, physics: 'static' });

// ----------------------------------------------------------- lighthouse
add({ asset: 'Lighthouse', x: LIGHTHOUSE.x, y: LIGHTHOUSE.y, z: LIGHTHOUSE.z, yaw: -135, physics: 'static-mesh', id: 'lighthouse' });
for (const [x, z, s, a] of [
  [82, 60, 1.6, 0],
  [66, 72, 1.3, 40],
  [80, 74, 2.0, 90],
  [62, 64, 1.1, 10],
  [86, 68, 1.4, 70],
] as Array<[number, number, number, number]>)
  add({ asset: a > 50 ? 'Boulder' : 'RockFlat', x, z, yaw: a, scale: s, physics: 'static' });

// lamps along the road and the garden path
for (const [x, z] of [
  [26, -11.5],
  [37, 4],
  [43.5, 26],
  [50, 41],
  [62, 52.5],
  [4.2, 35],
])
  add({ asset: 'PierLamp', x: x + 2.4, z, physics: 'static' });

// boulders along the beach ends
for (const [x, inland, s, a] of [
  [-60, 4, 1.4, 70],
  [-56, 10, 1.0, 20],
  [58, 6, 1.2, 80],
  [-40, 1, 0.8, 60],
] as Array<[number, number, number, number]>)
  add({ asset: a > 50 ? 'Boulder' : 'RockFlat', ...sand(x, inland), yaw: a, scale: s, physics: 'static' });

// giant chess pieces in their starting squares (white on the house side)
{
  const S = 0.6;
  const order = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
  for (let i = 0; i < 8; i++) {
    const x = -17 - 4 * S + S / 2 + i * S;
    for (const [row, asset, tint, yaw] of [
      [0, order[i], 'ivory', 0],
      [1, 'Pawn', 'ivory', 0],
      [6, 'Pawn', 'ebony', 180],
      [7, order[i], 'ebony', 180],
    ] as Array<[number, string, 'ivory' | 'ebony', number]>) {
      const z = 21 - 4 * S + S / 2 + row * S;
      add({ asset, x, y: GARDEN_Y + 0.05, z, yaw, physics: 'dynamic', shape: 'hull', mass: asset === 'Pawn' ? 6 : 10, tint, id: `chess-${asset}-${i}-${row}` });
    }
  }
}

export const LAYOUT: readonly Placement[] = P.map((p) => ({ ...p, y: p.y ?? heightAt(p.x, p.z) }));

export const SPAWNS = {
  loggia: { ...villa(0, -3.0, 0), yaw: 0 },
  beach: { ...sand(0, 9), yaw: 180 },
};
