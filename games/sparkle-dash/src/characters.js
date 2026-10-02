// Procedural cute critters built from primitives (no model files to download).
// Models face +z (front toward the title camera); gameplay turns them around.
import * as THREE from 'three';
import { geo, toon, add, pivot } from './gfx.js';

const EYE = '#2b2140';

const SPECS = {
  bunny: { body: '#fffafc', belly: '#ffe0ec', head: '#fffafc', limb: '#fffafc', cheek: '#ffa6c4', nose: '#ff7aa2' },
  kitty: { body: '#ffae4d', belly: '#fff1dc', head: '#ffae4d', limb: '#fff1dc', cheek: '#ff9eb5', nose: '#ff7a9a' },
  panda: { body: '#ffffff', belly: '#f1eff8', head: '#ffffff', limb: '#38334a', cheek: '#ff9eb5', nose: '#38334a' },
  dino:  { body: '#62dc88', belly: '#fff0a8', head: '#62dc88', limb: '#62dc88', cheek: '#ff9eb5', nose: '#2f9e5a' },
};

function buildBase(id) {
  const o = SPECS[id];
  const root = new THREE.Group();
  const squash = pivot(root);                 // scale pivot at the feet
  const upper = pivot(squash);                // everything that bobs while running
  const rig = { id, root, squash, upper, ears: [], tail: null, blinkT: 2 + Math.random() * 2, locked: false };

  add(upper, geo.hiSphere, o.body, [0, 0.62, 0], [0.55, 0.58, 0.5]);
  add(upper, geo.sphere, o.belly, [0, 0.58, 0.3], [0.38, 0.4, 0.2]);

  const head = (rig.head = pivot(upper, 0, 1.3, 0));
  add(head, geo.hiSphere, o.head, [0, 0, 0], [0.66, 0.6, 0.6]);

  // eyes (each is a pivot so blinking can squash it)
  rig.eyes = [-1, 1].map((side) => {
    const e = pivot(head, side * 0.24, 0.06, 0.5);
    add(e, geo.sphere, '#ffffff', [0, 0, 0], 0.15);
    add(e, geo.sphere, EYE, [0, -0.005, 0.09], 0.085);
    add(e, geo.sphere, '#ffffff', [-0.025, 0.03, 0.165], 0.028);
    return e;
  });
  // cheeks, nose, smile
  for (const side of [-1, 1]) add(head, geo.sphere, o.cheek, [side * 0.4, -0.13, 0.43], [0.1, 0.07, 0.04]);
  add(head, geo.sphere, o.nose, [0, -0.04, 0.6], [0.06, 0.045, 0.04]);
  add(head, geo.arc, EYE, [0, -0.1, 0.585], [0.085, 0.085, 0.4], [0, 0, Math.PI]);

  // arms swing from the shoulder, feet from the hip
  rig.arms = [-1, 1].map((side) => {
    const a = pivot(upper, side * 0.5, 0.9, 0);
    add(a, geo.sphere, o.limb, [0, -0.15, 0], [0.13, 0.21, 0.13]);
    return a;
  });
  rig.feet = [-1, 1].map((side) => {
    const f = pivot(squash, side * 0.24, 0.11, 0.06);
    add(f, geo.sphere, o.limb, [0, 0, 0.08], [0.17, 0.11, 0.24]);
    return f;
  });

  EXTRAS[id](rig, o);
  return rig;
}

const EXTRAS = {
  bunny(rig, o) {
    for (const side of [-1, 1]) {
      const ear = pivot(rig.head, side * 0.27, 0.52, -0.02);
      ear.rotation.z = -side * 0.18;
      add(ear, geo.capsule, o.body, [0, 0.38, 0], [0.26, 0.44, 0.2]);
      add(ear, geo.capsule, '#ffb3cf', [0, 0.38, 0.06], [0.15, 0.34, 0.1]);
      rig.ears.push({ pivot: ear, baseZ: ear.rotation.z, side });
    }
    for (const side of [-1, 1]) add(rig.head, geo.box, '#ffffff', [side * 0.032, -0.2, 0.575], [0.06, 0.085, 0.02]);
    add(rig.upper, geo.sphere, '#ffffff', [0, 0.46, -0.5], 0.21);
  },
  kitty(rig, o) {
    for (const side of [-1, 1]) {
      const ear = pivot(rig.head, side * 0.4, 0.45, 0);
      ear.rotation.z = -side * 0.4;
      add(ear, geo.cone4, o.body, [0, 0.17, 0], [0.22, 0.38, 0.15], [0, Math.PI / 4, 0]);
      add(ear, geo.cone4, '#ffb3c6', [0, 0.14, 0.05], [0.12, 0.26, 0.07], [0, Math.PI / 4, 0]);
      rig.ears.push({ pivot: ear, baseZ: ear.rotation.z, side });
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        add(rig.head, geo.cyl, '#7a5240', [side * 0.55, -0.06 - i * 0.055, 0.4], [0.011, 0.3, 0.011], [0, side * 0.6, Math.PI / 2 + side * (i - 1) * 0.22]);
      }
    }
    for (let i = -1; i <= 1; i++) add(rig.head, geo.sphere, '#e0791d', [i * 0.11, 0.5, 0.3], [0.035, 0.1, 0.02], [-0.9, 0, i * 0.15]);
    // curly tail: chain of puffs wagging from the hip
    const tail = pivot(rig.upper, 0, 0.5, -0.45);
    [[0, 0.08, -0.12, 0.12], [0, 0.26, -0.26, 0.115], [0, 0.5, -0.32, 0.11], [0, 0.74, -0.27, 0.105]].forEach(([x, y, z, r], i) =>
      add(tail, geo.sphere, i === 3 ? '#fff1dc' : o.body, [x, y, z], r));
    rig.tail = tail;
  },
  panda(rig, o) {
    for (const side of [-1, 1]) {
      const ear = pivot(rig.head, side * 0.44, 0.48, -0.02);
      add(ear, geo.sphere, '#38334a', [0, 0.05, 0], [0.18, 0.18, 0.1]);
      rig.ears.push({ pivot: ear, baseZ: 0, side });
      add(rig.head, geo.sphere, '#38334a', [side * 0.24, 0.05, 0.44], [0.17, 0.22, 0.1], [0, 0, side * 0.45]);
    }
    add(rig.upper, geo.sphere, '#ffffff', [0, 0.46, -0.5], 0.17);
  },
  dino(rig, o) {
    const SP = '#ffb347';
    add(rig.head, geo.cone, SP, [0, 0.62, -0.1], [0.13, 0.28, 0.13], [-0.25, 0, 0]);
    add(rig.head, geo.cone, SP, [0, 0.52, -0.34], [0.12, 0.24, 0.12], [-0.7, 0, 0]);
    add(rig.upper, geo.cone, SP, [0, 0.98, -0.36], [0.15, 0.32, 0.15], [-0.5, 0, 0]);
    add(rig.upper, geo.cone, SP, [0, 0.72, -0.5], [0.15, 0.32, 0.15], [-1.0, 0, 0]);
    add(rig.upper, geo.cone, SP, [0, 0.46, -0.52], [0.14, 0.28, 0.14], [-1.25, 0, 0]);
    for (const side of [-1, 1]) add(rig.head, geo.sphere, o.nose, [side * 0.07, -0.02, 0.6], 0.025);
    const yaw = pivot(rig.upper, 0, 0.42, -0.42);
    const tilt = pivot(yaw);
    tilt.rotation.x = -Math.PI / 2 + 0.4;
    add(tilt, geo.cone, o.body, [0, 0.5, 0], [0.26, 1.0, 0.26]);
    add(tilt, geo.cone, SP, [0, 0.9, 0], [0.09, 0.2, 0.09]);
    rig.tail = yaw;
  },
};

/** Flat dark silhouette for not-yet-unlocked friends. */
function silhouette(rig) {
  const m = toon('#3b3166');
  rig.root.traverse((n) => { if (n.isMesh) n.material = m; });
  rig.locked = true;
}

export function createCharacter(id, { locked = false } = {}) {
  const rig = buildBase(id);
  if (locked) silhouette(rig);
  return rig;
}

const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Pose the character. mode: 'run' | 'air' | 'idle' | 'cheer'
 * t = seconds, k = run-cycle speed factor
 */
export function animateCharacter(c, t, dt, mode, k = 1) {
  const footL = c.feet[0], footR = c.feet[1];
  const armL = c.arms[0], armR = c.arms[1];
  const s = Math.sin(t * 11 * k);
  const cs = Math.cos(t * 11 * k);
  let bob = 0;
  let armPitch = 0;
  let armSplay = 0.12;
  let earPitch = -0.2;

  if (mode === 'run') {
    footL.position.set(-0.24, 0.11 + Math.max(0, cs) * 0.22, 0.06 + s * 0.3);
    footR.position.set(0.24, 0.11 + Math.max(0, -cs) * 0.22, 0.06 - s * 0.3);
    bob = Math.abs(s) * 0.11;
    armPitch = s;
    earPitch = -0.45 + Math.sin(t * 22 * k) * 0.18;
    c.head.rotation.z = Math.sin(t * 5.5 * k) * 0.05;
  } else if (mode === 'air') {
    footL.position.set(-0.24, 0.3, 0.2);
    footR.position.set(0.24, 0.2, -0.12);
    armPitch = -2.5;
    armSplay = 0.45;
    earPitch = -0.95;
    c.head.rotation.z = 0;
  } else if (mode === 'cheer') {
    footL.position.set(-0.24, 0.11 + Math.max(0, s) * 0.12, 0.06);
    footR.position.set(0.24, 0.11 + Math.max(0, -s) * 0.12, 0.06);
    armPitch = -2.7 + Math.sin(t * 14) * 0.35;
    armSplay = 0.5;
    earPitch = -0.1 + Math.sin(t * 14) * 0.2;
    c.head.rotation.z = Math.sin(t * 7) * 0.12;
  } else {
    footL.position.set(-0.24, 0.11, 0.06);
    footR.position.set(0.24, 0.11, 0.06);
    bob = Math.sin(t * 2.4) * 0.015;
    armPitch = Math.sin(t * 2.4) * 0.12;
    earPitch = -0.08 + Math.sin(t * 2 + 1) * 0.07;
    c.head.rotation.z = Math.sin(t * 1.3) * 0.06;
  }

  c.upper.position.y = lerp(c.upper.position.y, bob, Math.min(1, dt * 30));
  armL.rotation.x = lerp(armL.rotation.x, -armPitch, Math.min(1, dt * 25));
  armR.rotation.x = lerp(armR.rotation.x, armPitch, Math.min(1, dt * 25));
  armL.rotation.z = -armSplay;
  armR.rotation.z = armSplay;

  for (let i = 0; i < c.ears.length; i++) {
    const p = c.ears[i].pivot;
    p.rotation.x = lerp(p.rotation.x, earPitch, Math.min(1, dt * 18));
  }

  if (c.tail) {
    c.tail.rotation.y = Math.sin(t * (mode === 'run' ? 8 : 3.5)) * 0.4;
    if (c.id === 'kitty') c.tail.rotation.x = Math.sin(t * 2.2) * 0.12 + (mode === 'run' ? -0.35 : 0);
  }

  // blink
  c.blinkT -= dt;
  const blink = c.blinkT < 0.12 && c.blinkT > 0 ? 0.1 : 1;
  if (c.blinkT <= 0) c.blinkT = 2 + Math.random() * 2.5;
  c.eyes[0].scale.y = blink;
  c.eyes[1].scale.y = blink;
}
