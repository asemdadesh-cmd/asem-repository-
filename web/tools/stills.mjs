import { chromium } from "playwright-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const OUT = new URL("../assets/work", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive:true });
const D = { "haldane-rowe":[0,0.02], "altura":[0,0.03], "iron-round":[0,0.02], "tannour":[0.005,0.01], "sundial":[0.36,0.36] };
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [slug,[fd,fm]] of Object.entries(D)) {
  for (const [kind, w, h, f] of [["d",1440,900,fd],["m",390,844,fm]]) {
    const c = await b.newContext({ viewport:{width:w,height:h}, hasTouch:w<700, isMobile:w<700, deviceScaleFactor: w<700 ? 2 : 1 });
    const p = await c.newPage(); await p.goto(`http://localhost:4500/demos/${slug}/`); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(900);
    const total = await p.evaluate(()=>document.documentElement.scrollHeight - innerHeight);
    const y = Math.round(total*f); for (let s=1;s<=5;s++){ await p.evaluate(v=>scrollTo(0,v), y*s/5); await p.waitForTimeout(60); } await p.waitForTimeout(900);
    const png = `${OUT}/${slug}-${kind}.png`; await p.screenshot({ path: png });
    execSync(`ffmpeg -y -loglevel error -i ${png} -vf "scale=${kind==="d"?1280:390}:-1" -c:v libwebp -quality 82 ${OUT}/${slug}-${kind}.webp && rm ${png}`);
    await c.close();
  }
}
await b.close(); console.log("ok");
