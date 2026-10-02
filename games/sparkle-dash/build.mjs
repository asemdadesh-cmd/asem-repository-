// Bundles src/main.js (+ three.js) into one classic script, dist/game.js, so
// index.html also works when double-clicked (file:// blocks ES module imports).
import { build, context } from 'esbuild';

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari14', 'firefox90'],
  outfile: 'dist/game.js',
  legalComments: 'none',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching src/ …');
} else {
  await build(options);
}
