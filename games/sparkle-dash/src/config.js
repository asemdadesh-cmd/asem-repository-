// Tunable game constants + content tables. Everything balance-related lives here.

export const LANE_W = 2.4;          // world units between lane centres
export const SPAWN_AHEAD = 112;     // how far ahead stuff appears (hidden by fog)
export const DESPAWN_BEHIND = 14;   // recycled once this far behind the player
export const GRAVITY = 40;
export const JUMP_V = 14;           // apex ~2.45u, air time ~0.7s
export const FAST_FALL_V = -30;
export const LEVEL_LENGTH = 400;    // metres per level / biome
export const MAX_HEARTS = 5;
export const HURDLE_H = 0.95;       // jump-over obstacle height
export const BLOB_H = 3.0;          // too tall to jump: change lane
export const INVINCIBLE_AFTER_HIT = 1.7;
export const MAGNET_TIME = 9;
export const DASH_TIME = 5;

// speed in world units / second
export const DIFFICULTY = {
  easy:   { label: 'Easy',   hearts: 5, base: 10.5, max: 18.5, ramp: 0.005, gapMul: 1.2 },
  normal: { label: 'Normal', hearts: 3, base: 13.0, max: 25.0, ramp: 0.006, gapMul: 1.0 },
};

export const CHARACTERS = [
  { id: 'bunny', name: 'Bunny', unlockAt: 0 },
  { id: 'kitty', name: 'Kitty', unlockAt: 100 },
  { id: 'panda', name: 'Panda', unlockAt: 300 },
  { id: 'dino',  name: 'Dino',  unlockAt: 700 },
];

// Score = metres + 2 per star (+5 per obstacle smashed while dashing).
// Score needed for 1 / 2 / 3 stars on the results screen (everyone gets at least 1).
export const RATING_THRESHOLDS = [0, 400, 1000];

export const BIOMES = [
  {
    id: 'candy', name: 'Candy Meadow', space: 0,
    skyTop: '#ff9ad5', skyHorizon: '#fff1f8',
    track: '#ffd3ea', ground: '#8fe8bd', rail: '#ff6fb5',
    sun: '#ffe58a', hemiSky: '#fff4fb', hemiGround: '#ffb7da', dir: '#fff8e6',
    blob: ['#ff6fb5', '#9b7bff', '#ffb02e'],
    hurdle: ['#ff5c8a', '#ffffff'],
  },
  {
    id: 'clouds', name: 'Cloud Kingdom', space: 0,
    skyTop: '#4fb4ff', skyHorizon: '#e6f7ff',
    track: '#e4f1ff', ground: '#ecf7ff', rail: '#74c7ff',
    sun: '#fff6bf', hemiSky: '#f2fbff', hemiGround: '#a9d8ff', dir: '#ffffff',
    blob: ['#a9bde0', '#c9b2ff', '#ffffff'],
    hurdle: ['#59bfff', '#ffffff'],
  },
  {
    id: 'space', name: 'Space Zoom', space: 1,
    skyTop: '#090530', skyHorizon: '#3b2a92',
    track: '#6f63e8', ground: '#241a6e', rail: '#35ecff',
    sun: '#dcd5ff', hemiSky: '#d2caff', hemiGround: '#7a6ce0', dir: '#ffffff',
    blob: ['#ff6b6b', '#4fe8ff', '#ffd24a'],
    hurdle: ['#35ecff', '#a77bff'],
  },
  {
    id: 'beach', name: 'Sunny Beach', space: 0,
    skyTop: '#2fbdf5', skyHorizon: '#fff0c4',
    track: '#ffe6a6', ground: '#36d4e8', rail: '#ff8f5c',
    sun: '#fff2a0', hemiSky: '#fffbe8', hemiGround: '#e6f6ee', dir: '#fff5d6',
    blob: ['#ff8f5c', '#ffd24a', '#4fe0a0'],
    hurdle: ['#ff8f5c', '#ffffff'],
  },
];

export function biomeIndexForDistance(d) {
  return Math.floor(Math.max(0, d) / LEVEL_LENGTH) % BIOMES.length;
}
