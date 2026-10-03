import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({ viewport:{width:1200,height:630} })).newPage();
await p.goto("http://localhost:4500/"); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1000);
await p.screenshot({ path:"/tmp/northlight-og.png" }); await b.close();
