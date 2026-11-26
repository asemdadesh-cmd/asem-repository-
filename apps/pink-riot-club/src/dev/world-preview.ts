import * as THREE from 'three';
import { World } from '../world/World.ts';
import { buildCharacter } from '../characters/roster.ts';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const world = new World('high');
const pm = new THREE.PMREMGenerator(renderer);
world.scene.environment = pm.fromScene(new (class extends THREE.Scene {
  constructor() {
    super();
    this.background = new THREE.Color('#ffd9e6');
    this.add(new THREE.HemisphereLight('#ffffff', '#a8e6cf', 3));
  }
})(), 0.04).texture;
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
const [px, py, pz, tx, ty, tz] = (q.get('cam') ?? '0,60,70,0,0,0').split(',').map(Number);
cam.position.set(px, py, pz);
cam.lookAt(tx, ty, tz);
world.focus(new THREE.Vector3(tx, 0, tz));
if (q.get('chars')) {
  const ids = q.get('chars')!.split(',');
  ids.forEach((id, i) => {
    const r = buildCharacter(id as never);
    r.root.position.set(tx + i * 1.2 - (ids.length - 1) * 0.6, world.groundAt(tx, tz), tz);
    world.scene.add(r.root);
    for (let k = 0; k < 30; k++) r.update(1 / 60, { speed: 0, mode: 'ground' });
  });
}
world.update(3, 0.016);
document.fonts.ready.then(() => {
  setTimeout(() => {
    renderer.render(world.scene, cam);
    const info = renderer.info.render;
    let meshes = 0;
    world.scene.traverse((o) => ((o as THREE.Mesh).isMesh ? meshes++ : 0));
    const per: Record<string, number> = {};
    world.scene.children.forEach((c, i) => {
      let n = 0;
      let t = 0;
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible) {
          n++;
          const g = m.geometry;
          t += (g.index ? g.index.count : g.attributes.position.count) / 3 * ((m as THREE.InstancedMesh).count ?? 1);
        }
      });
      if (n > 3 || t > 20000) per[`${i}:${c.type}:${c.name || (c as THREE.Mesh).material?.constructor?.name || ''}:${c.userData.characterId ?? ''}`] = n * 1e6 + Math.round(t);
    });
    console.warn(JSON.stringify(Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} meshes=${Math.floor(v / 1e6)} tris=${v % 1e6}`)));
    console.warn(`calls=${info.calls} tris=${info.triangles} meshes=${meshes} programs=${renderer.info.programs?.length} textures=${renderer.info.memory.textures} geos=${renderer.info.memory.geometries}`);
    (window as unknown as { __ready: boolean }).__ready = true;
  }, 1500);
});
