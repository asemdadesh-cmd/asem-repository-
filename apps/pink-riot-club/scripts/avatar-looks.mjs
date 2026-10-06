// Outfit + hair recipes for the three skinned avatars (see paint-looks.mjs).
//   يسو        burgundy hair, pink blazer, white shirt, cream trousers
//   يسو بالقفطان  (extra texture) ivory kaftan with gold embroidery
//   عاصم       dark hair + beard, midnight-navy dinner suit (satin shawl lapels),
//              white shirt, burgundy tie, pink pocket square, black oxfords
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
// A midnight-navy dinner suit painted over the source avatar's V-neck tee and
// jeans: black satin shawl lapels, one satin button, jetted pockets and a
// blush-pink pocket square; a crisp white shirt with a collar and a slim
// burgundy silk tie (on the tee's V and the neck skin); matching trousers with
// a pressed crease; polished black shoes. Body units: h = height / body height,
// x > 0 is his left, z > 0 is the front.

const SUIT = [
  [0, hex('#04060c')],
  [0.5, hex('#111a2d')],
  [1, hex('#2b3a5a')],
];
const SATIN = [
  [0, hex('#020203')],
  [0.5, hex('#0c0d13')],
  [1, hex('#474b5a')],
];
const SHIRT = [
  [0, hex('#9aa1ae')],
  [0.6, hex('#eef0f4')],
  [1, hex('#ffffff')],
];
const TIE = [
  [0, hex('#16030a')],
  [0.5, hex('#4a0c1f')],
  [1, hex('#96324d')],
];
const SQUARE = [
  [0, hex('#a8476d')],
  [0.5, hex('#ec8fb3')],
  [1, hex('#ffd6e6')],
];
const SHOE = [
  [0, hex('#020202')],
  [0.5, hex('#0e0c0b')],
  [1, hex('#3a3430')],
];

const BUTTON_H = 0.597; // the single button, at the waist
const KNOT_TOP = 0.834;
const KNOT_BOT = 0.808;
/** Half-width of the jacket's opening (where the shirt shows). */
const vHalf = (h) => 0.004 + (h - BUTTON_H) * 0.21;
/** Outer edge of the shawl lapel. */
function lapelOut(h) {
  if (h <= 0.765) return vHalf(h) + 0.006 + 0.029 * Math.sin((Math.PI / 2) * clamp01((h - BUTTON_H) / 0.168));
  return 0.0741 - ((h - 0.765) / 0.065) * 0.017;
}
function tieHalf(h) {
  if (h >= KNOT_BOT) return 0.0085 + ((h - KNOT_BOT) / (KNOT_TOP - KNOT_BOT)) * 0.003;
  return 0.0072 + (KNOT_BOT - h) * 0.027;
}
const AA = 0.0009; // edge softening (body units ≈ 1–2 texels)
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
const side = (px, py, ax, ay, bx, by) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
// collar point: knot side → tip → back under the lapel
const C0 = [0.0095, 0.8315];
const C1 = [0.036, 0.8];
const C2 = [0.056, 0.823];

/** The shirt front + tie at (x, h). */
function shirtFront(x, h) {
  const ax = Math.abs(x);
  const th = tieHalf(h);
  // shirt: soft shadow beside the tie, collar point with a crisp outline and a shadow beneath
  let v = 0.8 + 0.03 * Math.sin(h * 300);
  const d = ax - th;
  if (h < KNOT_TOP + 0.002 && d < 0.003) v -= 0.22 * (1 - clamp01(d / 0.003));
  const inPoint = side(ax, h, ...C0, ...C1) < 0 && side(ax, h, ...C1, ...C2) < 0 && h > C1[1];
  const dEdge = Math.min(segDist(ax, h, ...C0, ...C1), segDist(ax, h, ...C1, ...C2));
  if (inPoint) v = 0.9;
  else if (dEdge < 0.004 && h < C2[1]) v -= 0.16 * (1 - dEdge / 0.004);
  v = v + (0.42 - v) * smooth(0.0017, 0.0007, dEdge);
  const shirt = ramp(SHIRT, clamp01(v));
  const cover = h < KNOT_TOP ? smooth(th + AA, th - AA, ax) : 0;
  if (cover <= 0) return shirt;
  // tie: a rounded four-in-hand knot over a slim blade with a dimple
  const t = clamp01(ax / th);
  let tv = 0.58 - 0.3 * t * t;
  if (h >= KNOT_BOT) {
    tv += 0.12 - 0.34 * smooth(KNOT_BOT + 0.006, KNOT_BOT, h) - 0.12 * smooth(KNOT_TOP - 0.004, KNOT_TOP, h);
    tv -= 0.12 * Math.abs(Math.sin((x / th) * 1.4 + (h - KNOT_BOT) * 90)) * (1 - t); // wrapped folds
  } else {
    tv -= 0.26 * (1 - t) * smooth(KNOT_BOT - 0.016, KNOT_BOT, h); // dimple
    tv += 0.025 * Math.sin((x * 0.7 + h) * 1400); // fine silk twill
  }
  tv *= 1 - 0.3 * smooth(0.8, 1, t);
  return mix(shirt, ramp(TIE, clamp01(tv)), cover);
}

/** Soft spots (freckles) vs coherent regions (hair, beard, brows): box-blurred mask. */
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / n;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / n;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Centre of a mesh's bounding box in body units. */
function meshCenter(doc, frame, name) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh?.getName() !== name) continue;
    const pos = mesh.listPrimitives()[0].getAttribute('POSITION');
    const [a, b] = [pos.getMin([]), pos.getMax([])];
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const m = node.getWorldMatrix();
    const w = [0, 1, 2].map((i) => m[i] * c[0] + m[4 + i] * c[1] + m[8 + i] * c[2] + m[12 + i]);
    return { x: (w[0] - frame.cx) / frame.H, h: (w[1] - frame.minY) / frame.H };
  }
  return null;
}

/** Pulls a normal map toward flat by `f` (0..1) per texel. */
async function flattenNormals(tex, f) {
  if (!tex) return;
  const img = await decode(tex);
  paint(img, ([r, g, b], k) => {
    const t = f(k, img.w, img.h);
    return t > 0 ? mix([r, g, b], [128, 128, 255], t) : null;
  });
  await replaceImage(tex, img);
}

export async function lookAsem(doc) {
  const frame = bodyFrame(doc);
  // hair + beard: ginger → near-black brown; skin a touch warmer/tanned;
  // freckles are evened out instead of darkened; shirt collar + tie knot on the neck
  const TAN = [0.95, 0.86, 0.76];
  const head = mat(doc, 'AvatarHead');
  if (head) {
    const img = await decode(head.getBaseColorTexture());
    const { w, h: hh, data } = img;
    const map = positionMap(doc, frame, head, w, hh);
    const hairness = new Float32Array(w * hh);
    const R = new Float32Array(w * hh);
    const G = new Float32Array(w * hh);
    const B = new Float32Array(w * hh);
    for (let k = 0; k < w * hh; k++) {
      const [hu, s, v] = hsv(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]);
      hairness[k] = smooth(0.34, 0.5, s) * smooth(0.92, 0.72, v) * smooth(48, 30, hu) * smooth(-2, 8, hu);
      R[k] = data[k * 4];
      G[k] = data[k * 4 + 1];
      B[k] = data[k * 4 + 2];
    }
    const dense = boxBlur(hairness, w, hh, 6);
    const [bR, bG, bB] = [boxBlur(R, w, hh, 7), boxBlur(G, w, hh, 7), boxBlur(B, w, hh, 7)];
    const shirtMask = new Float32Array(w * hh);
    // the lids and lash lines stay as they are (they'd read as smudged liner)
    const eyes = ['AvatarLeftEyeball', 'AvatarRightEyeball'].map((n) => meshCenter(doc, frame, n)).filter(Boolean);
    const nearEye = (x, h) =>
      Math.max(0, ...eyes.map((e) => (h - e.h > 0.009 ? 0 : 1 - smooth(0.75, 1, Math.hypot((x - e.x) / 0.022, (h - e.h) / 0.0125)))));
    paint(img, ([r, g, b], k) => {
      const x = map.X[k];
      const h = map.H[k];
      const z = map.Z[k];
      if (map.island[k] >= 0 && h < 0.86) {
        const theta = Math.atan2(x, z + 0.036);
        const collarTop = KNOT_TOP + 0.014 * (1 - Math.cos(theta)) * 0.5;
        if (h < collarTop) {
          shirtMask[k] = 1;
          if (collarTop - h < 0.0011) return ramp(SHIRT, 0.5);
          return Math.abs(theta) < 1.1 ? shirtFront(x, h) : ramp(SHIRT, 0.82 - 0.1 * smooth(collarTop - 0.004, collarTop - 0.012, h));
        }
        if (h < collarTop + 0.004) {
          const s = 1 - 0.28 * (1 - (h - collarTop) / 0.004); // contact shadow on the neck
          return [r * TAN[0] * s, g * TAN[1] * s, b * TAN[2] * s];
        }
      }
      const keep = map.island[k] >= 0 ? nearEye(map.X[k], map.H[k]) : 0;
      const hair = clamp01(hairness[k] * 1.25) * smooth(0.16, 0.42, dense[k]) * (1 - keep);
      const speck = (clamp01(hairness[k] * 1.25) - hair) * (1 - keep);
      let skin = [r * TAN[0], g * TAN[1], b * TAN[2]];
      if (speck > 0) skin = mix(skin, [bR[k] * TAN[0], bG[k] * TAN[1], bB[k] * TAN[2]], clamp01(speck * 0.85));
      const dark = ramp(
        [
          [0, hex('#0d0806')],
          [0.5, hex('#2a1a12')],
          [1, hex('#4d3426')],
        ],
        clamp01(lum(r, g, b) * 1.4),
      );
      return mix(skin, dark, hair);
    });
    await replaceImage(head.getBaseColorTexture(), img);
    await flattenNormals(head.getNormalTexture(), (k, nw) => (nw === w ? shirtMask[k] * 0.9 : 0));
  }
  const body = mat(doc, 'AvatarBody');
  if (body) {
    const img = await decode(body.getBaseColorTexture());
    paint(img, ([r, g, b]) => [r * TAN[0], g * TAN[1], b * TAN[2]]);
    await replaceImage(body.getBaseColorTexture(), img);
  }

  // jacket (painted over the tee)
  const top = mat(doc, 'outfit_top');
  {
    const tex = top.getBaseColorTexture();
    const img = await decode(tex);
    const { w, h: hh } = img;
    const map = positionMap(doc, frame, top, w, hh);
    const topMap = map;
    const teal = (k) => {
      const [hu, s] = hsv(img.data[k * 4], img.data[k * 4 + 1], img.data[k * 4 + 2]);
      return hu > 160 && hu < 205 && s > 0.35;
    };
    // the printed logo + size label: flat fabric there (colour and normals)
    const printed = new Float32Array(w * hh);
    for (let k = 0; k < w * hh; k++) printed[k] = teal(k) ? 0 : 1;
    const nearPrint = boxBlur(printed, w, hh, 6);
    const [lo, hi] = lumRange(img, teal);
    // the neckline ring: the tee's top edge around the neck, per side and |x| bin
    const ringTop = new Map();
    const binOf = (k) => `${map.Z[k] > -0.03 ? 'f' : 'b'}${Math.round(Math.abs(map.X[k]) * 400)}`;
    for (let k = 0; k < w * hh; k++) {
      if (map.island[k] < 0 || Math.abs(map.X[k]) > 0.05 || map.H[k] < 0.7) continue;
      const b = binOf(k);
      ringTop.set(b, Math.max(ringTop.get(b) ?? -1, map.H[k]));
    }
    const ring = (k) =>
      map.island[k] >= 0 && Math.abs(map.X[k]) <= 0.05 && map.H[k] > 0.7 && map.H[k] > (ringTop.get(binOf(k)) ?? 9) - 0.0025;
    const COLLAR_D = 0.014;
    const collar = nearMask(map, ring, COLLAR_D);
    const kind = new Uint8Array(w * hh); // 0 jacket, 1 satin, 2 shirt/tie/square
    paint(img, ([r, g, b], k) => {
      if (map.island[k] < 0) return ramp(SUIT, 0.5);
      const x = map.X[k];
      const ax = Math.abs(x);
      const h = map.H[k];
      const z = map.Z[k];
      const front = z > -0.035;
      // the size tag at the hip and the tee's ribbed hem/cuffs: plain, pressed cloth
      const tag = h < 0.7 && lum(r, g, b) > 0.6 && hsv(r, g, b)[1] < 0.2;
      const rib = h < 0.524 || (ax > 0.372 && ax <= 0.3875);
      const fab = tag || nearPrint[k] > 0.01 ? 0.5 : 0.5 + (clamp01((lum(r, g, b) - lo) / (hi - lo || 1)) - 0.5) * (rib ? 0.35 : 1);
      if (tag) return ramp(SUIT, 0.45);
      // white shirt cuffs at the sleeve ends
      if (ax > 0.3875) {
        kind[k] = 2;
        return ramp(SHIRT, 0.72 + fab * 0.2 - 0.3 * smooth(0.3895, 0.3878, ax));
      }
      const vh = vHalf(h);
      const out = lapelOut(h);
      const lapelZone = front && h > BUTTON_H - 0.004 && h < 0.84;

      // jacket body: pressed midnight-navy wool
      let v = 0.5 + (fab - 0.5) * 0.6;
      if (lapelZone) {
        const d = ax - out; // the lapel's shadow
        if (d > 0 && d < 0.005) v *= 0.55 + 0.45 * (d / 0.005);
      }
      if (front && h < BUTTON_H - 0.006) {
        // the fronts part below the button
        const d = ax - (BUTTON_H - 0.006 - h) * 0.38;
        v *= d < 0 ? 0.55 : 1 - 0.15 * smooth(0.003, 0.0012, d);
        if (d > 0) v += 0.18 * smooth(0.0016, 0.0004, d);
      }
      if (z < -0.05 && h > 0.52) v *= 1 - 0.4 * smooth(0.0014, 0.0004, ax); // centre-back seam
      let rgb = ramp(SUIT, clamp01(v));
      // jetted hip pockets with satin piping
      if (front && ax > 0.048 && ax < 0.108 && Math.abs(h - 0.553) < 0.0024) {
        kind[k] = 1;
        rgb = ramp(SATIN, h > 0.553 ? 0.55 : 0.12);
      }
      // breast welt + a blush-pink pocket square, on his left
      if (front && x > 0.074 && x < 0.107) {
        const wy = 0.729 + (x - 0.074) * 0.15;
        if (h >= wy && h < wy + 0.0045) {
          let wv = 0.5 + (fab - 0.5) * 0.5;
          wv = h > wy + 0.0036 ? wv + 0.16 : h < wy + 0.0008 ? wv * 0.5 : wv;
          rgb = ramp(SUIT, clamp01(wv));
        } else if (h >= wy + 0.0045 && x > 0.077 && x < 0.103) {
          // three rounded silk crowns
          const bump = Math.sin(Math.PI * (((x - 0.077) / 0.026) * 3 % 1)) ** 0.7;
          const peak = 0.003 + 0.009 * bump;
          const above = h - wy - 0.0045;
          if (above < peak) {
            kind[k] = 2;
            const fold = 0.42 + 0.4 * bump - 0.22 * (above / peak) ** 3 + 0.12 * (above / 0.012);
            rgb = mix(rgb, ramp(SQUARE, clamp01(fold)), smooth(peak, peak - 0.0008, above));
          }
        }
      }

      // shawl lapels + collar in black satin, rolled, with a soft edge
      let lap = 0;
      if (lapelZone && ax > vh - AA) lap = smooth(out + AA, out - AA, ax);
      if (ring(k)) lap = 1;
      else if (collar[k]) lap = Math.max(lap, smooth(COLLAR_D, COLLAR_D - 0.0015, (collar[k] / 255) * COLLAR_D));
      if (lap > 0) {
        const onLapel = lapelZone && ax < out + AA;
        const t = onLapel ? clamp01((ax - vh) / Math.max(1e-4, out - vh)) : 1 - collar[k] / 255;
        const sv = 0.3 + (fab - 0.5) * 0.25 + 0.34 * Math.exp(-(((t - 0.6) / 0.24) ** 2)) + (onLapel ? 0.1 * smooth(0.82, 0.97, t) : 0);
        rgb = mix(rgb, ramp(SATIN, clamp01(sv)), lap);
        if (lap > 0.5) kind[k] = 1;
      }
      // the opening: shirt + tie, shadowed by the lapels
      if (front && z > -0.02 && h > BUTTON_H) {
        const sh = smooth(vh + AA, vh - AA, ax);
        if (sh > 0) {
          let srgb = shirtFront(x, h);
          const d = vh - ax;
          if (d < 0.004) srgb = mix(srgb, [20, 24, 34], 0.35 * (1 - clamp01(d / 0.004)));
          rgb = mix(rgb, srgb, sh);
          if (sh > 0.5) kind[k] = 2;
        }
      }
      // one satin-covered button
      const bd = Math.hypot(x, h - BUTTON_H);
      if (front && bd < 0.0072) {
        const btn = ramp(SATIN, bd > 0.0052 ? 0.62 : 0.3 + 0.35 * clamp01(1 - Math.hypot(x + 0.002, h - BUTTON_H - 0.002) / 0.005));
        rgb = mix(rgb, btn, smooth(0.0072, 0.0064, bd));
        kind[k] = 1;
      } else if (front && bd < 0.0095 && h < BUTTON_H) rgb = mix(rgb, [0, 0, 0], 0.3);
      return rgb;
    });
    await replaceImage(tex, img);
    // pressed and smooth: soften the tee's wrinkles, flatten the shirt/satin and the old print
    await flattenNormals(top.getNormalTexture(), (k, nw) => {
      if (nw !== w) return 0.4;
      if (nearPrint[k] > 0.01) return 1;
      if (kind[k]) return kind[k] === 2 ? 0.92 : 0.75;
      const ax = Math.abs(topMap.X[k]);
      return topMap.H[k] < 0.524 || ax > 0.372 ? 0.85 : 0.45;
    });
  }

  // trousers: jeans → midnight-navy suit trousers with a pressed crease
  const bottom = mat(doc, 'outfit_bottom');
  {
    const tex = bottom.getBaseColorTexture();
    const img = await decode(tex);
    const map = positionMap(doc, frame, bottom, img.w, img.h);
    // front-most line of each leg per height (smoothed over ±2 cm) = the crease
    const front = { l: [], r: [] };
    for (let k = 0; k < map.island.length; k++) {
      if (map.island[k] < 0 || Math.abs(map.X[k]) < 0.02 || map.H[k] > 0.46) continue;
      const leg = front[map.X[k] > 0 ? 'l' : 'r'];
      const bin = Math.round(map.H[k] * 200);
      if (!leg[bin] || map.Z[k] > leg[bin][0]) leg[bin] = [map.Z[k], map.X[k]];
    }
    const crease = (leg, bin) => {
      let sz = 0;
      let sx = 0;
      let n = 0;
      for (let j = bin - 2; j <= bin + 2; j++) {
        const c = front[leg][j];
        if (!c) continue;
        sz += c[0];
        sx += c[1];
        n++;
      }
      return n ? [sz / n, sx / n] : null;
    };
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b], k) => {
      const L = clamp01((lum(r, g, b) - lo) / (hi - lo || 1));
      let v = 0.42 + (L - 0.5) * 0.5;
      const c = map.island[k] >= 0 && map.H[k] < 0.46 ? crease(map.X[k] > 0 ? 'l' : 'r', Math.round(map.H[k] * 200)) : null;
      if (c && map.Z[k] > c[0] - 0.01) v += 0.12 * smooth(0.003, 0.0008, Math.abs(map.X[k] - c[1])) * smooth(0.06, 0.12, map.H[k]);
      return ramp(SUIT, clamp01(v));
    });
    await replaceImage(tex, img);
    await flattenNormals(bottom.getNormalTexture(), () => 0.6);
  }

  // shoes: polished black leather oxfords
  const shoes = mat(doc, 'outfit_shoes');
  if (shoes) {
    const tex = shoes.getBaseColorTexture();
    const img = await decode(tex);
    const [lo, hi] = lumRange(img);
    paint(img, ([r, g, b]) => ramp(SHOE, clamp01(0.4 + (clamp01((lum(r, g, b) - lo) / (hi - lo || 1)) - 0.5) * 0.3)));
    await replaceImage(tex, img);
    shoes.setRoughnessFactor(0.34);
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
