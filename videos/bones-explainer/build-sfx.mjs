// Synthesises an ambient pad (assets/music.wav) and a transition/impact SFX track (assets/sfx.wav)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { total, scenes } = JSON.parse(readFileSync('timeline.json', 'utf8'));
const ff = args => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args]);
const pad = [
  '0.20*sin(2*PI*110*t)', '0.14*sin(2*PI*164.81*t)',
  '0.10*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.10*t))',
  '0.07*sin(2*PI*277.18*t)*(0.5+0.5*sin(2*PI*0.07*t))',
  '0.05*sin(2*PI*329.63*t)*(0.5+0.5*sin(2*PI*0.13*t+1))',
  '0.04*sin(2*PI*440.5*t)*(0.5+0.5*sin(2*PI*0.05*t+2))',
].join('+');
ff(['-f','lavfi','-i',`aevalsrc='${pad}':s=48000:d=${total}`,'-af',
  `lowpass=f=1400,aecho=0.8:0.7:60|120:0.25|0.18,afade=t=in:d=2.5,afade=t=out:st=${total-3.5}:d=3.5,volume=0.9`,
  '-ac','2','assets/music.wav']);
ff(['-f','lavfi','-i','anoisesrc=color=pink:d=0.8:a=0.9:r=48000','-af',
  'highpass=f=350,lowpass=f=4200,afade=t=in:d=0.45:curve=exp,afade=t=out:st=0.45:d=0.35,volume=0.9','assets/_whoosh.wav']);
ff(['-f','lavfi','-i',"aevalsrc='0.9*sin(2*PI*(58+40*exp(-12*t))*t)*exp(-7*t)':s=48000:d=0.6",'-af','lowpass=f=300','assets/_thud.wav']);
const hits = [
  ...scenes.slice(1).map(s => ({ f: 'assets/_whoosh.wav', t: s.start - 0.4 })),
  { f: 'assets/_thud.wav', t: 2.05 },
  { f: 'assets/_thud.wav', t: 33.9 }, { f: 'assets/_thud.wav', t: 36.7 }, { f: 'assets/_thud.wav', t: 39.8 },
  { f: 'assets/_thud.wav', t: 51.3 }, { f: 'assets/_thud.wav', t: 51.95 }, { f: 'assets/_thud.wav', t: 52.6 },
];
const inputs = hits.flatMap(h => ['-i', h.f]);
const filt = hits.map((h,i) => `[${i}]adelay=${Math.round(h.t*1000)}:all=1[h${i}]`).join(';') + ';' + hits.map((_,i)=>`[h${i}]`).join('') + `amix=inputs=${hits.length}:normalize=0,apad=whole_dur=${total}[out]`;
ff([...inputs, '-filter_complex', filt, '-map', '[out]', '-t', String(total), '-ar', '48000', 'assets/sfx.wav']);
console.log('ok');
