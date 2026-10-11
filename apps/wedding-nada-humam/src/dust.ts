/** Gold dust drifting upward like candle-lit motes, plus a burst when the seal breaks. */

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  tw: number;
  life: number; // < 0 = ambient (forever); otherwise frames left
}

export interface Dust {
  burst(x: number, y: number): void;
}

export function startDust(canvas: HTMLCanvasElement, reduced: boolean): Dust {
  const ctx = canvas.getContext('2d');
  if (!ctx || reduced) return { burst() {} };

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const sc = sprite.getContext('2d')!;
  const g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,246,214,1)');
  g.addColorStop(0.3, 'rgba(214,170,80,.7)');
  g.addColorStop(1, 'rgba(190,140,50,0)');
  sc.fillStyle = g;
  sc.fillRect(0, 0, 32, 32);

  let w = 0;
  let h = 0;
  let dpr = 1;
  const motes: Mote[] = [];

  const ambient = (y?: number): Mote => ({
    x: Math.random() * w,
    y: y ?? Math.random() * h,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(0.08 + Math.random() * 0.25),
    r: 0.8 + Math.random() * 2,
    a: 0.2 + Math.random() * 0.45,
    tw: Math.random() * Math.PI * 2,
    life: -1,
  });

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const want = Math.max(12, Math.min(34, Math.round((w * h) / 26000)));
    const amb = motes.filter((m) => m.life < 0);
    if (amb.length < want) for (let i = amb.length; i < want; i++) motes.push(ambient());
    else if (amb.length > want) {
      let extra = amb.length - want;
      for (let i = motes.length - 1; i >= 0 && extra > 0; i--) if (motes[i].life < 0) (motes.splice(i, 1), extra--);
    }
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let raf = 0;
  const frame = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.x += m.vx;
      m.y += m.vy;
      m.tw += 0.03;
      let alpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
      if (m.life >= 0) {
        m.vy += 0.035;
        m.vx *= 0.985;
        m.life--;
        alpha = m.a * Math.min(1, m.life / 40);
        if (m.life <= 0) {
          motes.splice(i, 1);
          continue;
        }
      } else if (m.y < -10) {
        Object.assign(m, ambient(h + 10));
      }
      const s = m.r * 4;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });

  return {
    burst(x, y) {
      for (let i = 0; i < 70; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 4.5;
        motes.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 2,
          r: 0.8 + Math.random() * 2.2,
          a: 0.6 + Math.random() * 0.4,
          tw: 0,
          life: 50 + Math.random() * 70,
        });
      }
    },
  };
}
