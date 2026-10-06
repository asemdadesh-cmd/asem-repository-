// Procedural canvas textures (fabric, embroidery, fur, tiles…). Cached.
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
export let maxAnisotropy = 4;
export function setMaxAnisotropy(n: number) {
  maxAnisotropy = n;
}

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number], srgb = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAnisotropy;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

// deterministic PRNG so textures look the same every load
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amt, 0, 1));
  return `#${c.getHexString()}`;
}

/** Soft woven fabric. */
export function fabric(base: string, opts: { weave?: number; speck?: number; seed?: number } = {}) {
  const weave = opts.weave ?? 0.06;
  const speck = opts.speck ?? 0.04;
  return make(`fabric:${base}:${weave}:${speck}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(opts.seed ?? 7);
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(255,255,255,${weave * (0.5 + 0.5 * Math.sin(y * 1.7))})`;
      ctx.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      ctx.fillStyle = `rgba(0,0,0,${weave * 0.6 * (0.5 + 0.5 * Math.cos(x * 1.3))})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${speck})` : `rgba(0,0,0,${speck})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
    }
  }, [4, 4]);
}

/** Satin with soft vertical sheen bands and optional gold pinstripes. */
export function satin(base: string, stripe?: string) {
  return make(`satin:${base}:${stripe}`, 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? shade(base, 0.04) : shade(base, -0.03));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (stripe) {
      for (let i = 0; i < 4; i++) {
        const x = (i + 0.5) * (w / 4);
        ctx.fillStyle = stripe;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x - 5, 0, 10, h);
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x - 1.5, 0, 3, h);
        ctx.globalAlpha = 1;
      }
    }
    const r = rng(11);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.04})`;
      ctx.fillRect(r() * w, r() * h, 1, 3 + r() * 6);
    }
  }, [2, 2]);
}

/** Moroccan embroidered trim (vertical band, repeats along V). */
export function embroideryTrim(base: string, thread: string, accent = '#7a5230') {
  return make(`emb:${base}:${thread}:${accent}`, 128, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // braided edges
    for (const x of [8, w - 8]) {
      for (let y = 0; y < h; y += 10) {
        ctx.strokeStyle = thread;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y + 5);
        ctx.lineTo(x - 5, y + 10);
        ctx.stroke();
      }
    }
    // scrolls
    ctx.lineCap = 'round';
    for (let y = 0; y < h; y += 64) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w / 2 - 14, y + 20, 14, Math.PI * 0.2, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2 + 14, y + 46, 14, Math.PI * 1.2, Math.PI * 2.7);
      ctx.stroke();
      ctx.strokeStyle = thread;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.bezierCurveTo(w / 2 + 30, y + 16, w / 2 - 30, y + 48, w / 2, y + 64);
      ctx.stroke();
      ctx.fillStyle = thread;
      for (const [dx, dy] of [[-22, 34], [22, 30], [0, 32]]) {
        ctx.beginPath();
        ctx.arc(w / 2 + dx, y + dy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [1, 1]);
}

/** Black-on-black Libyan jacket embroidery (rich scroll pattern). */
export function libyanJacket() {
  return make('libyan-jacket', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.02})`;
      ctx.fillRect(r() * w, r() * h, 1, 1);
    }
    ctx.lineCap = 'round';
    for (let y = -32; y < h + 64; y += 96) {
      for (let x = -32; x < w + 64; x += 128) {
        ctx.strokeStyle = 'rgba(70,70,78,0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 40, y - 30, x + 80, y + 50, x + 120, y + 10);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 60, y + 18, 16, 0, Math.PI * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 60, y + 18, 7, Math.PI, Math.PI * 2.8);
        ctx.stroke();
      }
    }
  }, [2, 2]);
}

/** Furry texture: thousands of short strokes. */
export function fur(base: string, seed = 3, length = 7) {
  return make(`fur:${base}:${seed}:${length}`, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed);
    ctx.lineCap = 'round';
    for (let i = 0; i < 14000; i++) {
      const x = r() * w;
      const y = r() * h;
      const a = Math.PI / 2 + (r() - 0.5) * 0.9;
      const l = length * (0.5 + r());
      ctx.strokeStyle = r() > 0.5 ? shade(base, 0.08 + r() * 0.08) : shade(base, -0.06 - r() * 0.08);
      ctx.globalAlpha = 0.35 + r() * 0.4;
      ctx.lineWidth = 1 + r() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [2, 2]);
}

/** Silky hair: fine strands with a soft sheen band. */
export function hairTex(base: string, seed = 9) {
  return make(`hair:${base}:${seed}`, 256, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const band = ctx.createLinearGradient(0, 0, 0, h);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.22, 'rgba(255,160,180,0.10)');
    band.addColorStop(0.32, 'rgba(255,190,200,0.16)');
    band.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 700; i++) {
      const x = r() * w;
      ctx.strokeStyle = r() > 0.55 ? shade(base, 0.04 + r() * 0.06) : shade(base, -0.06);
      ctx.globalAlpha = 0.2 + r() * 0.45;
      ctx.lineWidth = 0.6 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.33, x + (r() - 0.5) * 20, h * 0.66, x + (r() - 0.5) * 16, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [3, 1]);
}

/** Football jersey: mesh dots + big number. */
export function jersey(base: string, trim: string, number: string) {
  return make(`jersey:${base}:${trim}:${number}`, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6)
      for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) {
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(x, y, 2, 2);
      }
    // side panels (lathe u: 0 = front, 0.25 = left side, 0.5 = back)
    ctx.fillStyle = trim;
    ctx.fillRect(w * 0.25 - 13, 0, 26, h);
    ctx.fillRect(w * 0.75 - 13, 0, 26, h);
    // numbers on the back (u≈0.5) and a small one on the front (u≈0)
    ctx.font = 'bold 150px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = (cx: number, size: number, mirror: boolean) => {
      ctx.save();
      ctx.translate(cx, h * 0.42);
      if (mirror) ctx.scale(-1, 1); // lathe u runs right-to-left on the back
      ctx.font = `bold ${size}px system-ui, sans-serif`;
      ctx.lineWidth = size / 14;
      ctx.strokeStyle = trim;
      ctx.strokeText(number, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(number, 0, 0);
      ctx.restore();
    };
    num(w * 0.5, 150, true);
    // small chest number straddles the u=0/1 seam at the front
    num(0, 64, false);
    num(w, 64, false);
  });
}

/** Eye iris with pupil + catchlight. */
export function iris(color: string, pupil = '#120a0a', slit = false) {
  return make(`iris:${color}:${slit}`, 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
    g.addColorStop(0, shade(color, 0.15));
    g.addColorStop(0.6, color);
    g.addColorStop(0.92, shade(color, -0.25));
    g.addColorStop(1, '#1a0f0f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    const r = rng(4);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
      ctx.lineTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110);
      ctx.stroke();
    }
    ctx.fillStyle = pupil;
    ctx.beginPath();
    if (slit) ctx.ellipse(cx, cy, 18, 80, 0, 0, Math.PI * 2);
    else ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(cx - 40, cy - 44, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 34, cy + 36, 9, 0, Math.PI * 2);
    ctx.fill();
  }, undefined, true);
}

/** Dizzy spiral eye. */
export function spiralEye() {
  return make('spiral-eye', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b1b2b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.1) {
      const rr = 3 + a * 2.6;
      const x = w / 2 + Math.cos(a) * rr;
      const y = h / 2 + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

/** Blush gradient disc (alpha). */
export function blush(color = '#ff6f8f') {
  return make(`blush:${color}`, 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,111,143,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Moroccan zellige star tiles. */
export function zellige(colors = ['#2ec4b6', '#ff7eb6', '#fff4e6', '#7fd8be'], key = 'a') {
  return make(`zellige:${key}`, 512, 512, (ctx, w, h) => {
    const s = w / 4;
    ctx.fillStyle = colors[2];
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const cx = x * s + s / 2;
        const cy = y * s + s / 2;
        ctx.save();
        ctx.translate(cx, cy);
        // 8-point star
        ctx.fillStyle = colors[(x + y) % 2 ? 0 : 1];
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const rr = i % 2 ? s * 0.22 : s * 0.42;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = colors[3];
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(80,60,60,0.35)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x * s, y * s, s, s);
      }
  });
}

export function poolTiles() {
  return make('pool-tiles', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5fd3e6';
    ctx.fillRect(0, 0, w, h);
    const s = 32;
    const r = rng(2);
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        ctx.fillStyle = `hsl(${185 + r() * 10}, 70%, ${62 + r() * 10}%)`;
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i <= w; i += s) {
      ctx.fillRect(i - 1, 0, 2, h);
      ctx.fillRect(0, i - 1, w, 2);
    }
  });
}

export function grass() {
  return make('grass', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9fe2bf';
    ctx.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 9000; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.strokeStyle = r() > 0.5 ? 'rgba(80,170,120,0.35)' : 'rgba(220,255,230,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5);
      ctx.stroke();
    }
  }, [24, 24]);
}

export function pitchGrass() {
  return make('pitch', 512, 512, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#7fd8a6' : '#8fe3b3';
      ctx.fillRect(i * (w / 8), 0, w / 8, h);
    }
    const r = rng(8);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(40,120,80,0.12)' : 'rgba(255,255,255,0.1)';
      ctx.fillRect(r() * w, r() * h, 1, 2);
    }
  }, [1, 1]);
}

export function sand() {
  return make('sand', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f7d9cf';
    ctx.fillRect(0, 0, w, h);
    const r = rng(33);
    for (let i = 0; i < 26000; i++) {
      const v = r();
      ctx.fillStyle = v > 0.6 ? 'rgba(255,255,255,0.35)' : v > 0.3 ? 'rgba(200,140,140,0.18)' : 'rgba(255,190,200,0.25)';
      ctx.fillRect(r() * w, r() * h, 1.2, 1.2);
    }
  }, [18, 18]);
}

export function wood(base = '#c99a74') {
  return make(`wood:${base}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let y = 0; y < h; y += 32) {
      ctx.fillStyle = 'rgba(80,40,20,0.25)';
      ctx.fillRect(0, y, w, 2);
      for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = `rgba(90,50,30,${0.08 + r() * 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const yy = y + 4 + r() * 24;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 6, w * 0.6, yy + (r() - 0.5) * 6, w, yy);
        ctx.stroke();
      }
    }
  });
}

export function plaster(base = '#fff1e6') {
  return make(`plaster:${base}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(190,140,120,0.08)';
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, r() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [2, 2]);
}

/** Canvas texture with Arabic text (sign boards, labels). Not cached. */
export function textTexture(lines: { text: string; font: string; color: string; y: number }[], w: number, h: number, bg?: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (bg) bg(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  for (const l of lines) {
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, w / 2, l.y);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAnisotropy;
  return t;
}
