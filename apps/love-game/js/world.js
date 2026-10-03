// The walkable 3D island. Each mini-game is a place she walks to; the
// Secret Room is a cottage at the end of Memory Lane that opens with 5 hearts.
import * as THREE from '../vendor/three.module.min.js';
import { placeholder, pick } from './util.js';

const C = {
  grass: '#a7d49b',
  grassDark: '#8cc282',
  sand: '#f3dfb8',
  water: '#86c5e8',
  wood: '#a0673f',
  woodDark: '#6e4329',
  cream: '#fff4e6',
  pink: '#ff8fab',
  rose: '#e5466f',
  blossom: '#ffc2d4',
  leaf: '#7cbf7a',
  stone: '#e8ded2',
};

// Station layout (x, z). Each station's front faces the island centre.
const LAYOUT = {
  paint: [-14, -3],
  kitchen: [14, -3],
  gym: [-13, 11],
  quiz: [13, 11],
  memory: [0, -10],
};
const COTTAGE = [0, -27];
const SPAWN = [0, 8];
const NPC = [2.4, 5];
const ISLAND_R = 31;

export async function createWorld(root, { config, games, isDone, onEnter, onFinale, onLocked, onList }) {
  root.innerHTML = `
    <canvas class="world-canvas" aria-label="Our 3D world. Walk to a place to play a game."></canvas>
    <div class="w-top">
      <p class="w-hearts" role="img"></p>
      <button class="w-list" aria-label="Show the games as a list">☰</button>
    </div>
    <p class="w-hint"></p>
    <div class="joystick" aria-hidden="true"><span class="knob"></span></div>
    <button class="btn primary w-action" hidden></button>
    <div class="w-bubble" hidden></div>
    <div class="w-loading">Building our little world… 💗</div>`;

  const canvas = root.querySelector('canvas');
  const heartsEl = root.querySelector('.w-hearts');
  const hint = root.querySelector('.w-hint');
  const actionBtn = root.querySelector('.w-action');
  const bubble = root.querySelector('.w-bubble');
  const joy = root.querySelector('.joystick');
  const knob = root.querySelector('.knob');
  const coarse = matchMedia('(pointer: coarse)').matches;
  root.querySelector('.w-list').addEventListener('click', onList);

  hint.textContent = coarse
    ? 'Left thumb to walk · drag to look around'
    : 'WASD / arrows to walk · drag to look · E to enter';
  joy.hidden = !coarse;

  // Fonts make the in-world signs prettier; don't wait forever for them.
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);

  // ── Renderer / scene ─────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog('#ffd9d6', 45, 110);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight('#fff3f7', '#93c49a', 1.6));
  const sun = new THREE.DirectionalLight('#ffe6cf', 2.4);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // ── Small builders ───────────────────────────────────────────────────────
  const matCache = new Map();
  function mat(color, extra) {
    const key = color + JSON.stringify(extra || {});
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
    return matCache.get(key);
  }
  function mesh(geo, color, x = 0, y = 0, z = 0, parent = scene, extra) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color, extra) : color);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (w, h, d, c, x, y, z, p, e) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y, z, p, e);
  const cyl = (rt, rb, h, c, x, y, z, p, seg = 20, e) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, p, e);
  const ball = (r, c, x, y, z, p, e) => mesh(new THREE.SphereGeometry(r, 20, 14), c, x, y, z, p, e);

  function label(text, { size = 64, color = '#3d2430', bg = 'rgba(255,250,245,.94)', height = 0.8 } = {}) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = `800 ${size}px Nunito, system-ui, sans-serif`;
    ctx.font = font;
    const pad = bg ? size * 0.6 : size * 0.1;
    const w = Math.ceil(ctx.measureText(text).width + pad * 2);
    const h = Math.round(size * 1.5);
    c.width = w;
    c.height = h;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, h / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(229,70,111,.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + size * 0.05);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    s.scale.set((w / h) * height, height, 1);
    return s;
  }

  const loader = new THREE.TextureLoader();
  function photoTexture(src, aspect) {
    const tex = new THREE.Texture();
    tex.colorSpace = THREE.SRGBColorSpace;
    const fit = (img) => {
      tex.image = img;
      const ia = img.width / img.height;
      tex.repeat.set(1, 1);
      tex.offset.set(0, 0);
      if (ia < aspect) {
        tex.repeat.y = ia / aspect;
        tex.offset.y = (1 - tex.repeat.y) / 2;
      } else {
        tex.repeat.x = aspect / ia;
        tex.offset.x = (1 - tex.repeat.x) / 2;
      }
      tex.needsUpdate = true;
    };
    loader.load(
      src,
      (t) => fit(t.image),
      undefined,
      () => loader.load(placeholder((src || '').split('/').pop()), (t) => fit(t.image)),
    );
    return tex;
  }

  /** A wooden picture frame holding a real photo (unlit so photos keep true colour). */
  function frame(src, w, h, parent) {
    const g = new THREE.Group();
    box(w + 0.22, h + 0.22, 0.12, C.wood, 0, 0, 0, g);
    const pic = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: photoTexture(src, w / h), toneMapped: false }),
    );
    pic.position.z = 0.065;
    g.add(pic);
    parent.add(g);
    return g;
  }

  // ── Island, water, path ──────────────────────────────────────────────────
  const island = cyl(ISLAND_R + 1, ISLAND_R - 1, 2, C.grass, 0, -1, 0, scene, 72);
  island.castShadow = false;
  cyl(ISLAND_R + 2.6, ISLAND_R + 1, 1.6, C.sand, 0, -1.25, 0, scene, 72).castShadow = false;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(220, 48),
    new THREE.MeshStandardMaterial({ color: C.water, roughness: 0.25, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.9;
  scene.add(water);

  // grass patches for texture
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (ISLAND_R - 4);
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + Math.random() * 3, 18), mat(C.grassDark));
    p.rotation.x = -Math.PI / 2;
    p.position.set(Math.cos(a) * r, 0.005, Math.sin(a) * r);
    p.receiveShadow = true;
    scene.add(p);
  }

  // stepping-stone path: spawn → fountain → Memory Lane → cottage
  for (let z = SPAWN[1] + 1; z > COTTAGE[1] + 3; z -= 1.3) {
    if (Math.abs(z) < 3.2) continue; // the fountain plaza
    const s = cyl(0.55, 0.6, 0.1, C.stone, (Math.random() - 0.5) * 0.3, 0.03, z, scene, 14);
    s.castShadow = false;
  }
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4, 40), mat(C.stone));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // ── Fountain with a floating heart ───────────────────────────────────────
  cyl(2, 2.2, 0.6, C.cream, 0, 0.3, 0);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), new THREE.MeshStandardMaterial({ color: '#9ad6f0', roughness: 0.1 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.61;
  scene.add(pool);
  cyl(0.25, 0.35, 1.4, C.cream, 0, 1, 0);
  const heart = mesh(heartGeometry(0.9), C.rose, 0, 2.9, 0, scene, { roughness: 0.35, emissive: '#5a0f22' });

  const colliders = [{ x: 0, z: 0, r: 2.3 }];

  // ── Trees and flowers ────────────────────────────────────────────────────
  const avoid = [...Object.values(LAYOUT), COTTAGE, SPAWN, NPC, [0, 0]];
  const clearOf = (x, z, d) => avoid.every(([ax, az]) => Math.hypot(x - ax, z - az) > d) && !(Math.abs(x) < 4.5 && z < SPAWN[1] + 2 && z > COTTAGE[1]);
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 8);
  const crownGeo = new THREE.IcosahedronGeometry(1.3, 0);
  let placed = 0;
  for (let tries = 0; placed < 46 && tries < 600; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * (ISLAND_R - 10);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!clearOf(x, z, 7)) continue;
    const s = 0.8 + Math.random() * 0.7;
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    mesh(trunkGeo, C.woodDark, 0, 0.8, 0, t);
    const crown = mesh(crownGeo, mat(Math.random() < 0.55 ? C.blossom : C.leaf, { flatShading: true }), 0, 2.2, 0, t);
    crown.rotation.set(Math.random(), Math.random(), 0);
    crown.scale.set(1, 0.9 + Math.random() * 0.3, 1);
    scene.add(t);
    colliders.push({ x, z, r: 0.45 * s });
    placed++;
  }
  const flowerGeo = new THREE.SphereGeometry(0.11, 8, 6);
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 420);
  const fColors = ['#ff8fab', '#ffd166', '#ffffff', '#c7a6f0', '#ff6b6b', '#8ecae6'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < flowers.count; i++) {
    let x;
    let z;
    do {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (ISLAND_R - 4);
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    } while (!clearOf(x, z, 4.2));
    m4.makeTranslation(x, 0.1, z);
    flowers.setMatrixAt(i, m4);
    flowers.setColorAt(i, pick(fColors));
  }
  scene.add(flowers);

  // ── Stations ─────────────────────────────────────────────────────────────
  const stations = [];
  let steam = []; // set by the kitchen builder
  let quizMark = null; // set by the quiz builder
  const builders = { paint: buildStudio, kitchen: buildKitchen, gym: buildGym, quiz: buildQuiz, memory: buildMemoryArch };
  for (const game of games) {
    const [x, z] = LAYOUT[game.id];
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);
    scene.add(g);

    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), mat('#fff0e6'));
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.015;
    rug.receiveShadow = true;
    g.add(rug);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.3, 40),
      new THREE.MeshBasicMaterial({ color: C.rose, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 1.8);
    g.add(ring);

    const local = builders[game.id](g) || [{ x: 0, z: -1.6, r: 2.2 }];
    const sign = label(`${game.emoji} ${game.title}`, { height: 0.75 });
    sign.position.set(0, game.id === 'memory' ? 5.6 : 3.9, game.id === 'memory' ? 0 : -1.2);
    g.add(sign);
    const doneHeart = label('💗', { bg: null, size: 96, height: 1 });
    doneHeart.position.set(0, 0, sign.position.z);
    doneHeart.userData.baseY = sign.position.y + 1;
    g.add(doneHeart);

    g.updateMatrixWorld();
    for (const c of local) {
      const p = new THREE.Vector3(c.x, 0, c.z).applyMatrix4(g.matrixWorld);
      colliders.push({ x: p.x, z: p.z, r: c.r });
    }
    const trigger = new THREE.Vector3(0, 0, 1.8).applyMatrix4(g.matrixWorld);
    stations.push({ game, trigger, ring, doneHeart });
  }

  function buildStudio(g) {
    // big easel with an abstract painting
    const easel = new THREE.Group();
    easel.position.set(-0.6, 0, -1.6);
    g.add(easel);
    for (const sx of [-0.55, 0.55]) box(0.09, 2.6, 0.09, C.wood, sx, 1.3, 0, easel).rotation.z = sx * -0.12;
    box(0.09, 2.4, 0.09, C.wood, 0, 1.2, -0.5, easel).rotation.x = -0.25;
    box(1.4, 0.07, 0.25, C.wood, 0, 1.05, 0.05, easel);
    const art = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.25, 0.05), [
      mat('#fff'), mat('#fff'), mat('#fff'), mat('#fff'),
      new THREE.MeshBasicMaterial({ map: abstractArt(), toneMapped: false }), mat('#fff'),
    ]);
    art.position.set(0, 1.75, 0.08);
    art.rotation.x = -0.08;
    art.castShadow = true;
    easel.add(art);
    // little table with paint pots + palette
    const table = new THREE.Group();
    table.position.set(1.5, 0, -1.2);
    g.add(table);
    cyl(0.55, 0.55, 0.06, C.cream, 0, 0.8, 0, table);
    cyl(0.06, 0.08, 0.8, C.wood, 0, 0.4, 0, table);
    ['#e4572e', '#f3a712', '#3a86ff', '#7b2cbf', '#2a9d8f'].forEach((c, i) => {
      const a = (i / 5) * Math.PI * 2;
      cyl(0.09, 0.09, 0.16, c, Math.cos(a) * 0.32, 0.91, Math.sin(a) * 0.32, table, 12);
    });
    // giant paintbrush leaning on the easel
    const brush = new THREE.Group();
    brush.position.set(-1.9, 0, -1.4);
    brush.rotation.z = 0.35;
    g.add(brush);
    cyl(0.07, 0.09, 2.2, '#f3a712', 0, 1.1, 0, brush);
    cyl(0.1, 0.09, 0.2, '#c0c0c0', 0, 2.3, 0, brush);
    mesh(new THREE.ConeGeometry(0.13, 0.5, 12), C.rose, 0, 2.65, 0, brush);
    return [{ x: -0.3, z: -1.5, r: 1.6 }, { x: 1.5, z: -1.2, r: 0.7 }];
  }

  function buildKitchen(g) {
    box(3.2, 0.9, 1, C.cream, 0, 0.45, -1.8, g);
    box(3.35, 0.08, 1.12, '#ffffff', 0, 0.94, -1.8, g, { roughness: 0.3 });
    box(0.9, 0.03, 0.7, '#2b2b2b', 0.7, 0.99, -1.8, g);
    const pot = cyl(0.3, 0.27, 0.4, '#d1495b', 0.7, 1.2, -1.8, g);
    cyl(0.31, 0.31, 0.04, '#b13a4b', 0, 0.22, 0, pot);
    // cutting board + tomatoes + garlic
    box(0.8, 0.05, 0.5, '#d9a066', -0.7, 1.0, -1.75, g);
    ball(0.11, '#e63946', -0.9, 1.11, -1.75, g);
    ball(0.11, '#e63946', -0.65, 1.11, -1.65, g);
    ball(0.09, '#fff7e0', -0.45, 1.1, -1.85, g);
    // fridge, with a heart magnet
    box(0.95, 2.1, 0.85, '#f9d5df', -2.3, 1.05, -1.8, g, { roughness: 0.4 });
    mesh(heartGeometry(0.12), C.rose, -2.2, 1.6, -1.35, g);
    // chef hat on the counter
    cyl(0.17, 0.15, 0.18, '#fff', 1.35, 1.07, -1.6, g);
    ball(0.2, '#fff', 1.35, 1.24, -1.6, g);
    // steam puffs (animated)
    steam = [0, 1, 2].map((i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.7 }));
      s.position.set(0.7, 1.5 + i * 0.3, -1.8);
      g.add(s);
      return s;
    });
    return [{ x: 0, z: -1.8, r: 1.7 }, { x: -2.3, z: -1.8, r: 0.7 }];
  }

  function buildGym(g) {
    const mat0 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), mat('#ffb3c6'));
    mat0.rotation.x = -Math.PI / 2;
    mat0.position.set(0, 0.03, -1.4);
    mat0.receiveShadow = true;
    g.add(mat0);
    // squat rack + barbell
    for (const sx of [-1, 1]) box(0.14, 2, 0.14, '#3d3d3d', sx, 1, -2.2, g);
    const bar = cyl(0.035, 0.035, 2.7, '#b8b8b8', 0, 1.55, -2.2, g, 10, { metalness: 0.6, roughness: 0.3 });
    bar.rotation.z = Math.PI / 2;
    for (const sx of [-1.18, 1.18]) {
      const p = cyl(0.42, 0.42, 0.12, '#222', sx, 1.55, -2.2, g);
      p.rotation.z = Math.PI / 2;
    }
    // bench
    box(0.45, 0.12, 1.3, C.rose, 0, 0.5, -0.9, g);
    box(0.1, 0.45, 0.1, '#3d3d3d', 0, 0.22, -0.4, g);
    box(0.1, 0.45, 0.1, '#3d3d3d', 0, 0.22, -1.4, g);
    // dumbbells
    for (const [x, z] of [[1.4, -0.6], [1.6, -0.9]]) {
      const d = new THREE.Group();
      d.position.set(x, 0.12, z);
      d.rotation.y = 0.4;
      g.add(d);
      cyl(0.03, 0.03, 0.4, '#b8b8b8', 0, 0, 0, d).rotation.z = Math.PI / 2;
      for (const s of [-0.17, 0.17]) cyl(0.11, 0.11, 0.08, '#e5466f', s, 0, 0, d).rotation.z = Math.PI / 2;
    }
    // her gym selfie on a stand
    const poster = frame(config.gym.photo, 1.1, 1.95, g);
    poster.position.set(-1.9, 1.7, -1.6);
    poster.rotation.y = 0.5;
    cyl(0.05, 0.05, 1.2, C.wood, -1.9, 0.5, -1.65, g);
    return [{ x: 0, z: -2.2, r: 1.3 }, { x: 0, z: -0.9, r: 0.6 }, { x: -1.9, z: -1.6, r: 0.6 }];
  }

  function buildQuiz(g) {
    box(1.6, 1.1, 0.9, C.cream, 0, 0.55, -1.4, g);
    box(1.7, 0.08, 1, C.rose, 0, 1.12, -1.4, g);
    const yes = cyl(0.2, 0.22, 0.12, '#52b788', -0.4, 1.2, -1.3, g);
    const no = cyl(0.2, 0.22, 0.12, '#e63946', 0.4, 1.2, -1.3, g);
    yes.castShadow = no.castShadow = false;
    const q = label('❓', { bg: null, size: 128, height: 1.8 });
    q.position.set(0, 2.6, -1.6);
    g.add(q);
    quizMark = q;
    // hearts on sticks
    for (const sx of [-1.6, 1.6]) {
      cyl(0.04, 0.04, 1.6, C.wood, sx, 0.8, -1.2, g);
      mesh(heartGeometry(0.3), C.pink, sx, 1.75, -1.2, g);
    }
    return [{ x: 0, z: -1.4, r: 1.1 }];
  }

  function buildMemoryArch(g) {
    // an arch she walks through, then the lane of photos (built below)
    for (const sx of [-1.8, 1.8]) cyl(0.22, 0.26, 3.2, C.cream, sx, 1.6, 0, g);
    const top = mesh(new THREE.TorusGeometry(1.8, 0.2, 10, 30, Math.PI), C.pink, 0, 3.2, 0, g);
    top.castShadow = true;
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      ball(0.17, i % 2 ? '#fff' : C.rose, Math.cos(a) * 1.8, 3.2 + Math.sin(a) * 1.8, 0.18, g);
    }
    return [{ x: -1.8, z: 0, r: 0.35 }, { x: 1.8, z: 0, r: 0.35 }];
  }

  // Memory Lane: framed photos lining the path to the cottage
  const lanePhotos = [...new Set([...config.memory.map((m) => m.photo), ...(config.finale.gallery || [])])].filter(
    (p) => p !== config.finale.photo,
  );
  lanePhotos.slice(0, 10).forEach((src, i) => {
    const side = i % 2 ? 1 : -1;
    const z = LAYOUT.memory[1] - 2.4 - Math.floor(i / 2) * 2.6;
    const f = frame(src, 1.2, 1.7, scene);
    f.position.set(side * 2.7, 1.75, z);
    f.rotation.y = -side * (Math.PI / 2 - 0.25);
    cyl(0.05, 0.06, 1, C.wood, side * 2.75, 0.5, z);
    colliders.push({ x: side * 2.7, z, r: 0.6 });
  });

  // ── The cottage (Secret Room) ────────────────────────────────────────────
  const cottage = new THREE.Group();
  cottage.position.set(COTTAGE[0], 0, COTTAGE[1]);
  scene.add(cottage);
  box(5, 3, 4, C.cream, 0, 1.5, 0, cottage);
  const roof = mesh(new THREE.ConeGeometry(4, 2.4, 4), mat('#e86a8a', { flatShading: true }), 0, 4.2, 0, cottage);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.82);
  box(0.6, 1.4, 0.6, '#c7a6a0', 1.4, 4.4, -0.6, cottage);
  const doorMat = new THREE.MeshStandardMaterial({ color: C.woodDark, emissive: '#ff4d7a', emissiveIntensity: 0 });
  const door = mesh(new THREE.BoxGeometry(1.1, 1.9, 0.1), doorMat, 0, 0.95, 2.03, cottage);
  ball(0.06, '#ffd166', 0.38, 0.95, 2.1, cottage);
  for (const sx of [-1.6, 1.6]) {
    const w = mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: '#ffe8a3' }), sx, 1.8, 2.01, cottage);
    w.castShadow = false;
    box(0.9, 0.08, 0.15, C.wood, sx, 1.36, 2.05, cottage);
  }
  const doorLight = new THREE.PointLight('#ff6f91', 0, 8);
  doorLight.position.set(0, 1.5, 3);
  cottage.add(doorLight);
  let cottageSign = null;
  colliders.push({ x: COTTAGE[0], z: COTTAGE[1], r: 3.1 });
  const cottageTrigger = new THREE.Vector3(COTTAGE[0], 0, COTTAGE[1] + 3.6);

  // ── People ───────────────────────────────────────────────────────────────
  const her = person({ top: '#b23a48', bottom: '#d9b99b', skin: '#f3d2c1', hair: '#2b1a17', longHair: true, blush: true });
  her.g.position.set(SPAWN[0], 0, SPAWN[1]);
  her.g.rotation.y = Math.PI;
  scene.add(her.g);
  const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.15 }));
  shadowBlob.rotation.x = -Math.PI / 2;
  scene.add(shadowBlob);

  const him = person({ top: '#f4f4f4', bottom: '#3b4a6b', skin: '#e2b48f', hair: '#1c1412', beard: true });
  him.g.position.set(NPC[0], 0, NPC[1]);
  scene.add(him.g);
  colliders.push({ x: NPC[0], z: NPC[1], r: 0.55 });
  const himTag = label(`${config.myName} 🙋‍♂️`, { height: 0.42 });
  himTag.position.set(0, 2.55, 0);
  him.g.add(himTag);

  function person({ top, bottom, skin, hair, longHair, beard, blush }) {
    const g = new THREE.Group();
    const limb = (x, y, color, len, r) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      g.add(pivot);
      mesh(new THREE.CapsuleGeometry(r, len, 4, 10), color, 0, -len / 2 - r / 2, 0, pivot);
      return pivot;
    };
    const legL = limb(-0.13, 0.82, bottom, 0.55, 0.1);
    const legR = limb(0.13, 0.82, bottom, 0.55, 0.1);
    mesh(new THREE.CapsuleGeometry(0.27, 0.45, 6, 14), top, 0, 1.15, 0, g);
    const armL = limb(-0.36, 1.42, top, 0.45, 0.075);
    const armR = limb(0.36, 1.42, top, 0.45, 0.075);
    armL.rotation.z = -0.12;
    armR.rotation.z = 0.12;
    const head = ball(0.29, skin, 0, 1.85, 0, g);
    for (const sx of [-0.1, 0.1]) ball(0.036, '#1d1d1d', sx, 1.88, 0.26, g).castShadow = false;
    if (blush) for (const sx of [-0.16, 0.16]) ball(0.05, '#ff9fb2', sx, 1.79, 0.23, g).castShadow = false;
    const smile = mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), '#8a3b4a', 0, 1.77, 0.27, g);
    smile.rotation.z = Math.PI;
    const cap = mesh(new THREE.SphereGeometry(0.31, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, 0, 1.86, -0.02, g);
    cap.rotation.x = -0.35;
    if (longHair) {
      const back = mesh(new THREE.CapsuleGeometry(0.25, 0.6, 6, 12), hair, 0, 1.5, -0.17, g);
      back.scale.z = 0.55;
    }
    if (beard) {
      const b = mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), hair, 0, 1.85, 0.0, g);
      b.scale.set(1, 1, 1.02);
    }
    void head;
    return { g, legL, legR, armL, armR };
  }

  // ── Floating hearts ──────────────────────────────────────────────────────
  const floaters = [];
  const heartSprite = label('💗', { bg: null, size: 96, height: 0.6 });
  for (let i = 0; i < 22; i++) {
    const s = heartSprite.clone();
    s.material = heartSprite.material.clone();
    resetFloater(s, true);
    scene.add(s);
    floaters.push(s);
  }
  function resetFloater(s, anywhere) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 24;
    s.position.set(Math.cos(a) * r, anywhere ? Math.random() * 9 : 0, Math.sin(a) * r);
    s.userData.v = 0.4 + Math.random() * 0.6;
    const k = 0.3 + Math.random() * 0.4;
    s.scale.set(k, k, 1);
  }

  // ── Input ────────────────────────────────────────────────────────────────
  const keys = new Set();
  const stick = { x: 0, y: 0, id: null };
  let yaw = 0;
  let pitch = 0.42;
  let look = null;

  function onKey(e) {
    if (!active) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault();
      if (e.type === 'keydown') keys.add(k);
      else keys.delete(k);
    }
    if (e.type === 'keydown' && (k === 'e' || k === 'enter') && !actionBtn.hidden && document.activeElement !== actionBtn) {
      actionBtn.click();
    }
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!look || e.pointerId !== look.id) return;
    yaw -= (e.clientX - look.x) * 0.006;
    pitch = Math.min(1.1, Math.max(0.15, pitch + (e.clientY - look.y) * 0.004));
    look.x = e.clientX;
    look.y = e.clientY;
  });
  const endLook = (e) => {
    if (look && e.pointerId === look.id) look = null;
  };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);

  function moveStick(e) {
    const r = joy.getBoundingClientRect();
    const max = r.width / 2 - 10;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.x = dx / max;
    stick.y = dy / max;
  }
  joy.addEventListener('pointerdown', (e) => {
    stick.id = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  joy.addEventListener('pointermove', (e) => e.pointerId === stick.id && moveStick(e));
  const endStick = (e) => {
    if (e.pointerId !== stick.id) return;
    stick.id = null;
    stick.x = stick.y = 0;
    knob.style.transform = '';
  };
  joy.addEventListener('pointerup', endStick);
  joy.addEventListener('pointercancel', endStick);

  // ── Action button ────────────────────────────────────────────────────────
  let target = null;
  actionBtn.addEventListener('click', () => {
    if (!target) return;
    keys.clear();
    if (target === 'cottage') {
      if (allDone()) onFinale();
      else onLocked(heartCount());
    } else onEnter(target);
  });

  const heartCount = () => games.filter((g) => isDone(g.id)).length;
  const allDone = () => heartCount() === games.length;

  // ── Him: little speech bubble when she's near ────────────────────────────
  const lines = config.npcLines || [];
  let lineIdx = -1;
  let lineTimer = 0;
  let wasNear = false;

  // ── Loop ─────────────────────────────────────────────────────────────────
  let active = false;
  let raf = 0;
  let last = 0;
  let walk = 0;
  const v3 = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  function update(dt, t) {
    // input → movement relative to camera
    let fwd = 0;
    let side = 0;
    if (keys.has('w') || keys.has('arrowup')) fwd += 1;
    if (keys.has('s') || keys.has('arrowdown')) fwd -= 1;
    if (keys.has('a') || keys.has('arrowleft')) side -= 1;
    if (keys.has('d') || keys.has('arrowright')) side += 1;
    fwd -= stick.y;
    side += stick.x;
    const mag = Math.min(1, Math.hypot(fwd, side));
    const p = her.g.position;
    if (mag > 0.08) {
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      let mx = fx * fwd + rx * side;
      let mz = fz * fwd + rz * side;
      const l = Math.hypot(mx, mz) || 1;
      mx /= l;
      mz /= l;
      const speed = 5.2 * mag;
      p.x += mx * speed * dt;
      p.z += mz * speed * dt;
      const want = Math.atan2(mx, mz);
      let diff = want - her.g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      her.g.rotation.y += diff * Math.min(1, dt * 12);
      walk += dt * 9 * mag;
    } else {
      walk += (Math.round(walk / Math.PI) * Math.PI - walk) * Math.min(1, dt * 10);
    }
    // collisions
    for (const c of colliders) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + 0.4;
      if (d < min && d > 0.0001) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    const dc = Math.hypot(p.x, p.z);
    if (dc > ISLAND_R - 1) {
      p.x *= (ISLAND_R - 1) / dc;
      p.z *= (ISLAND_R - 1) / dc;
    }
    // walk cycle
    const sw = Math.sin(walk);
    her.legL.rotation.x = sw * 0.7;
    her.legR.rotation.x = -sw * 0.7;
    her.armL.rotation.x = -sw * 0.6;
    her.armR.rotation.x = sw * 0.6;
    p.y = Math.abs(Math.sin(walk)) * 0.06;
    shadowBlob.position.set(p.x, 0.02, p.z);

    // him: face her, wave a little
    const hx = p.x - him.g.position.x;
    const hz = p.z - him.g.position.z;
    him.g.rotation.y = Math.atan2(hx, hz);
    him.armR.rotation.z = 0.12 + (Math.hypot(hx, hz) < 5 ? 2.6 + Math.sin(t * 8) * 0.3 : 0);
    const near = Math.hypot(hx, hz) < 4.2 && lines.length > 0;
    if (near) {
      lineTimer -= dt;
      if (!wasNear || lineTimer <= 0) {
        lineIdx = (lineIdx + 1) % lines.length;
        bubble.textContent = lines[lineIdx].replace('{hearts}', `${heartCount()}/${games.length}`);
        lineTimer = 3.6;
      }
    }
    wasNear = near;

    // nearest station
    target = null;
    for (const s of stations) {
      const d = Math.hypot(p.x - s.trigger.x, p.z - s.trigger.z);
      const on = d < 2.4;
      s.ring.material.opacity = on ? 1 : 0.45 + Math.sin(t * 3) * 0.2;
      s.ring.scale.setScalar(on ? 1.15 : 1);
      if (on) {
        target = s.game.id;
        actionBtn.textContent = `${s.game.emoji} ${isDone(s.game.id) ? 'Play again' : 'Play'}: ${s.game.title}`;
      }
      s.doneHeart.position.y = s.doneHeart.userData.baseY + Math.sin(t * 2 + s.trigger.x) * 0.15;
    }
    if (Math.hypot(p.x - cottageTrigger.x, p.z - cottageTrigger.z) < 2.6) {
      target = 'cottage';
      actionBtn.textContent = allDone() ? '💌 Enter the Secret Room' : `🔒 Locked · ${heartCount()}/${games.length} hearts`;
    }
    actionBtn.hidden = !target;

    // ambient animation
    heart.rotation.y += dt * 0.9;
    heart.position.y = 2.9 + Math.sin(t * 1.6) * 0.15;
    for (const s of steam) {
      s.position.y += dt * 0.5;
      s.material.opacity = Math.max(0, 0.7 - (s.position.y - 1.5) * 0.7);
      if (s.position.y > 2.5) s.position.y = 1.5;
    }
    if (quizMark) quizMark.position.y = 2.6 + Math.sin(t * 2.2) * 0.2;
    for (const f of floaters) {
      f.position.y += f.userData.v * dt;
      f.material.opacity = Math.min(1, 1 - (f.position.y - 7) / 3);
      if (f.position.y > 10) resetFloater(f, false);
    }
    if (allDone()) doorMat.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3;

    // camera
    camTarget.set(p.x, 1.3, p.z);
    const dist = coarse ? 8 : 7;
    camera.position.set(
      camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      camTarget.y + Math.sin(pitch) * dist,
      camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();

    // speech bubble follows his head on screen
    let showBubble = wasNear;
    if (showBubble) {
      v3.set(him.g.position.x, 2.95, him.g.position.z).project(camera);
      showBubble = v3.z < 1;
      const half = Math.min(115, root.clientWidth / 2 - 8);
      bubble.style.left = `${Math.min(root.clientWidth - half, Math.max(half, (v3.x * 0.5 + 0.5) * root.clientWidth))}px`;
      bubble.style.top = `${(-v3.y * 0.5 + 0.5) * root.clientHeight}px`;
    }
    bubble.hidden = !showBubble;
  }

  function frameLoop(now) {
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt, now / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frameLoop);
  }

  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 65 : 55;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(root);

  function refresh() {
    const n = heartCount();
    heartsEl.textContent = `${'💗'.repeat(n)}${'🤍'.repeat(games.length - n)}`;
    heartsEl.setAttribute('aria-label', `${n} of ${games.length} hearts collected`);
    for (const s of stations) s.doneHeart.visible = isDone(s.game.id);
    if (cottageSign) cottage.remove(cottageSign);
    cottageSign = label(allDone() ? '💌 Secret Room · open me!' : `🔒 Secret Room · ${n}/${games.length} hearts`, { height: 0.5 });
    cottageSign.position.set(0, 2.75, 3.1);
    cottage.add(cottageSign);
    doorLight.intensity = allDone() ? 6 : 0;
    doorMat.emissiveIntensity = 0;
  }

  // ?debug exposes a teleport for automated tests
  if (new URLSearchParams(location.search).has('debug')) {
    window.__world = { teleport: (x, z) => her.g.position.set(x, 0, z), stations, cottageTrigger };
  }

  // first frame, then drop the loading veil
  resize();
  refresh();
  update(0, 0);
  renderer.render(scene, camera);
  root.querySelector('.w-loading').remove();

  return {
    resume() {
      refresh();
      resize();
      if (active) return;
      active = true;
      last = performance.now();
      raf = requestAnimationFrame(frameLoop);
    },
    pause() {
      active = false;
      cancelAnimationFrame(raf);
      keys.clear();
      stick.x = stick.y = 0;
      knob.style.transform = '';
    },
  };
}

// ── Textures & shapes ──────────────────────────────────────────────────────
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#9cc3ff');
  g.addColorStop(0.45, '#ffc8dd');
  g.addColorStop(0.75, '#ffe1c6');
  g.addColorStop(1, '#ffd9d6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function abstractArt() {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 250;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff8ee';
  ctx.fillRect(0, 0, 320, 250);
  const cols = ['#e4572e', '#f3a712', '#ff8fab', '#7b2cbf', '#3a86ff', '#2a9d8f'];
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = cols[i % cols.length];
    ctx.lineWidth = 8 + Math.random() * 22;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 320, Math.random() * 250);
    ctx.quadraticCurveTo(Math.random() * 320, Math.random() * 250, Math.random() * 320, Math.random() * 250);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.font = '90px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💗', 160, 125);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function heartGeometry(size) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0, 0.5, -0.1, 0, -0.5, 0);
  s.bezierCurveTo(-1.1, 0, -1.1, 0.7, -1.1, 0.7);
  s.bezierCurveTo(-1.1, 1.1, -0.75, 1.54, 0, 1.9);
  s.bezierCurveTo(0.75, 1.54, 1.1, 1.1, 1.1, 0.7);
  s.bezierCurveTo(1.1, 0.7, 1.1, 0, 0.5, 0);
  s.bezierCurveTo(0.2, 0, 0, 0.5, 0, 0.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 4, curveSegments: 16 });
  geo.center();
  geo.rotateZ(Math.PI);
  geo.scale(size / 1.1, size / 1.1, size / 1.1);
  return geo;
}
