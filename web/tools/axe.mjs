import { chromium } from "playwright-core"; import fs from "node:fs";
const axe = fs.readFileSync("node_modules/axe-core/axe.min.js","utf8");
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const pages = [["/",[0,0.6,0.85]],["/demos/haldane-rowe/",[0,0.5,1]],["/demos/altura/",[0,0.3,0.5,0.8,1]],["/demos/iron-round/",[0,0.3,0.6,1]],["/demos/tannour/",[0,0.4,0.7,1]],["/demos/sundial/",[0.05,0.5,0.9]]];
for (const [url, fr] of pages) {
  const p = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage(); await p.goto("http://localhost:4500"+url); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
  await p.addScriptTag({ content: axe }); const seen = new Map();
  for (const f of fr) { const tot = await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight); for (let s=1;s<=6;s++){ await p.evaluate(v=>scrollTo(0,v), tot*f*s/6); await p.waitForTimeout(40);} await p.waitForTimeout(800);
    const r = await p.evaluate(async()=> (await axe.run(document, { runOnly:["wcag2a","wcag2aa","best-practice"] })).violations.map(v=>({id:v.id, impact:v.impact, n:v.nodes.length, ex:v.nodes[0].target.join(" ").slice(0,90)})));
    r.forEach(v=>{ if(!seen.has(v.id)) seen.set(v.id, v); }); }
  console.log("== "+url); [...seen.values()].forEach(v=>console.log("  ",v.impact,v.id,"x"+v.n,v.ex));
}
await b.close();
