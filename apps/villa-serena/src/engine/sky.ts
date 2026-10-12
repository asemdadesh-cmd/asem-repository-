// Physically based sky (Preetham), sun + moon lights, fog and the image-based
// lighting derived from the same sky, all driven by a time of day.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export interface SkyState {
  hours: number; // 0..24
  sunDir: THREE.Vector3; // towards the sun
  daylight: number; // 0 (night) .. 1 (full day)
  golden: number; // 0..1, strongest at sunrise/sunset
}

const SUN_WARM = new THREE.Color('#ffb46b');
const SUN_NOON = new THREE.Color('#fff4e6');
const MOON = new THREE.Color('#9fb6ff');

export class Atmosphere {
  readonly sky = new Sky();
  readonly sun = new THREE.DirectionalLight('#ffffff', 3);
  readonly hemi = new THREE.HemisphereLight('#cfe0ff', '#b49a7a', 0.35);
  readonly state: SkyState = { hours: 18.2, sunDir: new THREE.Vector3(), daylight: 1, golden: 0 };
  readonly fog: THREE.FogExp2;
  private stars: THREE.Points;
  private pmrem: THREE.PMREMGenerator;
  private envScene = new THREE.Scene();
  private envSky = new Sky();
  private envRT: THREE.WebGLRenderTarget | null = null;
  private lastEnvHours = -99;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
  ) {
    this.sky.scale.setScalar(4000);
    this.sky.name = 'sky';
    const u = this.sky.material.uniforms;
    u.turbidity.value = 3.2;
    u.rayleigh.value = 1.35;
    u.mieCoefficient.value = 0.0045;
    u.mieDirectionalG.value = 0.82;
    scene.add(this.sky);
    this.envSky.scale.setScalar(100);
    Object.assign(this.envSky.material.uniforms, {});
    this.envScene.add(this.envSky);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 2.5;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -42;
    sc.right = sc.top = 42;
    sc.near = 1;
    sc.far = 260;
    sc.updateProjectionMatrix();
    scene.add(this.sun, this.sun.target, this.hemi);

    this.fog = new THREE.FogExp2('#c9d6dd', 0.0016);
    scene.fog = this.fog;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.stars = makeStars();
    scene.add(this.stars);
  }

  /** Sun direction for a time of day (sets in the south-west over the sea):
   *  a late-summer day, sun up at ~6:50 and down at ~19:15, highest at 13:00. */
  static sunDirection(hours: number, out: THREE.Vector3): THREE.Vector3 {
    const day = (hours - 6.5) / 13; // 0 and 1: the sun 4° below the horizon
    const elev = Math.sin(day * Math.PI) * THREE.MathUtils.degToRad(58) - THREE.MathUtils.degToRad(4);
    const az = THREE.MathUtils.degToRad(-100 + day * 165); // east (−x) through south (+z) to south-west
    return out.set(Math.cos(elev) * Math.sin(-az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
  }

  setTime(hours: number) {
    const s = this.state;
    s.hours = ((hours % 24) + 24) % 24;
    Atmosphere.sunDirection(s.hours, s.sunDir);
    const el = s.sunDir.y;
    s.daylight = THREE.MathUtils.smoothstep(el, -0.12, 0.12);
    s.golden = THREE.MathUtils.smoothstep(el, -0.05, 0.05) * (1 - THREE.MathUtils.smoothstep(el, 0.12, 0.42));
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(s.sunDir);
    u.rayleigh.value = THREE.MathUtils.lerp(1.2, 2.2, s.golden);
    u.turbidity.value = THREE.MathUtils.lerp(3, 5.5, s.golden);
    this.envSky.material.uniforms.sunPosition.value.copy(s.sunDir);
    this.envSky.material.uniforms.rayleigh.value = u.rayleigh.value;
    this.envSky.material.uniforms.turbidity.value = u.turbidity.value;
    this.envSky.material.uniforms.mieCoefficient.value = u.mieCoefficient.value;
    this.envSky.material.uniforms.mieDirectionalG.value = 0.7;

    // key light: the sun by day, a cool moon by night
    if (el > -0.08) {
      this.sun.color.copy(SUN_NOON).lerp(SUN_WARM, s.golden * 0.85 + (1 - s.daylight) * 0.6);
      this.sun.intensity = 3.2 * THREE.MathUtils.smoothstep(el, -0.06, 0.1);
    } else {
      this.sun.color.copy(MOON);
      this.sun.intensity = 0.55;
    }
    this.hemi.intensity = THREE.MathUtils.lerp(0.12, 0.2, s.daylight);
    this.hemi.color.set(s.daylight > 0.5 ? '#d6e4ff' : '#3a4a78');
    // fog matches the horizon colour
    const fogDay = new THREE.Color('#cfdbe2').lerp(new THREE.Color('#f2c7a0'), s.golden);
    const fogNight = new THREE.Color('#0d1424');
    this.fog.color.copy(fogNight).lerp(fogDay, s.daylight);
    // like an eye or a camera: stop down under a high sun, open up at dusk and at night
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(0.95, 0.8, s.daylight) - 0.22 * THREE.MathUtils.smoothstep(el, 0.25, 0.85) + s.golden * 0.04;
    (this.stars.material as THREE.PointsMaterial).opacity = 1 - s.daylight;
    this.stars.visible = s.daylight < 0.98;
    if (Math.abs(s.hours - this.lastEnvHours) > 0.25) this.refreshEnvironment();
  }

  /** Re-bakes the image-based lighting from the current sky (cheap: ~2 ms). */
  refreshEnvironment() {
    this.lastEnvHours = this.state.hours;
    const prev = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 200);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.3, 0.5, this.state.daylight);
    prev?.dispose();
  }

  /** Keeps the shadow frustum on the area around `focus`. */
  follow(focus: THREE.Vector3) {
    const d = this.state.sunDir.y > -0.08 ? this.state.sunDir : moonDir;
    // snap to shadow texels to avoid shimmering while walking
    const texel = (2 * 42) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.set(fx + d.x * 120, focus.y + Math.max(0.15, d.y) * 120, fz + d.z * 120);
    this.stars.position.copy(focus);
  }
}

const moonDir = new THREE.Vector3(0.3, 0.75, -0.4).normalize();

function makeStars(): THREE.Points {
  const n = 1800;
  const pos = new Float32Array(n * 3);
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const y = Math.abs(u) * 0.95 + 0.05;
    pos.set([r * Math.cos(t) * 1500, y * 1500, r * Math.sin(t) * 1500], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.name = 'stars';
  p.frustumCulled = false;
  return p;
}
