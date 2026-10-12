// Evening and night lighting. Every lamp authored in SketchUp (LIGHT_ markers)
// gets a soft glow; a small pool of real point lights follows the camera to
// the nearest lamps (a fixed count, so shaders never recompile). The
// lighthouse lantern sweeps a real spot light and a visible beam over the sea.
import * as THREE from 'three';
import type { LightSpot, World } from '../world/World.ts';

const WARM = new THREE.Color('#ffc58a');
const FIRE = new THREE.Color('#ff9a4a');

export class NightLights {
  private pool: THREE.PointLight[] = [];
  private glows: THREE.Sprite[] = [];
  private spots: LightSpot[];
  private beacon: { light: THREE.SpotLight; beam: THREE.Group; pos: THREE.Vector3 } | null = null;
  private emissive: THREE.MeshStandardMaterial[] = [];
  private pools: THREE.MeshStandardMaterial[] = [];
  private night = 0;

  constructor(
    scene: THREE.Scene,
    world: World,
    count: number,
  ) {
    this.spots = world.lights.filter((l) => l.kind !== 'beacon');
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(WARM, 0, 10, 2);
      l.castShadow = false;
      scene.add(l);
      this.pool.push(l);
    }
    const tex = glowTexture();
    for (const s of this.spots) {
      const m = new THREE.SpriteMaterial({ map: tex, color: s.kind === 'fire' ? FIRE : WARM, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
      const g = new THREE.Sprite(m);
      g.position.copy(s.position);
      g.scale.setScalar(s.kind === 'fire' ? 1.1 : 0.7);
      g.renderOrder = 5;
      scene.add(g);
      this.glows.push(g);
    }
    const b = world.lights.find((l) => l.kind === 'beacon');
    if (b) this.beacon = makeBeacon(scene, b.position);
    // lamp bulbs and lenses: dim by day, bright at night
    const seen = new Set<THREE.Material>();
    world.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (seen.has(m)) continue;
        seen.add(m);
        if (/^Light/.test(m.name)) this.emissive.push(m as THREE.MeshStandardMaterial);
      }
      if (o.userData.poolLight) this.pools.push(mesh.material as THREE.MeshStandardMaterial);
    });
  }

  /** daylight: 0 night … 1 day */
  update(time: number, daylight: number, focus: THREE.Vector3) {
    this.night = 1 - THREE.MathUtils.smoothstep(daylight, 0.25, 0.85);
    const n = this.night;
    for (const m of this.emissive) m.emissiveIntensity = THREE.MathUtils.lerp(0.25, 3.4, n);
    for (const m of this.pools) m.emissiveIntensity = 0.55 * n;
    // nearest lamps get the real lights
    const order = this.spots
      .map((s, i) => ({ i, d: s.position.distanceToSquared(focus) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.pool.length);
    for (let k = 0; k < this.pool.length; k++) {
      const l = this.pool[k];
      const o = order[k];
      if (!o || n < 0.02) {
        l.intensity = 0;
        continue;
      }
      const s = this.spots[o.i];
      l.position.copy(s.position);
      const flicker = s.kind === 'fire' ? 0.82 + 0.18 * Math.sin(time * 17 + k) * Math.sin(time * 7.3 + k * 2) : 1;
      // fade with distance so lights don't pop when reassigned
      const fade = 1 - THREE.MathUtils.smoothstep(Math.sqrt(o.d), 28, 40);
      l.color.copy(s.kind === 'fire' ? FIRE : WARM);
      l.intensity = (s.kind === 'fire' ? 9 : s.indoor ? 5 : 7) * n * flicker * fade;
      l.distance = s.kind === 'fire' ? 7 : 10;
    }
    for (let i = 0; i < this.glows.length; i++) {
      const g = this.glows[i];
      const fire = this.spots[i].kind === 'fire';
      (g.material as THREE.SpriteMaterial).opacity = n * (fire ? 0.55 + 0.15 * Math.sin(time * 11 + i) : 0.5);
      g.visible = n > 0.02;
    }
    if (this.beacon) {
      const b = this.beacon;
      const a = time * ((Math.PI * 2) / 12); // one turn every 12 s
      const dir = new THREE.Vector3(Math.cos(a), -0.035, Math.sin(a));
      b.light.target.position.copy(b.pos).addScaledVector(dir, 50);
      b.light.intensity = 900 * n;
      b.beam.rotation.y = -a;
      b.beam.visible = n > 0.05;
      b.beam.children.forEach((c) => (((c as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uAlpha.value = n));
    }
  }
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBeacon(scene: THREE.Scene, pos: THREE.Vector3) {
  const light = new THREE.SpotLight('#fff1d0', 0, 140, THREE.MathUtils.degToRad(5), 0.5, 1.2);
  light.position.copy(pos);
  scene.add(light, light.target);
  // two opposed beams (a rotating lens throws light both ways)
  const beam = new THREE.Group();
  beam.position.copy(pos);
  const len = 90;
  const geo = new THREE.ConeGeometry(4.5, len, 24, 1, true).translate(0, -len / 2, 0).rotateZ(Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){ vT = clamp(position.x / ${len.toFixed(1)}, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.6);
        float a = (1.0 - vT) * (1.0 - vT) * edge * 0.22 * uAlpha;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.8) * a, a); }`,
  });
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.x = s;
    m.renderOrder = 6;
    m.frustumCulled = false;
    beam.add(m);
  }
  scene.add(beam);
  return { light, beam, pos: pos.clone() };
}
