// Generic scroll snapshotter: node snap.mjs <url> <outdir> [--w 1440 --h 900 --n 10 --reduced --sheet cols]
import { chromium } from "playwright-core";
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const a = process.argv.slice(2); const url = a[0]; const out = path.resolve(a[1]);
const g = (n, d) => { const i = a.indexOf(n); return i > -1 ? a[i + 1] : d; };
const W = +g("--w", 1440), H = +g("--h", 900), N = +g("--n", 10), cols = +g("--cols", 5);
const reduced = a.includes("--reduced");
const at = g("--at", null); // comma list of scroll fractions
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: reduced ? "reduce" : "no-preference", deviceScaleFactor: 1, hasTouch: W < 700, isMobile: W < 700 });
await ctx.addInitScript(() => { Element.prototype.requestPointerLock = () => {}; Element.prototype.setPointerCapture = () => {}; });
const page = await ctx.newPage();
const errs = [], fails = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", e => errs.push("PAGEERROR " + e.message));
page.on("requestfailed", r => fails.push(r.url() + " " + (r.failure()?.errorText || "")));
page.on("response", r => { if (r.status() >= 400) fails.push(r.status() + " " + r.url()); });
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, vh: innerHeight }));
console.log("page", JSON.stringify(info), "viewport-heights:", (info.sh / info.vh).toFixed(1));
if (info.sw > info.cw + 1) console.log("!! HORIZONTAL OVERFLOW", info.sw, ">", info.cw);
const fr = at ? at.split(",").map(Number) : Array.from({ length: N }, (_, i) => i / (N - 1));
let i = 0; const files = [];
for (const f of fr) {
  const y = Math.round(total * f);
  // step toward y in increments so scroll-driven things update
  const cur = await page.evaluate(() => scrollY);
  const steps = 6; for (let s = 1; s <= steps; s++) { await page.evaluate(v => window.scrollTo(0, v), Math.round(cur + (y - cur) * s / steps)); await page.waitForTimeout(40); }
  await page.waitForTimeout(650);
  const fn = path.join(out, String(i).padStart(2, "0") + ".png"); files.push(fn);
  await page.screenshot({ path: fn }); i++;
}
console.log("errors:", errs.length ? errs : "none"); console.log("failed:", fails.length ? fails : "none");
if (g("--sheet", "1") !== "0") {
  const sw = W < 700 ? 260 : 480;
  try { execSync(`ffmpeg -y -loglevel error -pattern_type glob -i '${out}/*.png' -vf "scale=${sw}:-1,tile=${cols}x${Math.ceil(files.length / cols)}:padding=6:color=0x222222" -frames:v 1 '${out}/sheet.png'`); console.log("sheet:", out + "/sheet.png"); } catch (e) { console.log("sheet failed"); }
}
await browser.close();
