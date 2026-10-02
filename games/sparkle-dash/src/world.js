// The environment: sky, sun, clouds, the scrolling track, side ground, scenery
// and the smooth blend between worlds (biomes).
import * as THREE from 'three';
import { LANE_W, SPAWN_AHEAD, DESPAWN_BEHIND, BIOMES, biomeIndexForDistance } from './config.js';
import { geo, toonUnique, toonVC, bakeGroup, canvasTexture } from './gfx.js';
import { DECOR } from './decor.js';

export const TRACK_W = LANE_W * 3;
const TRACK_LEN = 260;
const TRACK_TILE = LANE_W * 2;     // world length of one checker tile
const GROUND_TILE = 6;
const BLEND_RATE = 1.4;

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'track', 'ground', 'rail', 'sun', 'hemiSky', 'hemiGround', 'dir'];

export class World {
  constructor(scene, rng, maxAnisotropy = 4) {
    this.scene = scene;
    this.rng = rng;
    this.runStart = 0;
    this.decor = [];
    this.decorGeos = new Map();     // baked scenery variants, built lazily
    this.decorCursor = 0;
    this.biome = 0;
    this.space = 0;
    this.settled = true;     // colours have reached the target biome: skip per-frame blending

    this.targets = BIOMES.map((b) => Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color(b[k])])));
    this.cur = Object.fromEntries(COLOR_KEYS.map((k) => [k, this.targets[0][k].clone()]));

    scene.fog = new THREE.Fog(this.cur.skyHorizon.clone(), 30, 108);

    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.55);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.7);
    this.sunLight.position.set(-6, 12, 9);
    scene.add(this.hemi, this.sunLight);

    this.buildSky();
    this.buildGround(maxAnisotropy);
    this.buildSkyClouds();
    this.apply();
  }

  buildSky() {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { topColor: { value: this.cur.skyTop }, horizonColor: { value: this.cur.skyHorizon } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizonColor, topColor, pow(h, 0.5));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), this.skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.scene.add(sky);

    // sun / moon with a soft halo
    this.sunMat = new THREE.MeshBasicMaterial({ color: this.cur.sun, fog: false });
    this.haloMat = new THREE.MeshBasicMaterial({ color: this.cur.sun, fog: false, transparent: true, opacity: 0.28, depthWrite: false });
    this.sun = new THREE.Group();
    this.sun.add(new THREE.Mesh(geo.sphere, this.sunMat));
    const halo = new THREE.Mesh(geo.sphere, this.haloMat);
    halo.scale.setScalar(1.5);
    this.sun.add(halo);
    this.sun.scale.setScalar(15);
    this.sun.position.set(-55, 58, -200);
    this.scene.add(this.sun);

    // stars (only visible in space)
    const n = 380;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = 0.06 + Math.random() * 0.94;
      const rr = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * rr * 260, y * 260, Math.sin(a) * rr * 260], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat);
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  buildSkyClouds() {
    this.cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
    this.skyClouds = [];
    for (let i = 0; i < 11; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const m = new THREE.Mesh(geo.lowSphere, this.cloudMat);
        const rr = 5 + Math.random() * 5;
        m.position.set((j - n / 2) * 7 + Math.random() * 3, Math.random() * 3, Math.random() * 3);
        m.scale.set(rr, rr * 0.62, rr * 0.8);
        g.add(m);
      }
      g.position.set(-130 + (i / 11) * 260 + Math.random() * 14, 20 + Math.random() * 24, -150 - Math.random() * 40);
      g.userData.drift = 0.6 + Math.random() * 0.9;
      this.scene.add(g);
      this.skyClouds.push(g);
    }
  }

  buildGround(maxAniso) {
    const trackTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#e4dff2';
      g.fillRect(0, 0, s / 2, s / 2);
      g.fillRect(s / 2, s / 2, s / 2, s / 2);
    });
    trackTex.repeat.set(TRACK_W / TRACK_TILE, TRACK_LEN / TRACK_TILE);
    trackTex.anisotropy = maxAniso;
    this.trackTex = trackTex;
    this.trackMat = new THREE.MeshBasicMaterial({ map: trackTex, color: this.cur.track });
    const track = new THREE.Mesh(geo.plane, this.trackMat);
    track.rotation.x = -Math.PI / 2;
    track.scale.set(TRACK_W, TRACK_LEN, 1);
    track.position.set(0, 0, -(TRACK_LEN / 2 - 22));
    this.scene.add(track);

    const dotTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#eeeeee';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#ffffff';
      for (const [x, y] of [[32, 32], [96, 96]]) {
        g.beginPath();
        g.arc(x, y, 20, 0, Math.PI * 2);
        g.fill();
      }
    });
    dotTex.repeat.set(300 / GROUND_TILE, TRACK_LEN / GROUND_TILE);
    dotTex.anisotropy = maxAniso;
    this.groundTex = dotTex;
    this.groundMat = new THREE.MeshBasicMaterial({ map: dotTex, color: this.cur.ground });
    const ground = new THREE.Mesh(geo.plane, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.scale.set(300, TRACK_LEN, 1);
    ground.position.set(0, -0.06, -(TRACK_LEN / 2 - 22));
    this.scene.add(ground);

    // rounded bumpers along both edges
    this.railMat = toonUnique(this.cur.rail);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(geo.capsule, this.railMat);
      rail.rotation.x = Math.PI / 2;
      rail.scale.set(0.58, TRACK_LEN / 2 - 1, 0.58);
      rail.position.set(side * (TRACK_W / 2 + 0.2), 0.2, -(TRACK_LEN / 2 - 22));
      this.scene.add(rail);
    }
  }

  /** Switch which world we're heading to. instant=true snaps (used on restart). */
  setBiome(i, instant = false) {
    if (i !== this.biome) this.settled = false;
    this.biome = i;
    if (instant) {
      for (const k of COLOR_KEYS) this.cur[k].copy(this.targets[i][k]);
      this.space = BIOMES[i].space;
      this.settled = true;
      this.apply();
    }
  }

  biomeAt(s) {
    return biomeIndexForDistance(s - this.runStart);
  }

  /** Throw away scenery and repopulate it from `traveled` forward. */
  resetDecor(traveled) {
    for (const d of this.decor) this.scene.remove(d.obj);
    this.decor.length = 0;
    this.decorCursor = traveled - 12;
    this.fillDecor(traveled);
  }

  fillDecor(traveled) {
    const r = this.rng;
    while (this.decorCursor < traveled + SPAWN_AHEAD + 8) {
      const b = this.biomeAt(this.decorCursor);
      const list = DECOR[b];
      for (const side of [-1, 1]) {
        if (!r.chance(0.88)) continue;
        const obj = this.makeDecor(b, r.int(0, list.length - 1), r.int(0, 2));
        const x = side * r.range(6.6, 22);
        const s = this.decorCursor + r.range(-1.5, 1.5);
        obj.position.x = x;
        obj.rotation.y = r.range(-0.5, 0.5) + (side > 0 ? -0.3 : 0.3);
        obj.scale.setScalar(r.range(0.88, 1.18));
        obj.position.z = traveled - s;
        this.scene.add(obj);
        this.decor.push({ obj, s });
      }
      this.decorCursor += r.range(4.2, 7.4);
    }
  }

  /** One scenery piece = one draw call: build once per (world, kind, variant), then reuse the merged geometry. */
  decorGeometry(biome, kind, variant) {
    const key = `${biome}:${kind}:${variant}`;
    let g = this.decorGeos.get(key);
    if (!g) {
      g = bakeGroup(DECOR[biome][kind](this.rng));
      this.decorGeos.set(key, g);
    }
    return g;
  }

  makeDecor(biome, kind, variant) {
    return new THREE.Mesh(this.decorGeometry(biome, kind, variant), toonVC);
  }

  /** Every scenery variant as a bake task, current world first (see props.propBakeTasks). */
  decorBakeTasks() {
    const tasks = [];
    for (let i = 0; i < DECOR.length; i++) {
      const b = (this.biome + i) % DECOR.length;
      for (let k = 0; k < DECOR[b].length; k++) for (let v = 0; v < 3; v++) tasks.push(() => this.decorGeometry(b, k, v));
    }
    return tasks;
  }

  apply() {
    const c = this.cur;
    this.skyMat.uniforms.topColor.value.copy(c.skyTop);
    this.skyMat.uniforms.horizonColor.value.copy(c.skyHorizon);
    this.scene.fog.color.copy(c.skyHorizon);
    this.trackMat.color.copy(c.track);
    this.groundMat.color.copy(c.ground);
    this.railMat.color.copy(c.rail);
    this.sunMat.color.copy(c.sun);
    this.haloMat.color.copy(c.sun);
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.sunLight.color.copy(c.dir);
    this.starMat.opacity = this.space;
    this.cloudMat.opacity = 0.92 * (1 - this.space);
  }

  update(dt, traveled) {
    // colour blend towards the active biome (nothing to do once settled)
    if (!this.settled) {
      const k = 1 - Math.exp(-dt * BLEND_RATE);
      const tgt = this.targets[this.biome];
      let gap = Math.abs(BIOMES[this.biome].space - this.space);
      for (const key of COLOR_KEYS) {
        const c = this.cur[key];
        c.lerp(tgt[key], k);
        gap = Math.max(gap, Math.abs(c.r - tgt[key].r), Math.abs(c.g - tgt[key].g), Math.abs(c.b - tgt[key].b));
      }
      this.space += (BIOMES[this.biome].space - this.space) * k;
      if (gap < 0.002) {
        for (const key of COLOR_KEYS) this.cur[key].copy(tgt[key]);
        this.space = BIOMES[this.biome].space;
        this.settled = true;
      }
      this.apply();
    }

    // scroll textures by distance (never accumulates drift)
    this.trackTex.offset.y = (traveled / TRACK_TILE) % 1;
    this.groundTex.offset.y = (traveled / GROUND_TILE) % 1;

    // scenery
    this.fillDecor(traveled);
    for (let i = this.decor.length - 1; i >= 0; i--) {
      const d = this.decor[i];
      const z = traveled - d.s;
      if (z > DESPAWN_BEHIND + 6) {
        this.scene.remove(d.obj);
        this.decor.splice(i, 1);
      } else {
        d.obj.position.z = z;
      }
    }

    for (let i = 0; i < this.skyClouds.length; i++) {
      const c = this.skyClouds[i];
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 150) c.position.x = -150;
    }
  }
}
