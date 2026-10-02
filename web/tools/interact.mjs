import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath:process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
await ctx.addInitScript(() => { Element.prototype.requestPointerLock = () => {}; });
const errs = []; let ok = 0, bad = 0; const t = (n, c) => { c ? ok++ : bad++; console.log((c ? "PASS " : "FAIL ") + n); };
async function open(url){ const p = await ctx.newPage(); p.on("pageerror", e=>errs.push(url+" "+e.message)); p.on("console", m=>{ if(m.type()==="error") errs.push(url+" "+m.text()); }); await p.goto("http://localhost:4500"+url); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(700); return p; }
const scrollFrac = async (p,f)=>{ const tot = await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight); for (let s=1;s<=6;s++){ await p.evaluate(v=>scrollTo(0,v), tot*f*s/6); await p.waitForTimeout(50);} await p.waitForTimeout(700); };

// Haldane: shortlist + index jump + form validation
let p = await open("/demos/haldane-rowe/");
await p.click('.save[data-ref="HR-031"]'); t("haldane shortlist count", (await p.textContent("#count")).includes("1"));
await p.click('#index a[data-i="4"]'); await p.waitForTimeout(1800);
const cur = await p.evaluate(()=>document.querySelector('#index a[aria-current="true"]')?.dataset.i); t("haldane index jump lands on item 4 (got "+cur+")", cur==="4");
await p.click('#index a[data-i="0"]'); await p.waitForTimeout(1800);
await p.click("#cta-top"); await p.waitForTimeout(1800);
await p.fill('#enq input[name="name"]', "Test"); await p.fill('#enq input[name="email"]', "bad"); await p.evaluate(()=>{ window.__nav = null; });
await p.click('#enq button[type=submit]'); await p.waitForTimeout(200);
t("haldane form rejects bad email", (await p.textContent("#note")).toLowerCase().includes("valid email"));
await p.close();

// Altura: drop
p = await open("/demos/altura/"); 
const tot = await p.evaluate(()=>{ const a=document.getElementById("roast"); return { top:a.getBoundingClientRect().top+scrollY, h:a.offsetHeight, vh:innerHeight }; });
await p.evaluate(({top,h,vh})=>scrollTo(0, top + 0.1*(h-vh) + 0.76*0.74*(h-vh)), tot); await p.waitForTimeout(900);
t("altura drop enabled after first crack", !(await p.evaluate(()=>document.getElementById("drop").disabled)));
await p.click("#drop"); await p.waitForTimeout(300);
t("altura drop sets 'Your roast'", (await p.textContent("#yours-v")).length > 0);
t("altura one lot marked", (await p.evaluate(()=>document.querySelectorAll('.lot[data-match="1"]').length))===1);
await p.click("#undo"); t("altura undo clears", (await p.textContent("#yours-v"))==="");
await p.close();

// Iron Round: clock ends 0:00, big clock appears
p = await open("/demos/iron-round/"); await scrollFrac(p, 0.97);
t("iron big clock on in last 10s", await p.evaluate(()=>document.getElementById("big-clock").classList.contains("on")));
await scrollFrac(p, 1); t("iron clock reads 0:00", (await p.textContent("#clock-v"))==="0:00"); await p.close();

// Tannour: language toggle
p = await open("/demos/tannour/"); await p.click("#lang"); await p.waitForTimeout(200);
t("tannour switches to rtl", (await p.evaluate(()=>document.documentElement.dir))==="rtl");
await p.click("#lang"); t("tannour back to ltr", (await p.evaluate(()=>document.documentElement.dir))==="ltr"); await p.close();

// Sundial: inputs
p = await open("/demos/sundial/"); const before = await p.textContent("#s-gen");
await p.evaluate(()=>{ const n=document.getElementById("n"); n.value=20; n.dispatchEvent(new Event("input",{bubbles:true})); }); await p.waitForTimeout(900);
const after = await p.textContent("#s-gen"); t("sundial generation changes with panels ("+before+" -> "+after+")", before!==after);
await p.evaluate(()=>{ const n=document.getElementById("az"); n.value=180; n.dispatchEvent(new Event("input",{bubbles:true})); }); await p.waitForTimeout(900);
const north = await p.textContent("#s-gen"); t("sundial north-facing lowers output ("+after+" -> "+north+")", parseInt(north.replace(/,/g,""))<parseInt(after.replace(/,/g,"")));
await scrollFrac(p, 1); await p.fill("#pc","nope"); await p.fill("#em","a@b.co"); await p.click('#survey button[type=submit]');
t("sundial validates postcode", (await p.textContent("#msg")).toLowerCase().includes("postcode")); await p.close();

// Agency: work switcher, form
p = await open("/"); await p.evaluate(()=>document.getElementById("work").scrollIntoView()); await p.waitForTimeout(500);
await p.click('#worklist button[data-i="3"]'); await p.waitForTimeout(300);
t("agency work selects tannour", (await p.getAttribute("#w-link","href"))==="demos/tannour/");
await p.click('#form button[type=submit]'); t("agency form requires name", (await p.textContent("#msg")).includes("name")); await p.close();

console.log("errors:", errs.length ? errs.filter(e=>!/ERR_ABORTED|404/.test(e)) : "none"); console.log(ok+" pass, "+bad+" fail");
await b.close();
