import { chromium } from "playwright-core";
const [,, name, qs = "", w = "1536", h = "1024"] = process.argv; const [page_, ...rest] = name.split(":"); 
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport:{width:+w,height:+h} })).newPage();
p.on("console", m => { if (m.type()==="error") console.log("ERR", m.text()); }); p.on("pageerror", e => console.log("PAGEERR", e.message));
await p.goto(`http://localhost:4600/${page_}.html?${qs}&w=${w}&h=${h}`); await p.waitForFunction("window.__done", null, { timeout: 170000 });
await p.locator("canvas").screenshot({ path: `out/${rest[0] || page_}.png` }); await b.close(); console.log("ok");
