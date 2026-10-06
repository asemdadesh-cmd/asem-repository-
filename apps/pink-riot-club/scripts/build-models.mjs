// Builds the web-ready character models + animation library into public/models.
//
// Sources (not committed, see vendor-src/README in PROJECT.md):
//   vendor-src/avaturn.glb    — Avaturn avatar (non-commercial use)      → يسو
//   vendor-src/avatarsdk.glb  — Avatar SDK MetaPerson (non-commercial)    → عاصم
//   vendor-src/brunette.glb   — Ready Player Me (CC BY-NC 4.0)            → الكابتن
//     (all three from github.com/met4citizen/TalkingHead/avatars)
//   vendor-src/anim-*.glb     — Quaternius Universal Animation Library (CC0)
//     (via github.com/scottpetrovic/mesh2motion-app static/animations)
//
// Run: node scripts/build-models.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { lookAsem, lookCaptain, lookYasso } from './avatar-looks.mjs';
import { encode } from './paint-looks.mjs';

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const SRC = 'vendor-src';
const OUT = 'public/models';
mkdirSync(OUT, { recursive: true });

// Facial shapes the game drives (blink, smile, laugh, kiss, surprise, dizzy, talk).
const MORPHS = new Set([
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed',
  'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'browInnerUp', 'browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekSquintLeft', 'cheekSquintRight', 'cheekPuff',
  'mouthSmile', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthPucker', 'mouthFunnel', 'jawOpen', 'mouthOpen', 'mouthDimpleLeft', 'mouthDimpleRight',
  'viseme_aa', 'viseme_O', 'viseme_E',
]);

function keepMorphs(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    const names = mesh.getExtras()?.targetNames;
    if (!Array.isArray(names) || !names.length) continue;
    const keep = names.map((n, i) => (MORPHS.has(n) ? i : -1)).filter((i) => i >= 0);
    for (const prim of mesh.listPrimitives()) {
      prim.listTargets().forEach((t, i) => {
        if (!keep.includes(i)) prim.removeTarget(t);
      });
    }
    const w = mesh.getWeights();
    mesh.setWeights(keep.map((i) => w[i] ?? 0));
    mesh.setExtras({ ...mesh.getExtras(), targetNames: keep.map((i) => names[i]) });
  }
}

// Animation.dispose() leaves its samplers alive (pinning their accessors past prune).
function disposeAnimation(a) {
  for (const c of a.listChannels()) c.dispose();
  for (const s of a.listSamplers()) s.dispose();
  a.dispose();
}

async function finish(doc, file, texSize = 1024, volume = 'scene') {
  await doc.transform(
    dedup(),
    prune({ keepLeaves: true, keepAttributes: false }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize], quality: 82 }),
    // one quantization volume keeps a single shared skin across all body parts
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: volume }),
    prune({ keepLeaves: true, keepAttributes: false }),
  );
  await io.write(`${OUT}/${file}`, doc);
  console.log(`${file}: ${(statSync(`${OUT}/${file}`).size / 1024).toFixed(0)} KB`);
}

// ---------- avatars ----------
for (const [src, out, look] of [
  ['avaturn.glb', 'yasso.glb', lookYasso],
  ['avatarsdk.glb', 'asem.glb', lookAsem],
  ['brunette.glb', 'captain.glb', lookCaptain],
]) {
  const doc = await io.read(`${SRC}/${src}`);
  // outfits + hair are painted into the textures (see avatar-looks.mjs)
  const extra = await look(doc);
  if (extra?.kaftan) {
    const img = extra.kaftan;
    writeFileSync(`${OUT}/yasso-kaftan-look.webp`, await encode(img, 'webp', 84));
    console.log(`yasso-kaftan-look.webp: ${(statSync(`${OUT}/yasso-kaftan-look.webp`).size / 1024).toFixed(0)} KB`);
  }
  keepMorphs(doc);
  for (const a of doc.getRoot().listAnimations()) disposeAnimation(a);
  await finish(doc, out);
}

// ---------- animation library (Quaternius rig) ----------
const CLIPS = {
  'anim-base.glb': [
    'Idle_A', 'Idle_Talking', 'Idle_FoldArms', 'Walk', 'Walk_Formal', 'Jog', 'Sprint',
    'Jump_Start', 'Jump_air', 'Jump_Land', 'Swim_Fwd', 'Swim_Idle',
    'Sitting_Enter', 'Sitting_Idle', 'Sitting_Exit', 'Sitting_Talking',
    'Dance_Simple', 'Hit_Head', 'Hit_Chest', 'OverhandThrow', 'Punch_Cross', 'Yes', 'Interact', 'PickUp_Table',
  ],
  'anim-addon.glb': [
    'Walk_Female', 'Run_Female', 'Idle_Subtle', 'Idle Listening', 'Greeting', 'Victory', 'Victory Fist Pump',
    'Dance Charleston', 'Dance Body Roll', 'Dance Reach Hip', 'Dizzy', 'Head Nod', 'Reject', 'Angry',
    'Confused', 'Throw Object', 'Backflip', 'Bow', 'Jumping Jacks', 'Shivering',
  ],
  'anim-mocap.glb': ['Cheer_One_arm', 'Cheering_Two_Hands', 'Kick_Breach', 'Salute', 'Insult'],
};

const lib = await io.read(`${SRC}/anim-base.glb`);
const libRoot = lib.getRoot();
const nodeByName = new Map(libRoot.listNodes().map((n) => [n.getName(), n]));
const buf = libRoot.listBuffers()[0];

function copyAccessor(a) {
  return lib.createAccessor(a.getName()).setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(buf);
}

for (const a of libRoot.listAnimations()) if (!CLIPS['anim-base.glb'].includes(a.getName())) disposeAnimation(a);
for (const file of ['anim-addon.glb', 'anim-mocap.glb']) {
  const other = await io.read(`${SRC}/${file}`);
  for (const a of other.getRoot().listAnimations()) {
    if (!CLIPS[file].includes(a.getName())) continue;
    const na = lib.createAnimation(a.getName());
    for (const ch of a.listChannels()) {
      const target = nodeByName.get(ch.getTargetNode()?.getName());
      if (!target) continue;
      const s = ch.getSampler();
      const ns = lib.createAnimationSampler().setInput(copyAccessor(s.getInput())).setOutput(copyAccessor(s.getOutput())).setInterpolation(s.getInterpolation());
      na.addSampler(ns);
      na.addChannel(lib.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(ns));
    }
  }
}
// Only rotations matter for retargeting (plus the pelvis bob); drop the rest.
for (const a of libRoot.listAnimations()) {
  for (const ch of a.listChannels()) {
    const path = ch.getTargetPath();
    const name = ch.getTargetNode()?.getName();
    if (path === 'scale' || (path === 'translation' && name !== 'pelvis')) {
      const s = ch.getSampler();
      ch.dispose();
      s.dispose();
    }
  }
}
// Skeleton only: drop the mannequin mesh + skin, keep the joint hierarchy.
for (const n of libRoot.listNodes()) {
  n.setMesh(null);
  n.setSkin(null);
}
for (const m of libRoot.listMeshes()) m.dispose();
for (const s of libRoot.listSkins()) s.dispose();
for (const m of libRoot.listMaterials()) m.dispose();
for (const t of libRoot.listTextures()) t.dispose();
await lib.transform(resample({ tolerance: 0.0005 }));
// Rotations as normalized int16 (valid glTF; GLTFLoader expands them) halves the size.
// Samplers can share one output accessor: convert each accessor only once (a second
// pass would read the int16 values as floats and clamp them to ±1).
const quantized = new Set();
for (const a of libRoot.listAnimations()) {
  for (const ch of a.listChannels()) {
    if (ch.getTargetPath() !== 'rotation') continue;
    const out = ch.getSampler().getOutput();
    if (quantized.has(out) || out.getNormalized()) continue;
    quantized.add(out);
    const f = out.getArray();
    const q = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) q[i] = Math.round(Math.max(-1, Math.min(1, f[i])) * 32767);
    out.setArray(q).setNormalized(true);
  }
}
await finish(lib, 'anims.glb', 1024, 'mesh');
console.log('clips:', libRoot.listAnimations().length);
