// Compresses the SketchUp kit for the web: shared data deduplicated, vertex
// attributes quantised and meshopt-compressed (EXT_meshopt_compression; three's
// GLTFLoader decodes it with MeshoptDecoder). Node names, hierarchy and the
// extras the game relies on (colliders, markers, seats) are left untouched.
//   node scripts/optimize-models.mjs [in.glb] [out.glb]
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

const src = process.argv[2] ?? 'public/models/kit.glb';
const out = process.argv[3] ?? src;
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.WARN)).registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const before = statSync(src).size;
const doc = await io.read(src);
await doc.transform(dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
const after = statSync(out).size;
console.log(`${src} → ${out}: ${(before / 1e6).toFixed(2)} MB → ${(after / 1e6).toFixed(2)} MB`);
