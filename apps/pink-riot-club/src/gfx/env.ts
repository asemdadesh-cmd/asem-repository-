// Image-based lighting: a soft beach-sunrise sky (CC0 HDRI, sun clamped; see
// scripts/build-env.mjs) prefiltered for PBR. Falls back to a flat pink sky.
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

let hdr: Promise<THREE.DataTexture> | null = null;
function loadHdr(): Promise<THREE.DataTexture> {
  if (!hdr) {
    hdr = new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}models/env-sunrise.hdr`);
    hdr.catch(() => (hdr = null));
  }
  return hdr;
}

/** Instant fallback: a flat pink/mint sky. */
export function flatEnvironment(renderer: THREE.WebGLRenderer, top = '#ffdbe6', ground = '#9fe3c0'): THREE.Texture {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.background = new THREE.Color(top);
  s.add(new THREE.HemisphereLight('#fff6f0', ground, 2.6));
  const t = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return t;
}

/** Sets a flat environment right away, then swaps in the HDRI once it loads. */
export function applyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.85) {
  scene.environment = flatEnvironment(renderer);
  void loadHdr()
    .then((tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromEquirectangular(tex).texture;
      pm.dispose();
      scene.environment?.dispose();
      scene.environment = env;
      scene.environmentIntensity = intensity;
    })
    .catch(() => {
      /* keep the flat sky */
    });
}
