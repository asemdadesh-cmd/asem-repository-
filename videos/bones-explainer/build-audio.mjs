// Lays out narration lines on a timeline, writes timeline.json + assets/narration.wav
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const LEAD = 0.7, LINE_GAP = 0.3, SCENE_GAP = 0.8, TAIL = 2.2;
const dur = f => parseFloat(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', f]).toString());
const lines = readFileSync('script.tsv','utf8').trim().split('\n').map(l => { const [scene,n,text] = l.split('\t'); return { scene:+scene, n, text, file:`assets/vo/l${n}.wav` }; });
let t = LEAD, prev = null;
for (const l of lines) {
  if (prev) t += prev.scene === l.scene ? LINE_GAP : SCENE_GAP;
  l.start = +t.toFixed(3); l.dur = +dur(l.file).toFixed(3); t += l.dur; prev = l;
}
const total = +(t + TAIL).toFixed(2);
// scene boundaries: scene starts ~0.45s before its first line (transition lands before the voice)
const scenes = [];
for (const l of lines) if (!scenes.find(s => s.id === l.scene)) scenes.push({ id: l.scene, start: l.scene === 1 ? 0 : +(l.start - 0.45).toFixed(2) });
scenes.forEach((s, i) => s.end = i < scenes.length - 1 ? scenes[i+1].start : total);
writeFileSync('timeline.json', JSON.stringify({ total, scenes, lines }, null, 2));
// mix narration
const inputs = lines.flatMap(l => ['-i', l.file]);
const filt = lines.map((l,i) => `[${i}]adelay=${Math.round(l.start*1000)}:all=1[a${i}]`).join(';') + ';' + lines.map((_,i)=>`[a${i}]`).join('') + `amix=inputs=${lines.length}:normalize=0,apad=whole_dur=${total}[out]`;
execFileSync('ffmpeg', ['-y','-v','error',...inputs,'-filter_complex',filt,'-map','[out]','-t',String(total),'-ar','48000','assets/narration.wav']);
console.log('total', total, scenes);
