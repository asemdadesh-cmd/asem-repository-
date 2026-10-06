// Outfit + hair recipes for the three skinned avatars (see paint-looks.mjs).
//   يسو        burgundy hair, pink blazer, white shirt, cream trousers
//   يسو بالقفطان  (extra texture) ivory kaftan with gold embroidery
//   عاصم       dark wavy hair + beard, warm skin, black jacket with gold
//              embroidery open over a white shirt, cream trousers
//   الكابتن     Morocco kit: red #10 jersey with the green star, green shorts
import {
  bodyFrame,
  clamp01,
  decode,
  embroidery,
  hex,
  hsv,
  islandHeights,
  lum,
  lumRange,
  mix,
  onNumber,
  inStar,
  paint,
  positionMap,
  ramp,
  replaceImage,
  smooth,
} from './paint-looks.mjs';

const mat = (doc, name) => doc.getRoot().listMaterials().find((m) => m.getName() === name);

const GOLD = hex('#d9a93f');
const GOLD_LIGHT = hex('#ffe39a');
const GOLD_DARK = hex('#8a6116');

/** Burgundy hair with natural highlights from the original strand shading. */
function burgundyHair(img) {
  const [lo, hi] = lumRange(img, () => true, 0.02, 0.98);
  const stops = [
    [0, hex('#160206')],
    [0.4, hex('#3d0814')],
    [0.75, hex('#641127')],
    [1, hex('#8c2a43')],
  ];
  paint(img, ([r, g, b], _k, a) => (a < 4 ? null : ramp(stops, clamp01((lum(r, g, b) - lo) / (hi - lo || 1)) ** 0.9)));
}

// ------------------------------------------------------------------ يسو (Avaturn)

export async function lookYasso(doc) {
  const hair = mat(doc, 'avaturn_hair_0_material');
  if (hair) {
    const img = await decode(hair.getBaseColorTexture());
    burgundyHair(img);
    await replaceImage(hair.getBaseColorTexture(), img);
  }
  const look = mat(doc, 'avaturn_look_0_material');
  const tex = look.getBaseColorTexture();
  const frame = bodyFrame(doc);
  const original = await decode(tex);
  const map = positionMap(doc, frame, look, original.w, original.h);
  const isl = islandHeights(map);
  const legs = (k) => (isl.get(map.island[k]) ?? 1) < 0.45;
  const [lo, hi] = lumRange(original, (k) => !legs(k));
  const white = (r, g, b) => lum(r, g, b) > 0.55 && hsv(r, g, b)[1] < 0.18;

  // casual: pink blazer over a white shirt, cream trousers
  const casual = { data: original.data.slice(), w: original.w, h: original.h };
  const pink = [
    [0, hex('#9c2c5c')],
    [0.45, hex('#e0679b')],
    [1, hex('#ffc0dc')],
  ];
  const cream = [
    [0, hex('#b9aa98')],
    [0.5, hex('#ebe1d3')],
    [1, hex('#fffaf2')],
  ];
  paint(casual, ([r, g, b], k) => {
    const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
    if (white(r, g, b)) return mix([r, g, b], hex('#fff7fa'), 0.6);
    if (legs(k)) return ramp(cream, clamp01(L * 1.3 + 0.15));
    return ramp(pink, L);
  });
  await replaceImage(tex, casual);

  // kaftan: ivory satin, gold embroidery around the neckline/front edges and hem
  const kaftan = { data: original.data.slice(), w: original.w, h: original.h };
  const ivory = [
    [0, hex('#d2c3a3')],
    [0.4, hex('#f1e7d1')],
    [1, hex('#fffbf2')],
  ];
  // shirt texels mark the front opening; embroider jacket texels next to them (in 3D)
  const near = nearMask(map, (k) => white(original.data[k * 4], original.data[k * 4 + 1], original.data[k * 4 + 2]) && !legs(k), 0.012);
  paint(kaftan, ([r, g, b], k) => {
    const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
    const h = map.H[k];
    if (white(r, g, b) && !legs(k)) return mix(hex('#f6e7c1'), hex('#fff4d6'), L);
    // embroidered bands: along the opening, sleeve ends and the jacket hem
    const band = near[k] ? 1 : 0;
    const hem = !legs(k) && h < 0.5 ? 1 : 0;
    const cuff = !legs(k) && Math.abs(map.X[k]) > 0.33 ? 1 : 0;
    if (band || hem || cuff) {
      const s = band ? h * 55 : cuff ? (map.H[k] + Math.abs(map.Z[k])) * 55 : map.X[k] * 55;
      const t = band ? 0.5 : 0.5;
      return mix(embroidery(s, t, GOLD, GOLD_LIGHT, GOLD_DARK), ramp(ivory, L), 0.1);
    }
    return ramp(ivory, legs(k) ? clamp01(L * 1.2 + 0.2) : L);
  });
  return { kaftan };
}

/** Marks texels within `dist` (body units, 3D) of any texel picked by `seed`; value encodes depth 1..255. */
function nearMask(map, seed, dist) {
  const cell = dist;
  const grid = new Map();
  const key = (x, h, z) => `${Math.floor(x / cell)},${Math.floor(h / cell)},${Math.floor(z / cell)}`;
  for (let k = 0; k < map.island.length; k += 2) {
    if (map.island[k] < 0 || !seed(k)) continue;
    const kk = key(map.X[k], map.H[k], map.Z[k]);
    const list = grid.get(kk) ?? [];
    list.push(k);
    grid.set(kk, list);
  }
  const out = new Uint8Array(map.island.length);
  for (let k = 0; k < map.island.length; k++) {
    if (map.island[k] < 0 || seed(k)) continue;
    const cx = Math.floor(map.X[k] / cell);
    const ch = Math.floor(map.H[k] / cell);
    const cz = Math.floor(map.Z[k] / cell);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++)
      for (let dh = -1; dh <= 1; dh++)
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${cx + dx},${ch + dh},${cz + dz}`);
          if (!list) continue;
          for (const j of list) {
            const d = Math.hypot(map.X[k] - map.X[j], map.H[k] - map.H[j], map.Z[k] - map.Z[j]);
            if (d < best) best = d;
          }
        }
    if (best < dist) out[k] = Math.max(1, Math.round((best / dist) * 255));
  }
  return out;
}

// ------------------------------------------------------------------ عاصم (Avatar SDK)

export async function lookAsem(doc) {
  const frame = bodyFrame(doc);
  // hair + beard: ginger → near-black brown; skin a touch warmer/tanned
  const TAN = [0.95, 0.86, 0.76];
  const head = mat(doc, 'AvatarHead');
  if (head) {
    const img = await decode(head.getBaseColorTexture());
    paint(img, ([r, g, b]) => {
      const [h, s, v] = hsv(r, g, b);
      const hairness = smooth(0.34, 0.5, s) * smooth(0.92, 0.72, v) * smooth(48, 30, h) * smooth(-2, 8, h);
      const skin = [r * TAN[0], g * TAN[1], b * TAN[2]];
      const L = lum(r, g, b);
      const dark = ramp(
        [
          [0, hex('#0d0806')],
          [0.5, hex('#2a1a12')],
          [1, hex('#4d3426')],
        ],
        clamp01(L * 1.4),
      );
      return mix(skin, dark, clamp01(hairness * 1.25));
    });
    await replaceImage(head.getBaseColorTexture(), img);
  }
  const body = mat(doc, 'AvatarBody');
  if (body) {
    const img = await decode(body.getBaseColorTexture());
    paint(img, ([r, g, b]) => [r * TAN[0], g * TAN[1], b * TAN[2]]);
    await replaceImage(body.getBaseColorTexture(), img);
  }

  // top: black jacket, gold embroidery along the front opening and hem, white shirt in the V
  const top = mat(doc, 'outfit_top');
  {
    const tex = top.getBaseColorTexture();
    const img = await decode(tex);
    const map = positionMap(doc, frame, top, img.w, img.h);
    // ignore the printed logo/label when measuring the fabric's shading
    const teal = (r, g, b) => {
      const [h, s] = hsv(r, g, b);
      return h > 160 && h < 205 && s > 0.35;
    };
    const [lo, hi] = lumRange(img, (k) => teal(img.data[k * 4], img.data[k * 4 + 1], img.data[k * 4 + 2]));
    const mid = (lo + hi) / 2;
    const black = [
      [0, hex('#0a0909')],
      [0.55, hex('#1f1c1b')],
      [1, hex('#3b3634')],
    ];
    const shirt = [
      [0, hex('#c9c6c2')],
      [0.6, hex('#f2f0ec')],
      [1, hex('#ffffff')],
    ];
    paint(img, ([r, g, b], k) => {
      const L = teal(r, g, b) ? clamp01((lum(r, g, b) - lo) / (hi - lo || 1)) : clamp01((mid - lo) / (hi - lo || 1));
      const x = map.X[k];
      const h = map.H[k];
      const front = map.Z[k] > -0.005;
      // open-jacket V: narrow at the waist, widening to the collar
      const half = 0.012 + Math.max(0, h - 0.6) * 0.16;
      // flat shirt fabric (the printed logo sits right here)
      if (front && Math.abs(x) < half && h > 0.55) return ramp(shirt, 0.72 + Math.sin(h * 140) * 0.04);
      const edge = front && h > 0.53 && Math.abs(x) >= half && Math.abs(x) < half + 0.022;
      const hem = h < 0.555 && Math.abs(x) < 0.25;
      const cuff = Math.abs(x) > 0.3;
      if (edge || hem || (cuff && Math.abs(x) > 0.33)) {
        const s = edge ? h * 45 : hem ? x * 45 : (h + Math.abs(x)) * 45;
        const t = edge ? (Math.abs(x) - half) / 0.022 : 0.5 + Math.sin(h * 900) * 0.3;
        return mix(embroidery(s, t, GOLD, GOLD_LIGHT, GOLD_DARK), ramp(black, L), 0.12);
      }
      return ramp(black, L);
    });
    await replaceImage(tex, img);
  }

  // trousers: jeans → cream
  const bottom = mat(doc, 'outfit_bottom');
  {
    const tex = bottom.getBaseColorTexture();
    const img = await decode(tex);
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b]) =>
      ramp(
        [
          [0, hex('#9f9384')],
          [0.5, hex('#ddd3c4')],
          [1, hex('#f7f1e6')],
        ],
        clamp01((lum(r, g, b) - lo) / (hi - lo || 1)),
      ),
    );
    await replaceImage(tex, img);
  }

  // shoes: dark leather
  const shoes = mat(doc, 'outfit_shoes');
  if (shoes) {
    const tex = shoes.getBaseColorTexture();
    const img = await decode(tex);
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b]) =>
      ramp(
        [
          [0, hex('#120b08')],
          [0.6, hex('#3b2618')],
          [1, hex('#6b4a33')],
        ],
        clamp01((lum(r, g, b) - lo) / (hi - lo || 1)),
      ),
    );
    await replaceImage(tex, img);
  }
}

// ------------------------------------------------------------------ الكابتن (Ready Player Me)

export async function lookCaptain(doc) {
  const frame = bodyFrame(doc);
  // no glasses on the pitch
  for (const n of doc.getRoot().listNodes()) if (n.getName() === 'Wolf3D_Glasses') n.dispose();

  const RED = [
    [0, hex('#5e0a10')],
    [0.5, hex('#b3151f')],
    [1, hex('#ee3b44')],
  ];
  const GREEN = [
    [0, hex('#032d17')],
    [0.5, hex('#0a6b37')],
    [1, hex('#1fa35a')],
  ];
  const WHITE = [
    [0, hex('#b9bec4')],
    [0.6, hex('#eef1f4')],
    [1, hex('#ffffff')],
  ];
  const yellowish = (r, g, b) => {
    const [h, s] = hsv(r, g, b);
    return h > 30 && h < 65 && s > 0.45;
  };

  const top = mat(doc, 'Wolf3D_Outfit_Top');
  {
    const tex = top.getBaseColorTexture();
    const img = await decode(tex);
    const map = positionMap(doc, frame, top, img.w, img.h);
    const [lo, hi] = lumRange(img);
    const neck = frame && 0.83;
    paint(img, ([r, g, b], k) => {
      const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
      const x = map.X[k];
      const h = map.H[k];
      const z = map.Z[k];
      if (map.island[k] < 0) return null;
      if (yellowish(r, g, b)) return ramp(GREEN, 0.4 + L * 0.6);
      // number 10 on the back
      if (z < -0.02 && Math.abs(x) < 0.07 && h > 0.665 && h < 0.775) {
        // seen from behind the wearer's left (+x) is on the viewer's left
        if (onNumber('10', (0.07 - x) / 0.14, (0.775 - h) / 0.11)) return ramp(WHITE, 0.6 + L * 0.4);
      }
      // green star of Morocco on the chest (wearer's left)
      if (z > 0.02 && h > 0.72 && h < 0.79) {
        const sx = (x - 0.06) / 0.026;
        const sy = -(h - 0.757) / 0.026;
        if (inStar(sx, sy)) return ramp(GREEN, 0.5);
      }
      // collar + cuffs in green
      if (h > neck - 0.012 || Math.abs(x) > 0.215) return ramp(GREEN, L);
      return ramp(RED, L);
    });
    await replaceImage(tex, img);
  }

  const bottom = mat(doc, 'Wolf3D_Outfit_Bottom');
  {
    const tex = bottom.getBaseColorTexture();
    const img = await decode(tex);
    const map = positionMap(doc, frame, bottom, img.w, img.h);
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b], k) => {
      if (map.island[k] < 0) return null;
      const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
      const h = map.H[k];
      if (h < 0.335) return h > 0.31 && h < 0.322 ? ramp(RED, 0.6) : ramp(WHITE, 0.55 + L * 0.45); // socks
      if (yellowish(r, g, b)) return ramp(WHITE, 0.8);
      return ramp(GREEN, L);
    });
    await replaceImage(tex, img);
  }

  const shoes = mat(doc, 'Wolf3D_Outfit_Footwear');
  if (shoes) {
    const tex = shoes.getBaseColorTexture();
    const img = await decode(tex);
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b]) => {
      const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
      const [, s] = hsv(r, g, b);
      return s > 0.3 ? ramp(RED, L) : ramp([[0, hex('#0b0b0d')], [1, hex('#3d3d44')]], L);
    });
    await replaceImage(tex, img);
  }
}
