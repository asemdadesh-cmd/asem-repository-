import * as THREE from 'three';

export const PALETTE = {
  pink: '#ff7eb6',
  pinkSoft: '#ffc2dd',
  cream: '#fff4e6',
  mint: '#a8e6cf',
  mintDeep: '#7fd8be',
  turquoise: '#2ec4b6',
  aqua: '#5fd3e6',
  horizon: '#ffd9cf',
  skyTop: '#86d6e8',
  fog: '#ffe1d8',
};

/** Gradient sky dome with a soft sun glow. */
export function createSky(sunDir: THREE.Vector3): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color('#ffc8dc') },
      horizon: { value: new THREE.Color(PALETTE.horizon) },
      sunDir: { value: sunDir.clone().normalize() },
      sunColor: { value: new THREE.Color('#fff1d6') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.75, h));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 600.0) * 1.6 + pow(s, 24.0) * 0.25 + pow(s, 4.0) * 0.08);
        if (vDir.y < 0.0) c = mix(c, horizon * 0.95, smoothstep(0.0, -0.2, vDir.y));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 20), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

/** Fluffy billboard clouds. */
export function createClouds(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const x = 50 + i * 20 + Math.sin(i * 3) * 10;
    const y = 70 + Math.cos(i * 2) * 12;
    const r = 30 + Math.sin(i * 7) * 12;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: '#fff3f6', opacity: 0.9 });
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(mat);
    const a = (i / 14) * Math.PI * 2 + Math.sin(i) * 0.3;
    const r = 260 + (i % 3) * 60;
    s.position.set(Math.cos(a) * r, 70 + (i % 4) * 18, Math.sin(a) * r);
    const sc = 90 + (i % 5) * 25;
    s.scale.set(sc * 2, sc, 1);
    g.add(s);
  }
  return g;
}
