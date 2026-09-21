/* ==========================================================================
   Barq — SVG artwork generator
   Produces every product / category illustration used on the site. Keeping the
   art generated (rather than hand-drawn or stock) means one consistent visual
   language, tiny file sizes, crisp rendering at any DPI, and zero external
   image requests — which is most of the Lighthouse performance budget saved.
   Run: node tools/gen-art.mjs
   ========================================================================== */
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = new URL('../assets/img/', import.meta.url);

/* Shared material palette. Devices stay in neutral metals so the same asset
   reads correctly on the dark and the light theme. */
const M = {
  bodyA: '#3A4454', bodyB: '#222A38', bodyC: '#171D28',
  bezel: '#0E131B', edge: '#5C6A80', hi: '#93A1B5',
  glass1: '#1668E3', glass2: '#4FB0FF', glass3: '#67E8F9',
  warm: '#FFC04D', red: '#FF7A7A', green: '#3ED9A0',
};

const defs = (id, body = [M.bodyA, M.bodyB]) => `
  <defs>
    <linearGradient id="b${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${body[0]}"/><stop offset="1" stop-color="${body[1]}"/>
    </linearGradient>
    <linearGradient id="s${id}" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${M.glass1}"/><stop offset="0.55" stop-color="${M.glass2}"/><stop offset="1" stop-color="${M.glass3}"/>
    </linearGradient>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.03"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.14"/>
    </linearGradient>
  </defs>`;

const wrap = (id, inner, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-hidden="true" fill="none">${defs(id, body)}${inner}</svg>`;

/* — Individual device drawings. `i` is the gradient id suffix. — */
const art = {}; Object.assign(art, {
  phone: (i) => `
    <rect x="128" y="44" width="144" height="312" rx="30" fill="url(#b${i})"/>
    <rect x="128" y="44" width="144" height="312" rx="30" fill="url(#g${i})"/>
    <rect x="136" y="52" width="128" height="296" rx="24" fill="${M.bezel}"/>
    <rect x="142" y="58" width="116" height="284" rx="19" fill="url(#s${i})"/>
    <rect x="182" y="64" width="36" height="7" rx="3.5" fill="${M.bezel}" opacity="0.85"/>
    <g opacity="0.5" fill="#ffffff"><rect x="156" y="252" width="88" height="7" rx="3.5"/><rect x="156" y="270" width="60" height="7" rx="3.5"/></g>
    <circle cx="176" cy="120" r="19" fill="#ffffff" opacity="0.28"/>
    <rect x="272" y="120" width="5" height="40" rx="2.5" fill="${M.edge}"/>
    <rect x="272" y="172" width="5" height="26" rx="2.5" fill="${M.edge}"/>`,

  phoneCompact: (i) => `
    <rect x="140" y="62" width="120" height="276" rx="26" fill="url(#b${i})"/>
    <rect x="140" y="62" width="120" height="276" rx="26" fill="url(#g${i})"/>
    <rect x="147" y="69" width="106" height="262" rx="21" fill="${M.bezel}"/>
    <rect x="153" y="75" width="94" height="250" rx="16" fill="url(#s${i})"/>
    <circle cx="200" cy="86" r="5" fill="${M.bezel}"/>
    <g opacity="0.45" fill="#ffffff"><rect x="167" y="238" width="66" height="6" rx="3"/><rect x="167" y="254" width="44" height="6" rx="3"/></g>`,

  laptop: (i) => `
    <path d="M86 108a12 12 0 0 1 12-12h204a12 12 0 0 1 12 12v150H86z" fill="url(#b${i})"/>
    <path d="M86 108a12 12 0 0 1 12-12h204a12 12 0 0 1 12 12v150H86z" fill="url(#g${i})"/>
    <rect x="98" y="110" width="204" height="134" rx="6" fill="${M.bezel}"/>
    <rect x="104" y="116" width="192" height="122" rx="4" fill="url(#s${i})"/>
    <g opacity="0.55" fill="#ffffff"><rect x="120" y="136" width="86" height="8" rx="4"/><rect x="120" y="154" width="140" height="6" rx="3"/><rect x="120" y="168" width="112" height="6" rx="3"/><rect x="120" y="196" width="58" height="20" rx="10"/></g>
    <path d="M58 258h284l18 30a10 10 0 0 1-9 15H49a10 10 0 0 1-9-15z" fill="url(#b${i})"/>
    <path d="M58 258h284l18 30a10 10 0 0 1-9 15H49a10 10 0 0 1-9-15z" fill="url(#g${i})"/>
    <rect x="164" y="288" width="72" height="7" rx="3.5" fill="${M.bezel}" opacity="0.7"/>`,

  tablet: (i) => `
    <rect x="76" y="76" width="248" height="248" rx="22" fill="url(#b${i})"/>
    <rect x="76" y="76" width="248" height="248" rx="22" fill="url(#g${i})"/>
    <rect x="86" y="86" width="228" height="228" rx="15" fill="${M.bezel}"/>
    <rect x="93" y="93" width="214" height="214" rx="11" fill="url(#s${i})"/>
    <g opacity="0.5" fill="#ffffff"><rect x="113" y="120" width="96" height="9" rx="4.5"/><rect x="113" y="142" width="156" height="7" rx="3.5"/><rect x="113" y="160" width="130" height="7" rx="3.5"/><rect x="113" y="238" width="70" height="24" rx="12"/></g>`,

  tv: (i) => `
    <rect x="30" y="66" width="340" height="212" rx="12" fill="url(#b${i})"/>
    <rect x="38" y="74" width="324" height="188" rx="6" fill="${M.bezel}"/>
    <rect x="44" y="80" width="312" height="176" rx="4" fill="url(#s${i})"/>
    <g opacity="0.42" fill="#ffffff"><rect x="70" y="112" width="120" height="12" rx="6"/><rect x="70" y="138" width="190" height="8" rx="4"/><rect x="70" y="156" width="150" height="8" rx="4"/><rect x="70" y="192" width="86" height="28" rx="14"/></g>
    <rect x="30" y="66" width="340" height="212" rx="12" fill="url(#g${i})"/>
    <rect x="186" y="278" width="28" height="42" fill="${M.bodyC}"/>
    <rect x="128" y="318" width="144" height="14" rx="7" fill="url(#b${i})"/>`,

  monitor: (i) => `
    <rect x="52" y="60" width="296" height="196" rx="14" fill="url(#b${i})"/>
    <rect x="61" y="69" width="278" height="166" rx="7" fill="${M.bezel}"/>
    <rect x="67" y="75" width="266" height="154" rx="5" fill="url(#s${i})"/>
    <g opacity="0.4" fill="#ffffff"><rect x="92" y="102" width="104" height="10" rx="5"/><rect x="92" y="124" width="160" height="7" rx="3.5"/><rect x="92" y="142" width="128" height="7" rx="3.5"/></g>
    <rect x="52" y="60" width="296" height="196" rx="14" fill="url(#g${i})"/>
    <path d="M176 256h48l10 62h-68z" fill="${M.bodyC}"/>
    <rect x="132" y="314" width="136" height="16" rx="8" fill="url(#b${i})"/>`,

  headphones: (i) => `
    <path d="M96 216v-36a104 104 0 0 1 208 0v36" stroke="url(#b${i})" stroke-width="26" stroke-linecap="round"/>
    <path d="M96 210v-30a104 104 0 0 1 208 0v30" stroke="${M.hi}" stroke-width="5" stroke-linecap="round" opacity="0.4"/>
    <rect x="62" y="196" width="72" height="116" rx="30" fill="url(#b${i})"/>
    <rect x="62" y="196" width="72" height="116" rx="30" fill="url(#g${i})"/>
    <rect x="266" y="196" width="72" height="116" rx="30" fill="url(#b${i})"/>
    <rect x="266" y="196" width="72" height="116" rx="30" fill="url(#g${i})"/>
    <ellipse cx="98" cy="254" rx="21" ry="34" fill="url(#s${i})" opacity="0.9"/>
    <ellipse cx="302" cy="254" rx="21" ry="34" fill="url(#s${i})" opacity="0.9"/>`,

  earbuds: (i) => `
    <rect x="132" y="196" width="136" height="112" rx="30" fill="url(#b${i})"/>
    <rect x="132" y="196" width="136" height="112" rx="30" fill="url(#g${i})"/>
    <rect x="150" y="248" width="100" height="5" rx="2.5" fill="${M.bezel}" opacity="0.6"/>
    <rect x="178" y="286" width="44" height="6" rx="3" fill="url(#s${i})"/>
    <g><path d="M118 84a30 30 0 0 1 30 30v20a18 18 0 0 1-36 0v-20a30 30 0 0 1 6-30z" fill="url(#b${i})"/>
      <rect x="124" y="140" width="15" height="52" rx="7.5" fill="url(#b${i})"/>
      <circle cx="131" cy="112" r="11" fill="url(#s${i})"/></g>
    <g><path d="M282 84a30 30 0 0 1 30 30v20a18 18 0 0 1-36 0v-20a30 30 0 0 1 6-30z" fill="url(#b${i})"/>
      <rect x="261" y="140" width="15" height="52" rx="7.5" fill="url(#b${i})"/>
      <circle cx="294" cy="112" r="11" fill="url(#s${i})"/></g>`,

  watch: (i) => `
    <rect x="152" y="24" width="96" height="88" rx="30" fill="${M.bodyC}"/>
    <rect x="152" y="288" width="96" height="88" rx="30" fill="${M.bodyC}"/>
    <rect x="124" y="96" width="152" height="208" rx="46" fill="url(#b${i})"/>
    <rect x="124" y="96" width="152" height="208" rx="46" fill="url(#g${i})"/>
    <rect x="136" y="108" width="128" height="184" rx="38" fill="${M.bezel}"/>
    <rect x="144" y="116" width="112" height="168" rx="32" fill="url(#s${i})"/>
    <g opacity="0.7" fill="#ffffff"><rect x="166" y="162" width="68" height="16" rx="8"/><rect x="176" y="190" width="48" height="8" rx="4"/><circle cx="200" cy="228" r="16" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.75"/></g>
    <rect x="276" y="150" width="10" height="34" rx="5" fill="${M.edge}"/>`,

  camera: (i) => `
    <rect x="52" y="122" width="296" height="176" rx="26" fill="url(#b${i})"/>
    <rect x="52" y="122" width="296" height="176" rx="26" fill="url(#g${i})"/>
    <path d="M148 122l18-32h68l18 32z" fill="url(#b${i})"/>
    <circle cx="200" cy="210" r="70" fill="${M.bodyC}"/>
    <circle cx="200" cy="210" r="56" fill="${M.bezel}"/>
    <circle cx="200" cy="210" r="42" fill="url(#s${i})"/>
    <circle cx="200" cy="210" r="22" fill="${M.bezel}" opacity="0.85"/>
    <circle cx="182" cy="192" r="11" fill="#ffffff" opacity="0.4"/>
    <circle cx="308" cy="158" r="9" fill="${M.red}"/>
    <rect x="72" y="150" width="46" height="12" rx="6" fill="${M.hi}" opacity="0.35"/>`,

  console: (i) => `
    <rect x="52" y="84" width="104" height="232" rx="18" fill="url(#b${i})"/>
    <rect x="52" y="84" width="104" height="232" rx="18" fill="url(#g${i})"/>
    <rect x="70" y="108" width="68" height="7" rx="3.5" fill="url(#s${i})"/>
    <rect x="70" y="284" width="42" height="7" rx="3.5" fill="${M.bezel}" opacity="0.7"/>
    <g fill="${M.bezel}" opacity="0.45">${Array.from({ length: 7 }, (_, k) => `<rect x="${70 + k * 11}" y="140" width="5" height="120" rx="2.5"/>`).join('')}</g>
    <g transform="translate(196 168) scale(0.46)">${art.gamepad(i)}</g>`,

  gamepad: (i) => `
    <path d="M118 128h164a56 56 0 0 1 54 70l-22 86a48 48 0 0 1-88 14l-10-16h-32l-10 16a48 48 0 0 1-88-14l-22-86a56 56 0 0 1 54-70z" fill="url(#b${i})"/>
    <path d="M118 128h164a56 56 0 0 1 54 70l-22 86a48 48 0 0 1-88 14l-10-16h-32l-10 16a48 48 0 0 1-88-14l-22-86a56 56 0 0 1 54-70z" fill="url(#g${i})"/>
    <circle cx="144" cy="196" r="24" fill="${M.bezel}"/><circle cx="144" cy="196" r="14" fill="url(#s${i})"/>
    <circle cx="256" cy="196" r="24" fill="${M.bezel}"/><circle cx="256" cy="196" r="14" fill="url(#s${i})"/>
    <g fill="${M.bezel}"><rect x="286" y="180" width="18" height="18" rx="5"/><rect x="310" y="204" width="18" height="18" rx="5"/><rect x="262" y="204" width="18" height="18" rx="5"/></g>
    <rect x="186" y="172" width="28" height="9" rx="4.5" fill="url(#s${i})"/>`,

  speaker: (i) => `
    <rect x="128" y="62" width="144" height="276" rx="70" fill="url(#b${i})"/>
    <rect x="128" y="62" width="144" height="276" rx="70" fill="url(#g${i})"/>
    <rect x="144" y="90" width="112" height="140" rx="56" fill="${M.bezel}" opacity="0.6"/>
    <g fill="${M.hi}" opacity="0.3"><circle cx="172" cy="126" r="4"/><circle cx="200" cy="126" r="4"/><circle cx="228" cy="126" r="4"/><circle cx="172" cy="156" r="4"/><circle cx="200" cy="156" r="4"/><circle cx="228" cy="156" r="4"/><circle cx="172" cy="186" r="4"/><circle cx="200" cy="186" r="4"/><circle cx="228" cy="186" r="4"/></g>
    <rect x="164" y="268" width="72" height="34" rx="17" fill="url(#s${i})" opacity="0.85"/>`,

  soundbar: (i) => `
    <rect x="34" y="166" width="332" height="74" rx="24" fill="url(#b${i})"/>
    <rect x="34" y="166" width="332" height="74" rx="24" fill="url(#g${i})"/>
    <g fill="${M.hi}" opacity="0.28">${Array.from({ length: 22 }, (_, k) => `<circle cx="${64 + k * 13}" cy="188" r="3.5"/><circle cx="${64 + k * 13}" cy="206" r="3.5"/>`).join('')}</g>
    <rect x="152" y="220" width="96" height="6" rx="3" fill="url(#s${i})"/>
    <rect x="96" y="256" width="208" height="12" rx="6" fill="${M.bodyC}" opacity="0.6"/>`,

  router: (i) => `
    <rect x="94" y="222" width="212" height="72" rx="20" fill="url(#b${i})"/>
    <rect x="94" y="222" width="212" height="72" rx="20" fill="url(#g${i})"/>
    <g fill="${M.green}"><circle cx="132" cy="258" r="6"/><circle cx="156" cy="258" r="6" opacity="0.6"/></g>
    <rect x="200" y="252" width="80" height="6" rx="3" fill="url(#s${i})"/>
    <g stroke="url(#b${i})" stroke-width="15" stroke-linecap="round"><path d="M136 222l-26-96"/><path d="M200 222v-104"/><path d="M264 222l26-96"/></g>
    <g stroke="${M.glass2}" stroke-width="4" stroke-linecap="round" opacity="0.55" fill="none"><path d="M172 96a40 40 0 0 1 56 0"/><path d="M156 74a64 64 0 0 1 88 0"/></g>`,

  powerbank: (i) => `
    <rect x="128" y="86" width="144" height="228" rx="24" fill="url(#b${i})"/>
    <rect x="128" y="86" width="144" height="228" rx="24" fill="url(#g${i})"/>
    <rect x="150" y="116" width="100" height="44" rx="10" fill="${M.bezel}"/>
    <g fill="${M.green}"><rect x="160" y="130" width="15" height="16" rx="3"/><rect x="181" y="130" width="15" height="16" rx="3"/><rect x="202" y="130" width="15" height="16" rx="3"/></g>
    <rect x="223" y="130" width="15" height="16" rx="3" fill="${M.hi}" opacity="0.25"/>
    <rect x="158" y="196" width="84" height="26" rx="8" fill="${M.bezel}"/>
    <rect x="170" y="204" width="26" height="10" rx="3" fill="url(#s${i})"/>
    <rect x="206" y="204" width="26" height="10" rx="3" fill="url(#s${i})"/>
    <path d="M196 244l-22 36h18l-6 30 30-42h-18z" fill="${M.warm}"/>`,

  vacuum: (i) => `
    <circle cx="200" cy="216" r="122" fill="url(#b${i})"/>
    <circle cx="200" cy="216" r="122" fill="url(#g${i})"/>
    <circle cx="200" cy="216" r="98" fill="${M.bodyC}" opacity="0.5"/>
    <circle cx="200" cy="180" r="42" fill="${M.bezel}"/>
    <circle cx="200" cy="180" r="30" fill="url(#s${i})"/>
    <circle cx="200" cy="180" r="13" fill="${M.bezel}" opacity="0.8"/>
    <rect x="164" y="262" width="72" height="34" rx="12" fill="${M.bezel}" opacity="0.7"/>
    <g stroke="${M.hi}" stroke-width="4" opacity="0.3"><path d="M120 216h-16"/><path d="M296 216h16"/></g>`,

  fridge: (i) => `
    <rect x="98" y="34" width="204" height="332" rx="20" fill="url(#b${i})"/>
    <rect x="98" y="34" width="204" height="332" rx="20" fill="url(#g${i})"/>
    <rect x="98" y="196" width="204" height="6" fill="${M.bezel}" opacity="0.8"/>
    <rect x="272" y="86" width="9" height="82" rx="4.5" fill="${M.hi}" opacity="0.5"/>
    <rect x="272" y="228" width="9" height="82" rx="4.5" fill="${M.hi}" opacity="0.5"/>
    <rect x="124" y="64" width="80" height="54" rx="9" fill="${M.bezel}"/>
    <rect x="130" y="70" width="68" height="42" rx="6" fill="url(#s${i})"/>
    <g opacity="0.65" fill="#ffffff"><rect x="140" y="82" width="30" height="7" rx="3.5"/><rect x="140" y="95" width="46" height="5" rx="2.5"/></g>`,

  ac: (i) => `
    <rect x="46" y="130" width="308" height="94" rx="20" fill="url(#b${i})"/>
    <rect x="46" y="130" width="308" height="94" rx="20" fill="url(#g${i})"/>
    <path d="M46 202h308v10a12 12 0 0 1-12 12H58a12 12 0 0 1-12-12z" fill="${M.bezel}" opacity="0.8"/>
    <rect x="252" y="152" width="76" height="28" rx="8" fill="${M.bezel}"/>
    <rect x="258" y="158" width="64" height="16" rx="4" fill="url(#s${i})"/>
    <g stroke="${M.glass2}" stroke-width="7" stroke-linecap="round" opacity="0.5"><path d="M118 258v40"/><path d="M168 258v58"/><path d="M218 258v40"/><path d="M268 258v58"/></g>`,

  washer: (i) => `
    <rect x="80" y="52" width="240" height="300" rx="22" fill="url(#b${i})"/>
    <rect x="80" y="52" width="240" height="300" rx="22" fill="url(#g${i})"/>
    <rect x="80" y="112" width="240" height="5" fill="${M.bezel}" opacity="0.7"/>
    <circle cx="200" cy="238" r="86" fill="${M.bodyC}"/>
    <circle cx="200" cy="238" r="70" fill="${M.bezel}"/>
    <circle cx="200" cy="238" r="58" fill="url(#s${i})" opacity="0.85"/>
    <circle cx="200" cy="238" r="34" fill="${M.bezel}" opacity="0.45"/>
    <circle cx="288" cy="84" r="13" fill="${M.bezel}"/><circle cx="288" cy="84" r="6" fill="url(#s${i})"/>
    <g fill="${M.hi}" opacity="0.4"><rect x="108" y="76" width="42" height="7" rx="3.5"/><rect x="160" y="76" width="30" height="7" rx="3.5"/></g>`,

  microwave: (i) => `
    <rect x="42" y="118" width="316" height="164" rx="18" fill="url(#b${i})"/>
    <rect x="42" y="118" width="316" height="164" rx="18" fill="url(#g${i})"/>
    <rect x="62" y="138" width="204" height="124" rx="10" fill="${M.bezel}"/>
    <rect x="70" y="146" width="188" height="108" rx="6" fill="url(#s${i})" opacity="0.72"/>
    <rect x="286" y="138" width="56" height="34" rx="6" fill="${M.bezel}"/>
    <rect x="291" y="143" width="46" height="24" rx="3" fill="${M.warm}" opacity="0.8"/>
    <g fill="${M.hi}" opacity="0.4"><circle cx="300" cy="196" r="8"/><circle cx="328" cy="196" r="8"/><circle cx="300" cy="222" r="8"/><circle cx="328" cy="222" r="8"/></g>
    <rect x="286" y="246" width="56" height="16" rx="8" fill="url(#s${i})" opacity="0.7"/>`,

  keyboard: (i) => `
    <rect x="30" y="140" width="340" height="132" rx="20" fill="url(#b${i})"/>
    <rect x="30" y="140" width="340" height="132" rx="20" fill="url(#g${i})"/>
    <g fill="${M.bezel}">${Array.from({ length: 4 }, (_, r) => Array.from({ length: 12 }, (_, c) => `<rect x="${52 + c * 25}" y="${160 + r * 26}" width="20" height="20" rx="4"/>`).join('')).join('')}</g>
    <g fill="url(#s${i})" opacity="0.8"><rect x="52" y="160" width="20" height="20" rx="4"/><rect x="127" y="212" width="20" height="20" rx="4"/><rect x="252" y="186" width="20" height="20" rx="4"/><rect x="327" y="238" width="20" height="20" rx="4"/></g>`,

  mouse: (i) => `
    <path d="M200 74c50 0 78 44 78 118s-28 118-78 118-78-44-78-118S150 74 200 74z" fill="url(#b${i})"/>
    <path d="M200 74c50 0 78 44 78 118s-28 118-78 118-78-44-78-118S150 74 200 74z" fill="url(#g${i})"/>
    <path d="M200 74v74" stroke="${M.bezel}" stroke-width="5"/>
    <rect x="192" y="102" width="16" height="42" rx="8" fill="${M.bezel}"/>
    <rect x="195" y="108" width="10" height="30" rx="5" fill="url(#s${i})"/>
    <ellipse cx="200" cy="268" rx="34" ry="14" fill="url(#s${i})" opacity="0.5"/>`,

  projector: (i) => `
    <rect x="66" y="152" width="268" height="118" rx="22" fill="url(#b${i})"/>
    <rect x="66" y="152" width="268" height="118" rx="22" fill="url(#g${i})"/>
    <circle cx="140" cy="212" r="40" fill="${M.bodyC}"/>
    <circle cx="140" cy="212" r="30" fill="${M.bezel}"/>
    <circle cx="140" cy="212" r="20" fill="url(#s${i})"/>
    <g fill="${M.hi}" opacity="0.32"><rect x="216" y="186" width="84" height="8" rx="4"/><rect x="216" y="204" width="60" height="8" rx="4"/></g>
    <circle cx="298" cy="240" r="8" fill="${M.green}"/>
    <path d="M100 212L18 156v112z" fill="url(#s${i})" opacity="0.22"/>`,

  bulb: (i) => `
    <path d="M200 54a92 92 0 0 1 56 165v29a18 18 0 0 1-18 18h-76a18 18 0 0 1-18-18v-29A92 92 0 0 1 200 54z" fill="url(#s${i})" opacity="0.9"/>
    <path d="M200 54a92 92 0 0 1 56 165v29a18 18 0 0 1-18 18h-76a18 18 0 0 1-18-18v-29A92 92 0 0 1 200 54z" fill="url(#g${i})"/>
    <rect x="162" y="272" width="76" height="20" rx="8" fill="url(#b${i})"/>
    <rect x="168" y="298" width="64" height="18" rx="7" fill="url(#b${i})"/>
    <rect x="176" y="322" width="48" height="16" rx="7" fill="${M.bodyC}"/>
    <g stroke="#ffffff" stroke-width="5" opacity="0.58" stroke-linecap="round" fill="none"><path d="M182 186v-30a18 18 0 0 1 36 0v30"/><path d="M182 156c0-12 9-16 18-8s18 4 18-8"/></g>`,

  drone: (i) => `
    <g stroke="url(#b${i})" stroke-width="14" stroke-linecap="round"><path d="M138 158L86 106"/><path d="M262 158l52-52"/><path d="M138 250L86 302"/><path d="M262 250l52 52"/></g>
    <g fill="${M.glass2}" opacity="0.35"><ellipse cx="86" cy="106" rx="48" ry="9"/><ellipse cx="314" cy="106" rx="48" ry="9"/><ellipse cx="86" cy="302" rx="48" ry="9"/><ellipse cx="314" cy="302" rx="48" ry="9"/></g>
    <g fill="url(#b${i})"><circle cx="86" cy="106" r="11"/><circle cx="314" cy="106" r="11"/><circle cx="86" cy="302" r="11"/><circle cx="314" cy="302" r="11"/></g>
    <rect x="132" y="152" width="136" height="104" rx="30" fill="url(#b${i})"/>
    <rect x="132" y="152" width="136" height="104" rx="30" fill="url(#g${i})"/>
    <circle cx="200" cy="232" r="30" fill="${M.bezel}"/>
    <circle cx="200" cy="232" r="20" fill="url(#s${i})"/>
    <rect x="166" y="174" width="68" height="14" rx="7" fill="url(#s${i})" opacity="0.6"/>`,

  printer: (i) => `
    <rect x="72" y="166" width="256" height="128" rx="18" fill="url(#b${i})"/>
    <rect x="72" y="166" width="256" height="128" rx="18" fill="url(#g${i})"/>
    <rect x="120" y="78" width="160" height="88" rx="8" fill="${M.bodyC}"/>
    <rect x="132" y="90" width="136" height="64" rx="4" fill="#ffffff" opacity="0.85"/>
    <g fill="${M.bezel}" opacity="0.5"><rect x="146" y="106" width="70" height="6" rx="3"/><rect x="146" y="120" width="104" height="5" rx="2.5"/><rect x="146" y="132" width="86" height="5" rx="2.5"/></g>
    <rect x="96" y="190" width="72" height="26" rx="7" fill="${M.bezel}"/>
    <rect x="102" y="196" width="60" height="14" rx="4" fill="url(#s${i})"/>
    <rect x="120" y="250" width="160" height="20" rx="6" fill="${M.bezel}" opacity="0.7"/>
    <g fill="${M.green}"><circle cx="300" cy="202" r="7"/></g>`,

  blender: (i) => `
    <path d="M142 46h116l-14 168h-88z" fill="url(#s${i})" opacity="0.55"/>
    <path d="M142 46h116l-14 168h-88z" fill="url(#g${i})"/>
    <rect x="136" y="38" width="128" height="16" rx="8" fill="url(#b${i})"/>
    <path d="M154 214h92l10 22h-112z" fill="${M.bodyC}"/>
    <path d="M132 236h136a16 16 0 0 1 16 16v66a22 22 0 0 1-22 22H138a22 22 0 0 1-22-22v-66a16 16 0 0 1 16-16z" fill="url(#b${i})"/>
    <path d="M132 236h136a16 16 0 0 1 16 16v66a22 22 0 0 1-22 22H138a22 22 0 0 1-22-22v-66a16 16 0 0 1 16-16z" fill="url(#g${i})"/>
    <circle cx="200" cy="286" r="26" fill="${M.bezel}"/>
    <circle cx="200" cy="286" r="14" fill="url(#s${i})"/>
    <g stroke="${M.hi}" stroke-width="5" opacity="0.4" stroke-linecap="round"><path d="M172 120h56"/><path d="M176 156h48"/></g>`,
});

/* Category icon = a simplified, smaller crop of the matching device. */
const catalogue = [
  ['phone-onyx', 'phone', ['#3A4454', '#171D28']],
  ['phone-silver', 'phone', ['#9BA8BB', '#5F6C80']],
  ['phone-blue', 'phone', ['#2B5FA8', '#16304F']],
  ['phone-compact', 'phoneCompact', ['#3A4454', '#171D28']],
  ['phone-compact-sand', 'phoneCompact', ['#C2A57E', '#7A6242']],
  ['laptop-pro', 'laptop', ['#4A5464', '#242C3A']],
  ['laptop-air', 'laptop', ['#A3B0C2', '#646F80']],
  ['tablet', 'tablet', ['#3A4454', '#171D28']],
  ['tv-oled', 'tv', ['#2E3644', '#131924']],
  ['tv-qled', 'tv', ['#454F60', '#1C2331']],
  ['monitor', 'monitor', ['#39424F', '#1A202B']],
  ['headphones', 'headphones', ['#3A4454', '#171D28']],
  ['headphones-ivory', 'headphones', ['#D9DFE8', '#8E99A8']],
  ['earbuds', 'earbuds', ['#E4E9F0', '#98A3B2']],
  ['earbuds-black', 'earbuds', ['#333B49', '#141A24']],
  ['watch', 'watch', ['#3A4454', '#171D28']],
  ['watch-gold', 'watch', ['#D8B77A', '#8E7442']],
  ['camera', 'camera', ['#333B49', '#141A24']],
  ['console', 'console', ['#E8EDF4', '#A6B1C0']],
  ['gamepad', 'gamepad', ['#3A4454', '#171D28']],
  ['speaker', 'speaker', ['#3A4454', '#171D28']],
  ['soundbar', 'soundbar', ['#2E3644', '#131924']],
  ['router', 'router', ['#333B49', '#141A24']],
  ['powerbank', 'powerbank', ['#3A4454', '#171D28']],
  ['vacuum', 'vacuum', ['#333B49', '#141A24']],
  ['fridge', 'fridge', ['#9CA9BB', '#5E6A7C']],
  ['ac', 'ac', ['#E8EDF4', '#B3BECC']],
  ['washer', 'washer', ['#E8EDF4', '#B3BECC']],
  ['microwave', 'microwave', ['#39424F', '#1A202B']],
  ['keyboard', 'keyboard', ['#3A4454', '#171D28']],
  ['mouse', 'mouse', ['#333B49', '#141A24']],
  ['projector', 'projector', ['#2E3644', '#131924']],
  ['bulb', 'bulb', ['#3A4454', '#171D28']],
  ['drone', 'drone', ['#333B49', '#141A24']],
  ['printer', 'printer', ['#39424F', '#1A202B']],
  ['blender', 'blender', ['#3A4454', '#171D28']],
];

/* Brand mark: a bolt inside a rounded tile — "barq" is Arabic for lightning. */
const logoMark = (size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Barq">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1668E3"/><stop offset="0.55" stop-color="#4FB0FF"/><stop offset="1" stop-color="#67E8F9"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="16" fill="url(#lg)"/>
  <path d="M36.5 10L20 35h10.5L26 54l17.5-26H32.5z" fill="#06121F"/>
</svg>`;

await mkdir(OUT, { recursive: true });

let n = 0;
for (const [name, kind, body] of catalogue) {
  const id = String(n++);
  await writeFile(new URL(`${name}.svg`, OUT), wrap(id, art[kind](id), body));
}
await writeFile(new URL('../../favicon.svg', OUT), logoMark(64));
await writeFile(new URL('logo.svg', OUT), logoMark(34));

console.log(`Wrote ${catalogue.length} product illustrations + logo + favicon.`);
