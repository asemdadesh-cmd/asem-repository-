// Builds the Pink Riot Club island and exposes collision / interaction data.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GALLERY, PITCH, POOL, STUDIO, BEACH_LOUNGE } from '../../shared/world.ts';
import { createSky, createClouds, PALETTE } from './sky.ts';
import { createOcean, createPoolWater, withCaustics } from './water.ts';
import { createTerrain, terrainHeight, islandRadius, BEACH } from './terrain.ts';
import {
  balloonCluster,
  beachUmbrella,
  beanbag,
  createBushes,
  createPalms,
  firePit,
  flamingoFloat,
  hammock,
  lantern,
  lounger,
  rubberDuck,
  rugWithCushions,
  std,
  type PalmSpec,
} from './props.ts';
import { pitchGrass, plaster, poolTiles, rng, satin, textTexture, wood, zellige } from '../gfx/textures.ts';
import { ellipsoid, curve, taperedTube, lathe, ring, mergeAll } from '../characters/parts.ts';
import { ARTWORKS, PHOTOS, assetUrl, CLUB_RULES, type Picture } from '../content.ts';

export type Collider = { kind: 'circle'; x: number; z: number; r: number } | { kind: 'box'; x: number; z: number; hx: number; hz: number };

export interface Interactable {
  id: string;
  kind: 'photo' | 'art' | 'canvas' | 'sit' | 'sign' | 'rules';
  pos: THREE.Vector3;
  radius: number;
  label: string;
  index?: number;
  sit?: { pos: THREE.Vector3; yaw: number };
  mesh?: THREE.Object3D;
}

interface Platform {
  x: number;
  z: number;
  hx: number;
  hz: number;
  y: number;
}

export class World {
  scene = new THREE.Scene();
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  colliders: Collider[] = [];
  interactables: Interactable[] = [];
  platforms: Platform[] = [];
  poolWater: ReturnType<typeof createPoolWater>;
  ocean: THREE.Mesh;
  easelCanvasMat?: THREE.MeshStandardMaterial;
  private causticTime = { value: 0 };
  private animated: ((t: number, dt: number) => void)[] = [];
  private loader = new THREE.TextureLoader();
  sunDir = new THREE.Vector3(-0.55, 0.78, 0.3).normalize();
  ballGoalNets: THREE.Object3D[] = [];
  /** Textures of the pictures by id, for the lightbox thumbnails. */
  pictureTextures = new Map<string, THREE.Texture>();
  /** Objects that move or are clicked: never merged into static batches. */
  private dynamic = new Set<THREE.Object3D>();

  constructor(quality: 'high' | 'low') {
    const s = this.scene;
    s.fog = new THREE.Fog(PALETTE.fog, 90, 420);
    s.add(createSky(this.sunDir));
    s.add(createClouds());
    this.hemi = new THREE.HemisphereLight('#fff0f4', '#8fd6b4', 1.05);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff0dc', 2.5);
    this.sun.castShadow = true;
    const sm = quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 24;
    sc.bottom = -24;
    sc.near = 1;
    sc.far = 140;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    s.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight('#ffd6ea', 0.55);
    fill.position.set(30, 20, -40);
    s.add(fill);

    this.ocean = createOcean(this.sunDir);
    s.add(this.ocean);
    s.add(createTerrain());
    this.poolWater = createPoolWater();
    s.add(this.poolWater);

    this.buildPlaza();
    this.buildPaths();
    this.buildPitch();
    this.buildPool();
    this.buildStudio();
    this.buildGallery();
    this.buildLounge();
    this.buildVegetation();
    for (const it of this.interactables) if (it.mesh) this.dynamic.add(it.mesh);
    this.batchStatic();
  }

  /** Merge every static mesh that shares a material into one draw call. */
  private batchStatic() {
    this.scene.updateMatrixWorld(true);
    const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
    const remove: THREE.Mesh[] = [];
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return;
      if ((m.material as THREE.Material).type === 'ShaderMaterial' || m.geometry.attributes.color) return;
      for (let p: THREE.Object3D | null = m; p; p = p.parent) if (this.dynamic.has(p)) return;
      const mat = m.material as THREE.Material;
      // bucket per material *and* 32 m cell so frustum/shadow culling still works
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const c = m.geometry.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
      const cell = `${Math.floor(c.x / 32)},${Math.floor(c.z / 32)}`;
      const key = `${mat.uuid}:${m.castShadow ? 1 : 0}:${cell}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, geos: [] }));
      b.geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
      remove.push(m);
    });
    for (const m of remove) m.removeFromParent();
    for (const b of buckets.values()) {
      const mesh = new THREE.Mesh(mergeAll(b.geos), b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
    }
  }

  private dyn<T extends THREE.Object3D>(o: T): T {
    this.dynamic.add(o);
    return o;
  }

  /** Follow the player with the shadow frustum. */
  focus(p: THREE.Vector3) {
    const snap = 2;
    const fx = Math.round(p.x / snap) * snap;
    const fz = Math.round(p.z / snap) * snap;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx + this.sunDir.x * 70, this.sunDir.y * 70, fz + this.sunDir.z * 70);
  }

  update(t: number, dt: number) {
    (this.ocean.material as THREE.ShaderMaterial).uniforms.time.value = t;
    this.poolWater.tick(t);
    this.causticTime.value = t;
    for (const f of this.animated) f(t, dt);
  }

  /** Height of the walkable ground (terrain or platforms). */
  groundAt(x: number, z: number): number {
    let h = terrainHeight(x, z);
    for (const p of this.platforms) if (Math.abs(x - p.x) <= p.hx && Math.abs(z - p.z) <= p.hz) h = Math.max(h, p.y);
    return h;
  }

  /** Max distance from centre players may wander (beach shallows). */
  boundRadius(x: number, z: number): number {
    return islandRadius(Math.atan2(z, x)) + 3.5;
  }

  // ------------------------------------------------------------ helpers

  private texture(url: string, onLoad?: (t: THREE.Texture) => void): THREE.Texture {
    const t = this.loader.load(
      url,
      (tex) => onLoad?.(tex),
      undefined,
      () => {
        // missing private asset (e.g. building from the public repo): show a placeholder
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffe4ef';
        ctx.fillRect(0, 0, 256, 256);
        ctx.font = '96px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️', 128, 160);
        t.image = c as unknown as HTMLImageElement;
        t.needsUpdate = true;
      },
    );
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  private add<T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, ry = 0): T {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow ||= false;
        c.receiveShadow = true;
      }
    });
    this.scene.add(o);
    return o;
  }

  private circle(x: number, z: number, r: number) {
    this.colliders.push({ kind: 'circle', x, z, r });
  }

  private box(x: number, z: number, hx: number, hz: number) {
    this.colliders.push({ kind: 'box', x, z, hx, hz });
  }

  // ------------------------------------------------------------ areas

  private buildPlaza() {
    const tiles = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: zellige(['#ff9cc6', '#7fd8be', '#fff4e6', '#2ec4b6'], 'plaza'), roughness: 0.6 }),
    );
    (tiles.material as THREE.MeshStandardMaterial).map!.repeat.set(4, 4);
    tiles.position.y = 0.02;
    tiles.receiveShadow = true;
    this.scene.add(tiles);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8, 0.12, 8, 80).rotateX(Math.PI / 2), std('#fff4e6', 0.6));
    rim.position.y = 0.05;
    this.scene.add(rim);

    // fountain
    const f = new THREE.Group();
    f.add(new THREE.Mesh(lathe([[0, 0], [1.6, 0], [1.7, 0.5], [1.5, 0.55], [1.45, 0.25], [0, 0.25]], 40), std('#fff4e6', 0.5)));
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.48, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#7fe6e8', roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 }));
    water.position.y = 0.42;
    f.add(water);
    f.add(new THREE.Mesh(lathe([[0.25, 0], [0.18, 1.0], [0.6, 1.2], [0.62, 1.3], [0.1, 1.35], [0.12, 1.8], [0.0, 1.9]], 28), std('#ffc2dd', 0.4)));
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#dffaff', transparent: true, opacity: 0.6, depthWrite: false }));
    jet.position.y = 2.1;
    f.add(this.dyn(jet));
    this.dyn(water);
    this.animated.push((t) => {
      jet.scale.y = 1 + Math.sin(t * 6) * 0.15;
      water.position.y = 0.42 + Math.sin(t * 2) * 0.01;
    });
    this.add(f, 0, 0, 0);
    this.circle(0, 0, 1.8);

    // the club sign arch
    const arch = new THREE.Group();
    const postMat = std('#fff4e6', 0.5);
    for (const sx of [-3.4, 3.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 4.2, 20), postMat);
      post.position.set(sx, 2.1, 0);
      arch.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), std('#ff7eb6', 0.35));
      cap.position.set(sx, 4.35, 0);
      arch.add(cap);
      const b = this.dyn(balloonCluster());
      b.position.set(sx, 4.4, 0);
      arch.add(b);
      this.animated.push((t) => (b.rotation.z = Math.sin(t * 1.3 + sx) * 0.08));
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.6, 0.18), std('#ff7eb6', 0.45));
    board.position.set(0, 4.1, 0);
    arch.add(board);
    const signMat = new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 1.4), signMat);
    face.position.set(0, 4.1, 0.1);
    arch.add(face);
    const back = face.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.1;
    arch.add(back);
    const paintSign = () => {
      signMat.map = textTexture(
        [
          { text: 'نادي التخربيق', font: '128px Lalezar, "Baloo Bhaijaan 2", sans-serif', color: '#ffffff', y: 105 },
          { text: 'PINK RIOT CLUB  •  ليبيا 🇱🇾 × المغرب 🇲🇦', font: 'bold 48px "Baloo Bhaijaan 2", system-ui, sans-serif', color: '#fff4e6', y: 222 },
        ],
        1024,
        270,
        (ctx) => {
          ctx.fillStyle = '#ff5fa2';
          ctx.fillRect(0, 0, 1024, 270);
          ctx.strokeStyle = '#fff4e6';
          ctx.lineWidth = 10;
          ctx.strokeRect(14, 14, 996, 242);
        },
      );
      signMat.needsUpdate = true;
    };
    paintSign();
    void document.fonts?.ready.then(paintSign);
    this.add(arch, 0, 0, 10.5);
    this.circle(-3.4, 10.5, 0.4);
    this.circle(3.4, 10.5, 0.4);
    this.interactables.push({ id: 'sign', kind: 'sign', pos: new THREE.Vector3(0, 0, 10.5), radius: 3, label: 'نادي التخربيق 💗' });

    // club rules board
    const rules = new THREE.Group();
    const rb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.12), new THREE.MeshStandardMaterial({ map: wood('#d7a77f'), roughness: 0.7 }));
    rb.position.y = 1.6;
    rules.add(rb);
    for (const sx of [-1.1, 1.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), std('#a87250'));
      leg.position.set(sx, 0.6, 0);
      rules.add(leg);
    }
    const rulesMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const rf = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), rulesMat);
    rf.position.set(0, 1.6, 0.07);
    rules.add(rf);
    const paintRules = () => {
      rulesMat.map = textTexture(
        [
          { text: 'قوانين النادي 📜', font: '64px Lalezar, sans-serif', color: '#c2185b', y: 60 },
          ...CLUB_RULES.map((r, i) => ({ text: r, font: '38px "Baloo Bhaijaan 2", sans-serif', color: '#4a2a3a', y: 135 + i * 62 })),
        ],
        720,
        540,
        (ctx) => {
          ctx.fillStyle = '#fff4e6';
          ctx.fillRect(0, 0, 720, 540);
        },
      );
      rulesMat.needsUpdate = true;
    };
    paintRules();
    void document.fonts?.ready.then(paintRules);
    this.add(rules, 7.5, 0, 3, -0.9);
    this.box(7.5, 3, 1.3, 0.4);
    this.interactables.push({ id: 'rules', kind: 'rules', pos: new THREE.Vector3(7, 0, 3.5), radius: 2.6, label: 'قوانين النادي 📜' });

    // benches around the plaza
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const b = this.bench();
      this.add(b, Math.cos(a) * 6.4, 0, Math.sin(a) * 6.4, -a - Math.PI / 2);
      this.circle(Math.cos(a) * 6.4, Math.sin(a) * 6.4, 0.9);
      this.interactables.push({
        id: `plaza-bench-${i}`,
        kind: 'sit',
        pos: new THREE.Vector3(Math.cos(a) * 5.8, 0, Math.sin(a) * 5.8),
        radius: 1.6,
        label: 'قعد شوية 🪑',
        sit: { pos: new THREE.Vector3(Math.cos(a) * 6.25, 0.0, Math.sin(a) * 6.25), yaw: -a - Math.PI / 2 + Math.PI },
      });
    }
  }

  private bench(): THREE.Group {
    const g = new THREE.Group();
    const w = new THREE.MeshStandardMaterial({ map: wood('#e0b089'), roughness: 0.7 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), w);
    seat.position.y = 0.45;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.06), w);
    back.position.set(0, 0.75, -0.24);
    back.rotation.x = -0.15;
    g.add(back);
    for (const sx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), std('#ff7eb6', 0.4));
      leg.position.set(sx, 0.22, 0);
      g.add(leg);
    }
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
    return g;
  }

  private buildPaths() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffe7dc';
    ctx.fillRect(0, 0, 128, 128);
    const r = rng(4);
    for (let y = 0; y < 128; y += 32)
      for (let x = 0; x < 128; x += 32) {
        ctx.fillStyle = `hsl(${350 + r() * 20}, 70%, ${88 + r() * 6}%)`;
        ctx.fillRect(x + 2 + (y / 32) % 2 * 16, y + 2, 28, 28);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
    const seg = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const tt = t.clone();
      tt.repeat.set(1, len / 2.4);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, len).rotateX(-Math.PI / 2), mat.clone());
      (m.material as THREE.MeshStandardMaterial).map = tt;
      m.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
      m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    seg(0, -7.5, 0, -19); // to pitch
    seg(7.6, 0, 18, 2); // to pool
    seg(-7.6, 1, -20, 2); // to studio
    seg(-5.5, 5.5, -16, 19.5); // to gallery
    seg(4.5, 6.5, 9, 30); // to beach
  }

  private buildPitch() {
    const L = PITCH.halfX * 2;
    const W = PITCH.halfZ * 2;
    const c = document.createElement('canvas');
    c.width = 1360;
    c.height = 880;
    const ctx = c.getContext('2d')!;
    const img = pitchGrass().image as unknown as CanvasImageSource;
    const k = c.width / (L + 4);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#86dcab' : '#99e6bb';
      ctx.fillRect((i * c.width) / 12, 0, c.width / 12 + 1, c.height);
    }
    ctx.globalAlpha = 0.25;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.14 * k;
    const X = (x: number) => (x + L / 2 + 2) * k;
    const Z = (z: number) => (z + W / 2 + 2) * k;
    ctx.strokeRect(X(-L / 2), Z(-W / 2), L * k, W * k);
    ctx.beginPath();
    ctx.moveTo(X(0), Z(-W / 2));
    ctx.lineTo(X(0), Z(W / 2));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(0), Z(0), 3.2 * k, 0, Math.PI * 2);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.strokeRect(s < 0 ? X(-L / 2) : X(L / 2 - 5), Z(-5.5), 5 * k, 11 * k);
      ctx.strokeRect(s < 0 ? X(-L / 2) : X(L / 2 - 2), Z(-3), 2 * k, 6 * k);
      ctx.beginPath();
      ctx.arc(X(s * (L / 2 - 3.6)), Z(0), 0.15 * k, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(X(0), Z(0), 0.2 * k, 0, Math.PI * 2);
    ctx.fill();
    // a big pink heart in the centre circle
    ctx.fillStyle = 'rgba(255,126,182,0.35)';
    ctx.beginPath();
    const hx = X(0);
    const hz = Z(0);
    const hs = 1.6 * k;
    ctx.moveTo(hx, hz + hs * 0.6);
    ctx.bezierCurveTo(hx - hs, hz, hx - hs * 0.5, hz - hs * 0.8, hx, hz - hs * 0.3);
    ctx.bezierCurveTo(hx + hs * 0.5, hz - hs * 0.8, hx + hs, hz, hx, hz + hs * 0.6);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, W + 4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    field.position.set(PITCH.cx, 0.018, PITCH.cz);
    field.receiveShadow = true;
    this.scene.add(field);

    // goals
    const post = std('#ffffff', 0.3);
    const netTex = (() => {
      const nc = document.createElement('canvas');
      nc.width = nc.height = 64;
      const nctx = nc.getContext('2d')!;
      nctx.strokeStyle = '#ffffff';
      nctx.lineWidth = 3;
      nctx.strokeRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(nc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(12, 6);
      return t;
    })();
    const netMat = new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, color: '#ffe3f0' });
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      const gx = PITCH.cx + side * PITCH.halfX;
      const hw = PITCH.goalHalfWidth;
      const H = PITCH.goalHeight;
      const D = PITCH.goalDepth;
      for (const sz of [-hw, hw]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, H, 14), post);
        p.position.set(0, H / 2, sz);
        g.add(p);
        this.circle(gx, PITCH.cz + sz, 0.12);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, hw * 2 + 0.14, 14).rotateX(Math.PI / 2), post);
      bar.position.set(0, H, 0);
      g.add(bar);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, H), netMat);
      back.rotation.y = Math.PI / 2;
      back.position.set(side * D, H / 2, 0);
      g.add(back);
      for (const sz of [-hw, hw]) {
        const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(D, H), netMat);
        sideNet.position.set((side * D) / 2, H / 2, sz);
        g.add(sideNet);
      }
      const top = new THREE.Mesh(new THREE.PlaneGeometry(D, hw * 2).rotateX(-Math.PI / 2), netMat);
      top.position.set((side * D) / 2, H, 0);
      g.add(top);
      g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
      this.add(g, gx, 0, PITCH.cz);
      this.ballGoalNets.push(g);
      // team colour flag above each goal
      const flag = this.dyn(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), std(side < 0 ? '#2ec4b6' : '#ff7eb6', 0.6, { side: THREE.DoubleSide })));
      flag.position.set(gx + side * (D + 0.6), 3.1, PITCH.cz);
      flag.rotation.y = Math.PI / 2;
      this.scene.add(flag);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 8), post);
      pole.position.set(gx + side * (D + 0.6), 1.75, PITCH.cz - 0.65);
      this.scene.add(pole);
      this.animated.push((t) => (flag.rotation.x = Math.sin(t * 3 + side) * 0.1));
    }
    // advertising boards (low, players step over them; the ball bounces)
    const boardTex = textTexture(
      [{ text: 'PINK RIOT FC  ⚽  بضربك😂  ⚽  PINK RIOT FC', font: 'bold 60px "Baloo Bhaijaan 2", system-ui', color: '#ffffff', y: 64 }],
      1024,
      128,
      (cx) => {
        const g = cx.createLinearGradient(0, 0, 1024, 0);
        g.addColorStop(0, '#ff5fa2');
        g.addColorStop(0.5, '#2ec4b6');
        g.addColorStop(1, '#ff5fa2');
        cx.fillStyle = g;
        cx.fillRect(0, 0, 1024, 128);
      },
    );
    boardTex.wrapS = THREE.RepeatWrapping;
    const bmat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.5 });
    const bx = PITCH.halfX + PITCH.goalDepth + 0.5;
    const bz = PITCH.halfZ + 1.2;
    const addBoard = (x: number, z: number, len: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.08), bmat);
      m.position.set(PITCH.cx + x, 0.25, PITCH.cz + z);
      m.rotation.y = ry;
      m.castShadow = true;
      this.scene.add(m);
    };
    for (const s of [-1, 1]) {
      addBoard(0, s * bz, bx * 2, 0);
      addBoard(s * bx, 0, bz * 2, Math.PI / 2);
    }
    // corner flags
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const g = new THREE.Group();
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), post);
        p.position.y = 0.75;
        g.add(p);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), std('#ff7eb6', 0.6, { side: THREE.DoubleSide }));
        fl.position.set(0.22, 1.35, 0);
        g.add(fl);
        this.add(g, PITCH.cx + sx * PITCH.halfX, 0, PITCH.cz + sz * PITCH.halfZ);
      }
    // small stand of benches on the south side
    for (let i = 0; i < 3; i++) {
      const b = this.bench();
      this.add(b, PITCH.cx - 6 + i * 6, 0, PITCH.cz + PITCH.halfZ + 3, Math.PI);
      this.circle(PITCH.cx - 6 + i * 6, PITCH.cz + PITCH.halfZ + 3, 0.9);
      this.interactables.push({
        id: `pitch-bench-${i}`,
        kind: 'sit',
        pos: new THREE.Vector3(PITCH.cx - 6 + i * 6, 0, PITCH.cz + PITCH.halfZ + 2.3),
        radius: 1.5,
        label: 'تفرج فالماتش 🍿',
        sit: { pos: new THREE.Vector3(PITCH.cx - 6 + i * 6, 0, PITCH.cz + PITCH.halfZ + 2.85), yaw: Math.PI },
      });
    }
  }

  private buildPool() {
    const { cx, cz, halfX: hx, halfZ: hz, floorY } = POOL;
    const tileTex = poolTiles();
    const mk = (repX: number, repY: number) => {
      const t = tileTex.clone();
      t.repeat.set(repX, repY);
      t.needsUpdate = true;
      return withCaustics(new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }), this.causticTime);
    };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2).rotateX(-Math.PI / 2), mk(hx, hz));
    floor.position.set(cx, floorY, cz);
    this.scene.add(floor);
    const depth = -floorY;
    const walls: [number, number, number, number][] = [
      [cx, cz - hz, hx * 2, 0],
      [cx, cz + hz, hx * 2, Math.PI],
      [cx - hx, cz, hz * 2, Math.PI / 2],
      [cx + hx, cz, hz * 2, -Math.PI / 2],
    ];
    for (const [x, z, len, ry] of walls) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, depth + 0.05), mk(len / 2, depth / 2));
      w.position.set(x, floorY / 2, z);
      w.rotation.y = ry;
      this.scene.add(w);
    }
    // lane line + heart mosaic on the floor
    const heart = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ff7eb6', roughness: 0.4 }));
    heart.position.set(cx, floorY + 0.01, cz);
    this.scene.add(heart);
    // coping
    const cop = std('#fffaf3', 0.5);
    const cw = 0.55;
    for (const [x, z, sx, sz] of [
      [cx, cz - hz - cw / 2, hx * 2 + cw * 2, cw],
      [cx, cz + hz + cw / 2, hx * 2 + cw * 2, cw],
      [cx - hx - cw / 2, cz, cw, hz * 2],
      [cx + hx + cw / 2, cz, cw, hz * 2],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sz), cop);
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      this.scene.add(m);
    }
    // wooden deck
    const deckTex = wood('#e9c2a0');
    deckTex.repeat.set(8, 4);
    const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.75 });
    const D = 3.4;
    for (const [x, z, sx, sz] of [
      [cx, cz - hz - cw - D / 2, hx * 2 + (cw + D) * 2, D],
      [cx, cz + hz + cw + D / 2, hx * 2 + (cw + D) * 2, D],
      [cx - hx - cw - D / 2, cz, D, hz * 2 + cw * 2],
      [cx + hx + cw + D / 2, cz, D, hz * 2 + cw * 2],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), deckMat);
      m.position.set(x, 0.0, z);
      m.receiveShadow = true;
      this.scene.add(m);
    }
    // loungers + umbrellas on the north deck
    for (let i = 0; i < 4; i++) {
      const x = cx - 6 + i * 4;
      const z = cz - hz - cw - 1.9;
      this.add(lounger(i % 2 ? '#a8e6cf' : '#ffc2dd'), x, 0.03, z, Math.PI);
      this.box(x, z, 0.4, 1.0);
      this.interactables.push({ id: `lounger-${i}`, kind: 'sit', pos: new THREE.Vector3(x, 0, z + 1.2), radius: 1.4, label: 'تشمس شوية ☀️', sit: { pos: new THREE.Vector3(x, 0.38, z + 0.1), yaw: 0 } });
      if (i % 2 === 0) {
        this.add(beachUmbrella(i % 4 ? '#2ec4b6' : '#ff7eb6'), x + 2, 0.03, z - 0.2);
        this.circle(x + 2, z - 0.2, 0.15);
      }
    }
    // floaties
    const flamingo = this.dyn(flamingoFloat());
    flamingo.scale.setScalar(0.8);
    this.add(flamingo, cx + 3.5, POOL.waterY, cz + 1);
    const ducks = [rubberDuck(), rubberDuck(), rubberDuck()].map((d) => this.dyn(d));
    ducks.forEach((d, i) => this.add(d, cx - 4 + i * 1.6, POOL.waterY + 0.08, cz - 2 + (i % 2) * 1.2));
    this.animated.push((t) => {
      flamingo.position.y = POOL.waterY + Math.sin(t * 1.5) * 0.04;
      flamingo.position.x = cx + 3.5 + Math.sin(t * 0.13) * 2.2;
      flamingo.position.z = cz + 1 + Math.cos(t * 0.11) * 1.5;
      flamingo.rotation.y = t * 0.08;
      flamingo.rotation.z = Math.sin(t * 1.2) * 0.04;
      ducks.forEach((d, i) => {
        d.position.y = POOL.waterY + 0.06 + Math.sin(t * 2 + i) * 0.03;
        d.position.x = cx - 4 + i * 1.6 + Math.sin(t * 0.2 + i) * 1.4;
        d.rotation.y = Math.sin(t * 0.3 + i) * 1.5;
      });
    });
    // ladder
    const ladder = new THREE.Group();
    const steel = std('#dfe6ea', 0.2, { metalness: 0.9 });
    for (const sx of [-0.3, 0.3]) {
      const rail = new THREE.Mesh(taperedTube(curve([[sx, -1.4, 0.15], [sx, 0.4, 0.15], [sx, 0.85, -0.1], [sx, 0.3, -0.45]]), 0.03, 0.03, 20, 8), steel);
      ladder.add(rail);
    }
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.12), steel);
      st.position.set(0, -1.3 + i * 0.32, 0.18);
      ladder.add(st);
    }
    this.add(ladder, cx + hx - 1.5, 0, cz + hz);
    // sign
    const s = textTexture([{ text: 'معركة المسبح 💦 أول وحدة توصل 5 كتربح', font: 'bold 44px "Baloo Bhaijaan 2", system-ui', color: '#ffffff', y: 64 }], 1024, 128, (c) => {
      c.fillStyle = '#2ec4b6';
      c.fillRect(0, 0, 1024, 128);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.55), new THREE.MeshStandardMaterial({ map: s, side: THREE.DoubleSide }));
    sign.position.set(cx, 1.6, cz + hz + cw + D - 0.3);
    sign.rotation.y = Math.PI;
    this.scene.add(sign);
    for (const sx of [-2.1, 2.1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 8), std('#ffffff'));
      p.position.set(cx + sx, 0.95, cz + hz + cw + D - 0.3);
      this.scene.add(p);
    }
  }

  private easel(): THREE.Group {
    const g = new THREE.Group();
    const w = new THREE.MeshStandardMaterial({ map: wood('#c58e62'), roughness: 0.7 });
    for (const [x, rz] of [
      [-0.45, -0.08],
      [0.45, 0.08],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), w);
      leg.position.set(x, 1.05, 0);
      leg.rotation.z = rz;
      leg.rotation.x = -0.12;
      g.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), w);
    back.position.set(0, 0.95, -0.45);
    back.rotation.x = 0.3;
    g.add(back);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.12), w);
    shelf.position.set(0, 0.8, 0.12);
    g.add(shelf);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
    return g;
  }

  private framedPicture(pic: Picture, maxW: number, maxH: number, frameColor = '#e7b85a', small = true): THREE.Group {
    const g = new THREE.Group();
    const ar = pic.w / pic.h;
    let w = maxW;
    let h = w / ar;
    if (h > maxH) {
      h = maxH;
      w = h * ar;
    }
    const tex = this.texture(assetUrl(pic.file, small));
    this.pictureTextures.set(pic.id, tex);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    photo.position.z = 0.035;
    g.add(photo);
    const fm = std(frameColor, 0.35, { metalness: frameColor === '#e7b85a' ? 0.7 : 0 });
    const t = 0.08;
    for (const [x, y, sx, sy] of [
      [0, h / 2 + t / 2, w + t * 2, t],
      [0, -h / 2 - t / 2, w + t * 2, t],
      [-w / 2 - t / 2, 0, t, h],
      [w / 2 + t / 2, 0, t, h],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.08), fm);
      m.position.set(x, y, 0.02);
      m.castShadow = true;
      g.add(m);
    }
    const backing = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), std('#fff4e6'));
    g.add(backing);
    g.userData.size = { w, h };
    return g;
  }

  private buildStudio() {
    const { cx, cz } = STUDIO;
    const floorTex = wood('#e8c39e');
    floorTex.repeat.set(6, 4);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(13, 0.16, 10), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
    fl.position.set(cx, 0.06, cz);
    fl.receiveShadow = true;
    this.scene.add(fl);
    this.platforms.push({ x: cx, z: cz, hx: 6.5, hz: 5, y: 0.14 });
    // columns + pergola + pink canopy
    const col = std('#fff4e6', 0.5);
    for (const sx of [-6, 6])
      for (const sz of [-4.5, 4.5]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.6, 16), col);
        c.position.set(cx + sx, 1.9, cz + sz);
        c.castShadow = true;
        this.scene.add(c);
        this.circle(cx + sx, cz + sz, 0.3);
      }
    const beamMat = new THREE.MeshStandardMaterial({ map: wood('#d9a77d'), roughness: 0.7 });
    for (const sz of [-4.5, 4.5]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.22, 0.25), beamMat);
      b.position.set(cx, 3.75, cz + sz);
      this.scene.add(b);
    }
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 9.6), beamMat);
      b.position.set(cx - 6 + i * 1.5, 3.9, cz);
      b.castShadow = true;
      this.scene.add(b);
    }
    const canopy = new THREE.PlaneGeometry(12.4, 9.4, 30, 20).rotateX(-Math.PI / 2);
    const cp = canopy.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i);
      cp.setY(i, -Math.abs(Math.sin((x / 1.5) * Math.PI)) * 0.18);
    }
    canopy.computeVertexNormals();
    const cm = new THREE.Mesh(canopy, new THREE.MeshStandardMaterial({ color: '#ffb3d1', side: THREE.DoubleSide, transparent: true, opacity: 0.88, roughness: 0.8 }));
    cm.position.set(cx, 4.05, cz);
    cm.castShadow = true;
    this.scene.add(cm);
    const sign = textTexture([{ text: 'مرسم يسو 🎨', font: '86px Lalezar, sans-serif', color: '#c2185b', y: 70 }], 512, 140, (c) => {
      c.fillStyle = '#fff4e6';
      c.fillRect(0, 0, 512, 140);
    });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.82), new THREE.MeshStandardMaterial({ map: sign, side: THREE.DoubleSide }));
    sm.position.set(cx + 6.05, 3.3, cz);
    sm.rotation.y = Math.PI / 2;
    this.scene.add(sm);
    void document.fonts?.ready.then(() => {
      const t2 = textTexture([{ text: 'مرسم يسو 🎨', font: '86px Lalezar, sans-serif', color: '#c2185b', y: 70 }], 512, 140, (c) => {
        c.fillStyle = '#fff4e6';
        c.fillRect(0, 0, 512, 140);
      });
      (sm.material as THREE.MeshStandardMaterial).map = t2;
      (sm.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });

    // her two drawings on easels (facing the entrance, +X)
    const arts: [Picture, number, number][] = [
      [ARTWORKS[0], cx - 2.5, cz - 2.6],
      [ARTWORKS[1], cx - 2.5, cz + 2.6],
    ];
    arts.forEach(([pic, x, z], i) => {
      const e = this.easel();
      const fr = this.framedPicture(pic, 1.35, 1.55, '#fff4e6');
      fr.position.set(0, 1.62, 0.16);
      fr.rotation.x = -0.12;
      e.add(fr);
      this.add(e, x, 0.14, z, Math.PI / 2 - (i ? 0.35 : -0.35));
      this.circle(x, z, 0.6);
      this.interactables.push({ id: `art-${pic.id}`, kind: 'art', pos: new THREE.Vector3(x + 1.4, 0, z), radius: 2.0, label: `${pic.title} 🎨`, index: ARTWORKS.indexOf(pic), mesh: fr });
    });

    // the shared live canvas (big easel in the middle)
    const big = this.easel();
    big.scale.set(1.25, 1.2, 1.25);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.32, 0.05), std('#ffffff', 0.9));
    board.position.set(0, 1.65, 0.12);
    board.rotation.x = -0.12;
    big.add(board);
    this.easelCanvasMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    const face = this.dyn(new THREE.Mesh(new THREE.PlaneGeometry(1.68, 1.26), this.easelCanvasMat));
    face.position.set(0, 1.65, 0.152);
    face.rotation.x = -0.12;
    big.add(face);
    this.add(big, cx - 3.6, 0.14, cz, Math.PI / 2);
    this.circle(cx - 3.6, cz, 0.7);
    this.interactables.push({ id: 'canvas', kind: 'canvas', pos: new THREE.Vector3(cx - 2.0, 0, cz), radius: 2.2, label: 'لوحة مشتركة: يالله نرسمو! 🖌️' });

    // clay cat sculpture on a plinth + its photo
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.0, 24), std('#fff4e6', 0.6));
    plinth.position.set(cx + 2.8, 0.64, cz - 3.4);
    plinth.castShadow = true;
    this.scene.add(plinth);
    this.circle(cx + 2.8, cz - 3.4, 0.55);
    const cat = this.dyn(this.clayCat());
    cat.position.set(cx + 2.8, 1.14, cz - 3.4);
    cat.rotation.y = 0.8;
    this.scene.add(cat);
    this.animated.push((t) => (cat.rotation.y = 0.8 + Math.sin(t * 0.5) * 0.25));
    const clayPhoto = this.framedPicture(ARTWORKS[2], 0.55, 0.8, '#fff4e6');
    clayPhoto.position.set(cx + 2.8, 1.0, cz - 2.9);
    clayPhoto.rotation.set(-0.5, 0.6, 0);
    this.scene.add(clayPhoto);
    this.interactables.push({ id: 'art-clay', kind: 'art', pos: new THREE.Vector3(cx + 3.4, 0, cz - 2.4), radius: 1.8, label: 'القط الكسول 🐈', index: 2, mesh: cat });

    // paint table
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), new THREE.MeshStandardMaterial({ map: wood('#f0d2b4') }));
    top.position.y = 0.9;
    table.add(top);
    for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), std('#c58e62'));
      l.position.set(x, 0.45, z);
      table.add(l);
    }
    const tubeCols = ['#ff5fa2', '#2ec4b6', '#ffd84a', '#7b5cd6', '#ff8a2a', '#ffffff', '#1d3557'];
    tubeCols.forEach((c, i) => {
      const tb = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8).rotateZ(Math.PI / 2), std(c, 0.4));
      tb.position.set(-0.8 + i * 0.12, 0.97, -0.15 + (i % 2) * 0.12);
      tb.rotation.y = (i - 3) * 0.2;
      table.add(tb);
    });
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.22, 16, 1, true), new THREE.MeshPhysicalMaterial({ color: '#dff7f3', transparent: true, opacity: 0.45, roughness: 0.05, side: THREE.DoubleSide }));
    jar.position.set(0.6, 1.05, 0);
    table.add(jar);
    for (let i = 0; i < 6; i++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 6), std(['#1d1d1d', '#c58e62', '#ff7eb6'][i % 3]));
      br.position.set(0.6 + Math.sin(i) * 0.04, 1.18, Math.cos(i) * 0.04);
      br.rotation.set(Math.sin(i * 2) * 0.2, 0, Math.cos(i * 3) * 0.2);
      table.add(br);
    }
    const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24).scale(1.3, 1, 1), new THREE.MeshStandardMaterial({ map: wood('#e3b98f') }));
    palette.position.set(0.0, 0.95, 0.2);
    table.add(palette);
    table.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
    this.add(table, cx + 2.8, 0.14, cz + 3, 0);
    this.box(cx + 2.8, cz + 3, 1.15, 0.5);
    // fluffy rug
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: satin('#ffd6e7'), roughness: 1 }));
    rug.position.set(cx - 1.5, 0.15, cz);
    rug.receiveShadow = true;
    this.scene.add(rug);
    // lanterns
    for (const [x, z] of [[-5.5, -4], [5.5, -4], [-5.5, 4], [5.5, 4]]) {
      const l = lantern();
      l.position.set(cx + x, 3.0, cz + z);
      this.scene.add(l);
    }
  }

  private clayCat(): THREE.Group {
    const g = new THREE.Group();
    const clay = new THREE.MeshStandardMaterial({ color: '#77767c', roughness: 0.95 });
    g.add(new THREE.Mesh(ellipsoid(0.24, 0.13, 0.19), clay));
    const head = new THREE.Mesh(ellipsoid(0.13, 0.12, 0.12), clay);
    head.position.set(-0.22, 0.12, 0);
    g.add(head);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 10), clay);
      ear.position.set(-0.25, 0.24, s * 0.06);
      ear.rotation.x = s * 0.3;
      g.add(ear);
      const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.06, 4, 8), clay);
      paw.position.set(-0.06, 0.14, s * 0.09);
      paw.rotation.z = 0.3;
      g.add(paw);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.06, 4, 8), clay);
      leg.position.set(0.14, 0.13, s * 0.08);
      leg.rotation.z = -0.4;
      g.add(leg);
    }
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      if (t < 0.4) pts.push([0.22 + t * 0.4, -0.02 - t * 0.05, 0]);
      else {
        const a = (t - 0.4) * Math.PI * 3;
        const r = 0.07 * (1 - (t - 0.4));
        pts.push([0.38 + Math.cos(a) * r, -0.04 + Math.sin(a) * r, 0.02 * a]);
      }
    }
    g.add(new THREE.Mesh(taperedTube(curve(pts), 0.025, 0.012, 40, 8), clay));
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
    g.scale.setScalar(1.3);
    return g;
  }

  private buildGallery() {
    const { cx, cz } = GALLERY;
    const wallZ = cz + 3.5;
    const len = 20;
    // floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(len + 1, 0.12, 8), new THREE.MeshStandardMaterial({ map: zellige(['#fff4e6', '#ffc2dd', '#fffaf3', '#a8e6cf'], 'gallery'), roughness: 0.55 }));
    ((floor.material as THREE.MeshStandardMaterial).map as THREE.Texture).repeat.set(8, 3);
    floor.position.set(cx, 0.05, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.platforms.push({ x: cx, z: cz, hx: (len + 1) / 2, hz: 4, y: 0.11 });
    // back wall with zellige wainscot
    const plasterMat = new THREE.MeshStandardMaterial({ map: plaster('#fff1e8'), roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 4.6, 0.5), plasterMat);
    wall.position.set(cx, 2.3, wallZ);
    wall.castShadow = wall.receiveShadow = true;
    this.scene.add(wall);
    this.box(cx, wallZ, len / 2, 0.35);
    const zel = zellige(['#2ec4b6', '#ff7eb6', '#fff4e6', '#7fd8be'], 'wainscot');
    zel.repeat.set(len / 1.1, 1);
    const wain = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.1), new THREE.MeshStandardMaterial({ map: zel, roughness: 0.4 }));
    wain.position.set(cx, 0.66, wallZ - 0.26);
    wain.rotation.y = Math.PI;
    this.scene.add(wain);
    // crenellated top
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), plasterMat);
      m.position.set(cx - len / 2 + 0.5 + i * 1.0, 4.8, wallZ);
      this.scene.add(m);
    }
    // side wings
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 5), plasterMat);
      w.position.set(cx + s * (len / 2 - 0.25), 2.1, wallZ - 2.5);
      w.castShadow = true;
      this.scene.add(w);
      this.box(cx + s * (len / 2 - 0.25), wallZ - 2.5, 0.3, 2.5);
    }
    const title = textTexture(
      [
        { text: 'معرض يسو 📸', font: '96px Lalezar, sans-serif', color: '#ffffff', y: 78 },
      ],
      768,
      150,
      (c) => {
        c.fillStyle = '#ff5fa2';
        c.fillRect(0, 0, 768, 150);
      },
    );
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.86), new THREE.MeshStandardMaterial({ map: title }));
    tm.position.set(cx, 4.15, wallZ - 0.27);
    tm.rotation.y = Math.PI;
    this.scene.add(tm);
    void document.fonts?.ready.then(() => {
      (tm.material as THREE.MeshStandardMaterial).map = textTexture([{ text: 'معرض يسو 📸', font: '96px Lalezar, sans-serif', color: '#ffffff', y: 78 }], 768, 150, (c) => {
        c.fillStyle = '#ff5fa2';
        c.fillRect(0, 0, 768, 150);
      });
      (tm.material as THREE.MeshStandardMaterial).needsUpdate = true;
    });

    // photos in horseshoe-arch niches; the special one in the middle
    const order = [PHOTOS[1], PHOTOS[3], PHOTOS[2], PHOTOS[0], PHOTOS[4], PHOTOS[5], PHOTOS[6]];
    const xs = [-8.2, -5.6, -3.0, 0, 3.0, 5.6, 8.2];
    order.forEach((pic, i) => {
      const featured = pic.featured === true;
      const x = cx + xs[i] * 1.0;
      const arch = this.horseshoeArch(featured ? 3.6 : 2.2, featured ? 3.4 : 2.6, featured ? '#e7b85a' : i % 2 ? '#2ec4b6' : '#ff7eb6');
      arch.position.set(x, 1.0, wallZ - 0.27);
      arch.rotation.y = Math.PI;
      this.scene.add(arch);
      const fr = this.framedPicture(pic, featured ? 2.9 : 1.55, featured ? 2.1 : 1.95, featured ? '#e7b85a' : '#fff4e6', !featured);
      fr.position.set(x, featured ? 2.35 : 2.25, wallZ - 0.3);
      fr.rotation.y = Math.PI;
      this.scene.add(fr);
      this.interactables.push({ id: `photo-${pic.id}`, kind: 'photo', pos: new THREE.Vector3(x, 0, wallZ - 2.0), radius: featured ? 2.0 : 1.4, label: `${pic.title} 📸`, index: PHOTOS.indexOf(pic), mesh: fr });
    });
    // fairy lights across the featured arch
    const bulbs: THREE.Mesh[] = [];
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff2b8', emissive: '#ffd36b', emissiveIntensity: 1.2 });
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const x = cx - 4.6 + t * 9.2;
      const y = 3.75 - Math.sin(t * Math.PI) * 0.55;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bulbMat);
      b.position.set(x, y, wallZ - 0.45);
      this.scene.add(b);
      bulbs.push(b);
    }
    this.animated.push((t) => {
      bulbMat.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.3;
    });
    // hanging lanterns
    for (const x of [-6.8, 6.8]) {
      const l = lantern('#a8e6cf');
      l.position.set(cx + x, 3.4, wallZ - 0.7);
      this.scene.add(l);
    }
    // a bench to sit and look
    const b = this.bench();
    this.add(b, cx, 0.11, cz - 1.8, Math.PI);
    this.circle(cx - 0.5, cz - 1.8, 0.6);
    this.circle(cx + 0.5, cz - 1.8, 0.6);
    this.interactables.push({ id: 'gallery-bench', kind: 'sit', pos: new THREE.Vector3(cx, 0, cz - 2.6), radius: 1.3, label: 'قعد وتفرج 🤍', sit: { pos: new THREE.Vector3(cx, 0.11, cz - 1.75), yaw: 0 } });
  }

  private horseshoeArch(w: number, h: number, color: string): THREE.Mesh {
    const shape = new THREE.Shape();
    const r = w / 2;
    shape.moveTo(-r - 0.18, 0);
    shape.lineTo(-r - 0.18, h - r);
    shape.absarc(0, h - r, r + 0.18, Math.PI, 0, true);
    shape.lineTo(r + 0.18, 0);
    shape.lineTo(r, 0);
    shape.lineTo(r, h - r);
    shape.absarc(0, h - r + 0.15, r, -0.15, Math.PI + 0.15, false);
    shape.lineTo(-r, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 24 });
    const m = new THREE.Mesh(g, std(color, 0.35, color === '#e7b85a' ? { metalness: 0.6 } : {}));
    m.castShadow = true;
    return m;
  }

  private buildLounge() {
    const { cx, cz } = BEACH_LOUNGE;
    const y = (x: number, z: number) => terrainHeight(x, z);
    // hammock between two palms
    const palms: PalmSpec[] = [
      { x: cx - 6.5, z: cz - 1, h: 6, lean: 0.8, dir: Math.PI, seed: 101, y: y(cx - 6.5, cz - 1) },
      { x: cx - 2.5, z: cz - 1, h: 6.4, lean: 0.9, dir: 0, seed: 102, y: y(cx - 2.5, cz - 1) },
    ];
    this.scene.add(createPalms(palms));
    for (const p of palms) this.circle(p.x, p.z, 0.35);
    const hm = hammock(3.6);
    hm.position.set(cx - 4.5, y(cx - 4.5, cz - 1), cz - 1);
    this.scene.add(hm);
    this.interactables.push({ id: 'hammock', kind: 'sit', pos: new THREE.Vector3(cx - 4.5, 0, cz + 0.2), radius: 1.6, label: 'تمدد فالهاماك 😌', sit: { pos: new THREE.Vector3(cx - 4.5, y(cx - 4.5, cz - 1) + 0.55, cz - 1), yaw: Math.PI } });
    // beanbags around a fire pit
    const fp = firePit();
    fp.flames.forEach((f) => this.dyn(f));
    fp.position.set(cx + 3, y(cx + 3, cz + 1), cz + 1);
    this.scene.add(fp);
    this.circle(cx + 3, cz + 1, 0.95);
    this.animated.push((t) => {
      fp.flames.forEach((f, i) => {
        f.scale.set(1 + Math.sin(t * 9 + i) * 0.08, 1 + Math.sin(t * 13 + i * 2) * 0.18, 1);
        f.rotation.y = t * (1 + i);
      });
    });
    const bagColors = ['#ff7eb6', '#a8e6cf', '#2ec4b6', '#ffd84a'];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const bx = cx + 3 + Math.cos(a) * 2.3;
      const bz = cz + 1 + Math.sin(a) * 2.3;
      const bb = beanbag(bagColors[i]);
      bb.position.set(bx, y(bx, bz), bz);
      bb.rotation.y = -a - Math.PI / 2;
      this.scene.add(bb);
      this.circle(bx, bz, 0.45);
      const yaw = Math.atan2(cx + 3 - bx, cz + 1 - bz);
      this.interactables.push({ id: `beanbag-${i}`, kind: 'sit', pos: new THREE.Vector3(bx, 0, bz), radius: 1.3, label: 'قعد قدام العافية 🔥', sit: { pos: new THREE.Vector3(bx, y(bx, bz) + 0.12, bz), yaw } });
    }
    // Moroccan rug + tea + lanterns
    const rug = rugWithCushions();
    rug.position.set(cx - 3.5, y(cx - 3.5, cz + 4), cz + 4);
    this.scene.add(rug);
    this.circle(cx - 3.5, cz + 4, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const sx = cx - 3.5 + Math.cos(a) * 1.25;
      const sz = cz + 4 + Math.sin(a) * 0.9;
      this.interactables.push({ id: `rug-${i}`, kind: 'sit', pos: new THREE.Vector3(sx, 0, sz), radius: 1.0, label: 'كاس ديال أتاي؟ 🍵', sit: { pos: new THREE.Vector3(sx, y(sx, sz) + 0.05, sz), yaw: Math.atan2(cx - 3.5 - sx, cz + 4 - sz) } });
    }
    for (const [dx, dz] of [[-5.5, 2.8], [-1.5, 5.6], [5.6, 3.5]]) {
      const l = lantern(dx > 0 ? '#ffd84a' : '#ff9cc6');
      l.position.set(cx + dx, y(cx + dx, cz + dz), cz + dz);
      this.scene.add(l);
    }
    // a big umbrella + loungers facing the sea
    for (let i = 0; i < 2; i++) {
      const lx = cx + 7 + i * 1.4;
      const lz = cz + 2.5;
      const l = lounger(i ? '#ffd84a' : '#a8e6cf');
      l.position.set(lx, y(lx, lz), lz);
      l.rotation.y = Math.PI;
      this.scene.add(l);
      this.box(lx, lz, 0.4, 1.0);
    }
    const u = beachUmbrella('#2ec4b6');
    u.position.set(cx + 7.7, y(cx + 7.7, cz + 4.2), cz + 4.2);
    this.scene.add(u);
  }

  private buildVegetation() {
    const r = rng(2024);
    const specs: PalmSpec[] = [];
    const avoid = [
      { x: PITCH.cx, z: PITCH.cz, r: 24 },
      { x: POOL.cx, z: POOL.cz, r: 13 },
      { x: STUDIO.cx, z: STUDIO.cz, r: 9.5 },
      { x: GALLERY.cx, z: GALLERY.cz + 1, r: 12 },
      { x: BEACH_LOUNGE.cx, z: BEACH_LOUNGE.cz, r: 8 },
      { x: 0, z: 0, r: 12 },
    ];
    const free = (x: number, z: number) => avoid.every((a) => Math.hypot(x - a.x, z - a.z) > a.r);
    let tries = 0;
    while (specs.length < 46 && tries++ < 2000) {
      const a = r() * Math.PI * 2;
      const edge = islandRadius(a);
      const ring2 = r() < 0.65;
      const rad = ring2 ? edge - BEACH + 1 + r() * (BEACH - 2) : 12 + r() * (edge - BEACH - 14);
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (!free(x, z)) continue;
      if (specs.some((s) => Math.hypot(s.x - x, s.z - z) < 4.5)) continue;
      specs.push({ x, z, h: 5.5 + r() * 3, lean: 0.4 + r() * 1.4, dir: a + Math.PI + (r() - 0.5), seed: 1000 + specs.length, y: terrainHeight(x, z) });
    }
    // flank the paths
    for (const [x, z] of [[11, -2], [11, 6], [-11, -2], [-11, 6], [4, -12], [-4, -12]]) specs.push({ x, z, h: 6.5, lean: 0.6, dir: Math.atan2(z, x), seed: 3000 + x * 7 + z, y: 0 });
    const palms = createPalms(specs);
    this.scene.add(palms);
    for (const s of specs) this.circle(s.x, s.z, 0.32);
    const bushes: { x: number; z: number; s: number }[] = [];
    tries = 0;
    while (bushes.length < 40 && tries++ < 2000) {
      const a = r() * Math.PI * 2;
      const rad = 9 + r() * (islandRadius(a) - BEACH - 10);
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (!free(x, z)) continue;
      bushes.push({ x, z, s: 0.7 + r() * 0.6 });
    }
    // around the plaza ring
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      if (Math.abs(Math.sin(a)) > 0.92 || Math.abs(Math.cos(a)) > 0.92) continue;
      bushes.push({ x: Math.cos(a) * 9.4, z: Math.sin(a) * 9.4, s: 0.75 });
    }
    this.scene.add(createBushes(bushes));
    for (const b of bushes) this.circle(b.x, b.z, b.s * 0.9);
    // a few soft rocks on the beach
    const rock = std('#f1d6cf', 0.95);
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2;
      const rad = islandRadius(a) - r() * 4;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (!free(x, z)) continue;
      const s = 0.4 + r() * 0.8;
      const rg = mergeVertices(new THREE.DodecahedronGeometry(s, 2).deleteAttribute('normal').deleteAttribute('uv'));
      rg.computeVertexNormals();
      const m = new THREE.Mesh(rg, rock);
      m.position.set(x, terrainHeight(x, z) + s * 0.3, z);
      m.rotation.set(r(), r(), r());
      m.castShadow = true;
      this.scene.add(m);
      this.circle(x, z, s * 0.8);
    }
    void ring;
  }
}
