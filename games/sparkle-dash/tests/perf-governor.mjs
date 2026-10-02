// Unit tests for the frame-rate governor (plain Node, no browser needed).
//   node tests/perf-governor.mjs
import assert from 'node:assert/strict';
import { PerfGovernor, snapInterval, qualityLevels } from '../src/perf.js';

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log('PASS ', name); } catch (e) { failed++; console.log('FAIL ', name, '\n      ', e.message); }
};

/** Feed `seconds` of frames. intervalFn(i) -> ms. Returns the governor. */
function run(gov, seconds, intervalFn, startMs = 0) {
  let t = startMs, i = 0;
  while (t - startMs < seconds * 1000) {
    const ms = intervalFn(i++);
    t += ms;
    gov.sample(ms, t);
  }
  return t;
}

test('snapInterval recognises standard refresh rates', () => {
  assert.equal(Math.round(1000 / snapInterval(8.4)), 120);
  assert.equal(Math.round(1000 / snapInterval(16.5)), 60);
  assert.equal(Math.round(1000 / snapInterval(6.9)), 144);
  assert.equal(snapInterval(12.2), null);   // between 90 and 75 Hz: not a standard rate
});

test('qualityLevels: phone dpr 3 is capped per mode and strictly descending', () => {
  assert.equal(qualityLevels(3, 'auto')[0], 1.75);
  assert.equal(qualityLevels(3, 'smooth')[0], 1.25);
  assert.equal(qualityLevels(3, 'sharp')[0], 2.5);
  const l = qualityLevels(3, 'auto');
  assert.ok(l.every((v, i) => i === 0 || v < l[i - 1]) && l.at(-1) >= 0.72);
  assert.deepEqual(qualityLevels(1, 'auto'), [1, 0.8]);
});

test('steady 120 Hz: detected, never degrades', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 5, onStepDown: () => steps++ });
  run(g, 60, () => 1000 / 120);
  assert.equal(steps, 0);
  assert.equal(Math.round(g.refreshHz), 120);
});

test('steady 60 Hz display: no false alarm', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 5, onStepDown: () => steps++ });
  run(g, 60, () => 1000 / 60);
  assert.equal(steps, 0);
  assert.equal(Math.round(g.refreshHz), 60);
});

test('120 Hz panel but GPU-bound (~90 fps): steps down once the panel rate is seen', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 5, onStepDown: () => steps++ });
  // vsync quantises to 8.33 / 16.67: mix gives ~11 ms mean
  const mix = (i) => (i % 3 === 2 ? 1000 / 60 : 1000 / 120) * 1.0;
  const t = run(g, 8, mix);
  assert.ok(steps >= 1, 'expected a step down, got ' + steps);
  // after the step the GPU keeps up: no further steps
  const before = steps;
  run(g, 30, () => 1000 / 120, t);
  assert.equal(steps, before);
});

test('slow 60 Hz device (25 ms frames): keeps stepping down to the last level, never past it', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 3, onStepDown: () => steps++ });
  run(g, 60, () => 25);
  assert.equal(steps, 2);
  assert.equal(g.level, 2);
});

test('very slow device (12 fps, 85 ms frames) is still detected and stepped down', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 4, onStepDown: () => steps++ });
  run(g, 60, () => 85);
  assert.equal(steps, 3);
});

test('a single long hitch (tab switch) does not trigger a step down', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 5, onStepDown: () => steps++ });
  const t = run(g, 5, () => 1000 / 120);
  g.sample(900, t + 900);
  run(g, 10, () => 1000 / 120, t + 900);
  assert.equal(steps, 0);
});

test('occasional dropped frames at 120 Hz (2 %) are tolerated', () => {
  let steps = 0;
  const g = new PerfGovernor({ levels: 5, onStepDown: () => steps++ });
  run(g, 60, (i) => (i % 50 === 0 ? 1000 / 60 : 1000 / 120));
  assert.equal(steps, 0);
});

process.exit(failed ? 1 : 0);
