import { chromium } from "playwright-core"; import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const OUT = new URL("../assets/work", import.meta.url).pathname; const TMP = "/tmp/northlight-clips"; fs.mkdirSync(TMP, { recursive:true });
const DUR = { "haldane-rowe":[20,20], "altura":[30,30], "iron-round":[17,17], "tannour":[22,22], "sundial":[18,18] };
const only = process.argv[2];
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--use-gl=swiftshader","--enable-unsafe-swiftshader"] });
for (const [slug,[dd,dm]] of Object.entries(DUR)) {
  if (only && only !== slug) continue;
  for (const [kind, w, h, dur] of [["d",1280,800,dd],["m",390,844,dm]]) {
    const dir = `${TMP}/${slug}-${kind}`; fs.rmSync(dir, { recursive:true, force:true });
    const c = await b.newContext({ viewport:{width:w,height:h}, hasTouch:w<700, isMobile:w<700, recordVideo:{ dir, size:{width:w,height:h} } });
    const p = await c.newPage(); await p.goto(`http://localhost:4500/demos/${slug}/`); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1200);
    await p.evaluate((dur) => new Promise(res => { const total = document.documentElement.scrollHeight - innerHeight; const t0 = performance.now();
      (function step(now){ const t = Math.min(1, (now - t0) / (dur*1000)); const e = t < .04 ? 0 : (t - .04) / .96; scrollTo(0, total * e); t < 1 ? requestAnimationFrame(step) : setTimeout(res, 600); })(t0); }), dur);
    await c.close();
    const f = fs.readdirSync(dir).find(x => x.endsWith(".webm"));
    const vf = kind === "d" ? "scale=960:-2,fps=20" : "scale=390:-2,fps=24";
    execSync(`ffmpeg -y -loglevel error -i ${dir}/${f} -vf "${vf}" -c:v libx264 -crf ${kind==="d"?32:30} -preset slow -pix_fmt yuv420p -movflags +faststart -an ${OUT}/${slug}-${kind}.mp4`);
    console.log(slug, kind, (fs.statSync(`${OUT}/${slug}-${kind}.mp4`).size/1024).toFixed(0)+" KB");
  }
}
await b.close();
