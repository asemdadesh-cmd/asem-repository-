/* Renders the 1200×630 Open Graph card to a real PNG. Social scrapers do not
   render SVG, so this is rasterised once at build time with the same browser
   the site targets. Run: node tools/gen-og.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFile, unlink } from 'node:fs/promises';

const tmp = new URL('../_og.html', import.meta.url);
await writeFile(tmp, `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/css/fonts.css"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0A0D14;color:#EEF2F8;
       font-family:'Cairo',system-ui;display:flex;overflow:hidden;position:relative}
  .mesh{position:absolute;inset:0;background-image:
    radial-gradient(55% 60% at 15% 10%, rgba(22,104,227,.45) 0%, transparent 62%),
    radial-gradient(45% 50% at 88% 12%, rgba(103,232,249,.25) 0%, transparent 60%),
    radial-gradient(70% 60% at 55% 110%, rgba(79,176,255,.18) 0%, transparent 65%)}
  .grid{position:absolute;inset:0;background-image:
    linear-gradient(to right,#26303F 1px,transparent 1px),
    linear-gradient(to bottom,#26303F 1px,transparent 1px);
    background-size:60px 60px;opacity:.5;
    -webkit-mask-image:radial-gradient(70% 65% at 50% 40%,#000,transparent 78%)}
  .wrap{position:relative;display:flex;align-items:center;gap:56px;padding:0 72px;width:100%}
  .copy{flex:1}
  .logo{display:flex;align-items:center;gap:16px;margin-bottom:34px}
  .mark{width:64px;height:64px;border-radius:16px;
    background:linear-gradient(135deg,#1668E3,#4FB0FF 55%,#67E8F9);
    display:grid;place-items:center}
  .mark svg{width:38px;height:38px}
  .name{font-size:40px;font-weight:800;line-height:1}
  .tag{font-size:17px;color:#A7B4C8;font-weight:700}
  h1{font-size:62px;font-weight:800;line-height:1.24;letter-spacing:-.01em}
  h1 em{font-style:normal;background:linear-gradient(135deg,#4FB0FF,#67E8F9);
        -webkit-background-clip:text;color:transparent}
  p{font-size:26px;color:#A7B4C8;margin-top:22px;line-height:1.5}
  .pills{display:flex;gap:12px;margin-top:34px}
  .pill{padding:11px 22px;border:1px solid #39465C;border-radius:999px;
        font-size:19px;font-weight:700;color:#EEF2F8;background:rgba(23,30,42,.72)}
  .art{width:390px;height:390px;flex:none;display:grid;place-items:center;
       background:linear-gradient(180deg,#171E2A,#11161F);
       border:1px solid #26303F;border-radius:34px;padding:34px;
       box-shadow:0 30px 70px -20px rgba(0,0,0,.8)}
  .art img{width:100%;height:100%;object-fit:contain}
</style></head><body>
<div class="mesh"></div><div class="grid"></div>
<div class="wrap">
  <div class="copy">
    <div class="logo">
      <span class="mark"><svg viewBox="0 0 64 64"><path d="M36.5 10L20 35h10.5L26 54l17.5-26H32.5z" fill="#06121F"/></svg></span>
      <span><span class="name">برق</span><br><span class="tag">إلكترونيات ليبيا</span></span>
    </div>
    <h1>أحدث الأجهزة،<br><em>توصيل لكل ليبيا</em></h1>
    <p>ادفع عند الاستلام بعد الفحص · ضمان محلي · 22 مدينة</p>
    <div class="pills"><span class="pill">شحن مجاني فوق 1500 د.ل</span><span class="pill">إرجاع 14 يوم</span></div>
  </div>
  <div class="art"><img src="assets/img/phone-onyx.svg" alt=""></div>
</div></body></html>`);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(new URL('../_og.html', import.meta.url).href, { waitUntil: 'load' });
await p.waitForTimeout(700);
await p.screenshot({ path: new URL('../assets/img/og-cover.png', import.meta.url).pathname });
await b.close();
await unlink(tmp);
console.log('Wrote assets/img/og-cover.png (1200×630)');
