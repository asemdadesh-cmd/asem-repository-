// Shared drawing board: strokes stream live over the relay, persist on the
// server per seat, and the same canvas is shown on the easel in the studio.
import * as THREE from 'three';
import { CANVAS_H, CANVAS_W, type Stroke } from '../../shared/api-types.ts';
import type { Msg } from '../../shared/protocol.ts';
import { api, ApiFailure } from '../net/api.ts';
import type { RoomSession } from '../net/session.ts';
import { rid } from './context.ts';
import { el } from '../ui/dom.ts';

export const COLORS = ['#ff5fa2', '#ff9cc6', '#c2185b', '#e63946', '#ff8a2a', '#ffd84a', '#7fd8be', '#2ec4b6', '#4895ef', '#7b5cd6', '#6b4430', '#1d1d24', '#ffffff'];
export const SIZES = [4, 10, 22, 44];

export class DrawingBoard {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private strokes = new Map<string, Stroke>();
  epoch = 0;
  private current: Stroke | null = null;
  private sentUpTo = 0;
  private flushTimer = 0;
  private saveTimer = 0;
  color = COLORS[0];
  size = SIZES[1];
  erase = false;
  private dirtyTex = true;
  onRemoteActivity: (seat: number, x: number, y: number, on: boolean) => void = () => {};
  onChange: () => void = () => {};

  constructor(private session: RoomSession | null, private seat: 1 | 2) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.canvas.className = 'draw-canvas';
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.redraw();
  }

  private paintBackground() {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#fffaf6';
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  private drawStroke(s: Stroke, from = 0) {
    const c = this.ctx;
    const p = s.pts;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = s.erase ? '#fffaf6' : s.color;
    c.fillStyle = c.strokeStyle;
    c.lineWidth = s.size;
    if (p.length === 2) {
      c.beginPath();
      c.arc(p[0], p[1], s.size / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.beginPath();
    const start = Math.max(0, from - 2);
    c.moveTo(p[start], p[start + 1]);
    for (let i = start + 2; i < p.length - 2; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2;
      const my = (p[i + 1] + p[i + 3]) / 2;
      c.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    c.lineTo(p[p.length - 2], p[p.length - 1]);
    c.stroke();
  }

  redraw() {
    this.paintBackground();
    const list = [...this.strokes.values()].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0) || (a.id < b.id ? -1 : 1));
    for (const s of list) this.drawStroke(s);
    if (this.current) this.drawStroke(this.current);
    this.dirtyTex = true;
    this.onChange();
  }

  tick() {
    if (this.dirtyTex) {
      this.texture.needsUpdate = true;
      this.dirtyTex = false;
    }
  }

  // ---------------- local drawing
  begin(x: number, y: number) {
    this.current = { id: rid('d'), seat: this.seat, color: this.color, size: this.size, erase: this.erase, ts: Date.now(), pts: [Math.round(x), Math.round(y)] };
    this.sentUpTo = 0;
    this.drawStroke(this.current);
    this.dirtyTex = true;
    this.flushTimer = window.setInterval(() => this.flush(false), 60);
  }

  move(x: number, y: number) {
    const s = this.current;
    if (!s) return;
    const n = s.pts.length;
    if (Math.hypot(x - s.pts[n - 2], y - s.pts[n - 1]) < 2) return;
    s.pts.push(Math.round(x), Math.round(y));
    this.drawStroke(s, n - 2);
    this.dirtyTex = true;
    if (s.pts.length > 5800) this.end();
  }

  end() {
    const s = this.current;
    if (!s) return;
    clearInterval(this.flushTimer);
    this.current = null;
    this.strokes.set(s.id, s);
    this.flush(true, s);
    this.scheduleSave();
    this.redraw();
  }

  private flush(done: boolean, full?: Stroke) {
    const s = full ?? this.current;
    if (!s || !this.session) return;
    if (done) {
      this.session.send({ t: 'dr', s, done: true });
      return;
    }
    if (s.pts.length <= this.sentUpTo) return;
    const from = Math.max(0, this.sentUpTo - 2);
    this.session.send({ t: 'dr', s: { ...s, pts: s.pts.slice(from) }, done: false });
    this.sentUpTo = s.pts.length;
  }

  undo() {
    const mine = [...this.strokes.values()].filter((s) => s.seat === this.seat).sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    const last = mine[mine.length - 1];
    if (!last) return;
    this.strokes.delete(last.id);
    this.session?.send({ t: 'undo', id: last.id });
    this.scheduleSave();
    this.redraw();
  }

  async clear() {
    if (!this.session) {
      this.strokes.clear();
      this.epoch++;
      this.redraw();
      return;
    }
    const r = await api.clearCanvas(this.session.code, this.session.token);
    this.epoch = r.epoch;
    this.strokes.clear();
    this.session.send({ t: 'clear', epoch: r.epoch });
    this.redraw();
  }

  private scheduleSave() {
    if (!this.session) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.save(), 1200);
  }

  private async save() {
    const s = this.session;
    if (!s) return;
    const mine = [...this.strokes.values()].filter((x) => x.seat === this.seat);
    try {
      await api.saveCanvas(s.code, s.token, this.epoch, mine);
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 409) await this.load();
    }
  }

  async load() {
    const s = this.session;
    if (!s) return;
    try {
      const r = await api.canvas(s.code, s.token);
      const localMine = r.epoch === this.epoch ? [...this.strokes.values()].filter((x) => x.seat === this.seat) : [];
      this.epoch = r.epoch;
      this.strokes.clear();
      for (const st of r.strokes) this.strokes.set(st.id, st);
      // keep my strokes that haven't reached the server yet
      for (const st of localMine) if (!this.strokes.has(st.id)) this.strokes.set(st.id, st);
      if (localMine.length) this.scheduleSave();
      this.redraw();
    } catch {
      /* offline: keep what we have */
    }
  }

  onMsg(m: Msg) {
    if (m.t === 'dr') {
      const s = m.s;
      if (m.done) {
        this.strokes.set(s.id, s);
        this.redraw();
        this.onRemoteActivity(s.seat, 0, 0, false);
        return;
      }
      const ex = this.strokes.get(s.id);
      if (!ex) {
        this.strokes.set(s.id, { ...s, pts: [...s.pts] });
        this.drawStroke(s);
      } else {
        const n = ex.pts.length;
        // chunks overlap by one point
        const add = s.pts.slice(2);
        ex.pts.push(...add);
        this.drawStroke(ex, n - 2);
      }
      const p = s.pts;
      this.onRemoteActivity(s.seat, p[p.length - 2], p[p.length - 1], true);
      this.dirtyTex = true;
    } else if (m.t === 'undo') {
      if (this.strokes.delete(m.id)) this.redraw();
    } else if (m.t === 'clear') {
      if (m.epoch >= this.epoch) {
        this.epoch = m.epoch;
        this.strokes.clear();
        this.redraw();
      }
    }
  }

  get strokeCount() {
    return this.strokes.size;
  }

  exportPng() {
    this.canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = el('a', { href: url, download: `pink-riot-club-${new Date().toISOString().slice(0, 10)}.png` }) as HTMLAnchorElement;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }
}
