import * as THREE from 'three';
import { CHARACTERS, metaFor } from '../characters/roster.ts';
import type { CharacterId } from '../../shared/api-types.ts';
import type { CharacterRig } from '../characters/rig.ts';
import { isSkinned, preloadCharacter, skinnedReady } from '../characters/skinned.ts';
import { makeRig } from '../game/Avatar.ts';
import { el } from './dom.ts';
import { applyEnvironment } from '../gfx/env.ts';

/** Starts downloading every skinned avatar (shared promises; safe to call often). */
export function preloadAllCharacters(): Promise<boolean[]> {
  return Promise.all(CHARACTERS.filter((c) => isSkinned(c.id)).map((c) => preloadCharacter(c.id)));
}

const thumbCache = new Map<CharacterId, string>();
const thumbSkinned = new Set<CharacterId>();

function studioScene(): { scene: THREE.Scene; env: THREE.Texture | null } {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff4f8', '#c8f0dc', 1.5));
  const key = new THREE.DirectionalLight('#fff0e0', 2.4);
  key.position.set(2, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffd0ea', 1.4);
  rim.position.set(-3, 2, -3);
  scene.add(rim);
  return { scene, env: null };
}

function envFor(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.background = new THREE.Color('#ffe3ee');
  s.add(new THREE.HemisphereLight('#ffffff', '#bdeedd', 3));
  const t = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return t;
}

/** Renders portrait thumbnails (cached as data URLs); skinned ones re-render once loaded. */
export function renderThumbnails(ids: CharacterId[] = CHARACTERS.map((c) => c.id)): Map<CharacterId, string> {
  const todo = ids.filter((id) => !thumbCache.has(id) || (isSkinned(id) && skinnedReady(id) && !thumbSkinned.has(id)));
  if (!todo.length) return thumbCache;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(200, 250, false);
  r.setPixelRatio(1);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  const { scene } = studioScene();
  scene.environment = envFor(r);
  const cam = new THREE.PerspectiveCamera(26, 200 / 250, 0.05, 50);
  for (const id of todo) {
    const c = metaFor(id);
    const rig = makeRig(c.id);
    if (rig.skinned) thumbSkinned.add(c.id);
    rig.root.rotation.y = 0.35;
    for (let i = 0; i < 20; i++) rig.update(1 / 60, { speed: 0, mode: 'ground' });
    scene.add(rig.root);
    const h = rig.height;
    cam.position.set(0, h * 0.62, h * 1.85 + 0.9);
    cam.lookAt(0, h * 0.55, 0);
    r.render(scene, cam);
    thumbCache.set(c.id, r.domElement.toDataURL('image/png'));
    rig.dispose();
  }
  r.dispose();
  r.forceContextLoss();
  return thumbCache;
}

class Preview {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  rig: CharacterRig | null = null;
  private id: CharacterId | null = null;
  private raf = 0;
  private last = performance.now();
  private t = 0;
  private dragging = false;
  private yaw = 0.3;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = studioScene().scene;
    applyEnvironment(this.renderer, this.scene, 0.8);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffd3e6', roughness: 1 }));
    this.scene.add(ground);
    let lx = 0;
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      lx = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.yaw += (e.clientX - lx) * 0.012;
      lx = e.clientX;
    });
    canvas.addEventListener('pointerup', () => (this.dragging = false));
    this.loop();
  }

  set(id: CharacterId) {
    this.id = id;
    this.rig?.dispose();
    this.rig = makeRig(id);
    this.scene.add(this.rig.root);
    if (isSkinned(id) && !this.rig.skinned) void preloadCharacter(id).then((ok) => ok && this.id === id && !this.rig?.skinned && this.set(id));
    this.rig.play('wave');
    const h = this.rig.height;
    this.cam.position.set(0, h * 0.62, h * 1.7 + 1.1);
    this.cam.lookAt(0, h * 0.5, 0);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.t += dt;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * this.renderer.getPixelRatio()) || this.canvas.height !== Math.round(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.cam.aspect = w / Math.max(h, 1);
      this.cam.updateProjectionMatrix();
    }
    if (this.rig) {
      if (!this.dragging) this.yaw += dt * 0.35;
      this.rig.root.rotation.y = Math.sin(this.yaw) * 0.6;
      this.rig.update(dt, { speed: 0, mode: 'ground' });
      if (Math.floor(this.t / 6) !== Math.floor((this.t - dt) / 6)) this.rig.play((['laugh', 'dance', 'wave', 'celebrate'] as const)[Math.floor(this.t / 6) % 4]);
    }
    this.renderer.render(this.scene, this.cam);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export interface LobbyOptions {
  inviteCode: string | null;
  error?: string;
  onCreate: (name: string, ch: CharacterId) => Promise<void>;
  onJoin: (code: string, name: string, ch: CharacterId) => Promise<void>;
}

function readPref(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export function savePrefs(name: string, ch: CharacterId) {
  try {
    localStorage.setItem('prc:name', name);
    localStorage.setItem('prc:char', ch);
  } catch {
    /* ignore */
  }
}

export function defaultNameFor(ch: CharacterId): string {
  return ch === 'asem' ? 'عاصم' : ch === 'yasso' || ch === 'yasso-kaftan' ? 'يسو' : '';
}

export function characterGrid(selected: CharacterId, onPick: (id: CharacterId) => void): HTMLElement {
  // portraits are pre-rendered (scripts/render-thumbs.mjs); render live only if one is missing
  const thumb = (id: CharacterId) => {
    const img = el('img', { src: `${import.meta.env.BASE_URL}thumbs/${id}.webp`, alt: metaFor(id).name, width: 200, height: 250, decoding: 'async' }) as HTMLImageElement;
    img.addEventListener('error', () => {
      const src = renderThumbnails([id]).get(id);
      if (src) img.src = src;
    }, { once: true });
    return img;
  };
  const grid = el('div', { class: 'chars', role: 'group', 'aria-label': 'ختار الشخصية' });
  for (const c of CHARACTERS) {
    const b = el(
      'button',
      { class: 'char', 'aria-pressed': String(c.id === selected), 'data-id': c.id, title: c.title, onclick: () => {
        grid.querySelectorAll('.char').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        onPick(c.id);
      } },
      thumb(c.id),
      el('b', {}, c.name),
    );
    grid.append(b);
  }
  return grid;
}

export function showLobby(o: LobbyOptions): () => void {
  let ch = (readPref('prc:char') as CharacterId) || 'yasso';
  if (!CHARACTERS.some((c) => c.id === ch)) ch = 'yasso';
  const root = el('div', { id: 'lobby' });
  const hearts = el('div', { class: 'hearts', 'aria-hidden': 'true' });
  for (let i = 0; i < 16; i++) {
    const s = el('span', { style: `left:${(i * 37) % 100}%;animation-duration:${9 + (i % 5) * 2}s;animation-delay:${-i * 1.3}s` }, ['💗', '🌸', '⚽', '💦', '🎨', '🦫', '🧸'][i % 7]);
    hearts.append(s);
  }
  const nameInput = el('input', { class: 'input', id: 'name', maxlength: 20, autocomplete: 'nickname', placeholder: 'سميتك', value: readPref('prc:name') ?? defaultNameFor(ch) }) as HTMLInputElement;
  const codeInput = el('input', { class: 'input code-input', id: 'code', maxlength: 6, placeholder: 'ABC123', 'aria-label': 'كود الغرفة', value: o.inviteCode ?? '', autocapitalize: 'characters', autocomplete: 'off' }) as HTMLInputElement;
  const err = el('p', { class: 'err', role: 'alert' }, o.error ?? '');
  const canvas = el('canvas', { 'aria-label': 'معاينة الشخصية' });
  const info = el('div', { class: 'preview-info' });
  const setInfo = (id: CharacterId) => {
    const m = metaFor(id);
    info.replaceChildren(el('div', { class: 't' }, m.title), el('b', {}, m.name), el('p', {}, m.blurb));
  };
  const preview = new Preview(canvas);
  preview.set(ch);
  setInfo(ch);
  const grid = characterGrid(ch, (id) => {
    const prevDefault = defaultNameFor(ch);
    ch = id;
    preview.set(id);
    setInfo(id);
    const nd = defaultNameFor(id);
    if (nd && (!nameInput.value.trim() || nameInput.value.trim() === prevDefault)) nameInput.value = nd;
  });

  const busy = (b: boolean) => root.querySelectorAll('button.btn').forEach((x) => ((x as HTMLButtonElement).disabled = b));
  const go = async (fn: () => Promise<void>) => {
    const name = nameInput.value.trim();
    if (!name) {
      err.textContent = 'كتب سميتك أولا 🙏';
      nameInput.focus();
      return;
    }
    err.textContent = '';
    busy(true);
    savePrefs(name, ch);
    try {
      await fn();
    } catch (e) {
      const msg = (e as { code?: string; message?: string }).code;
      err.textContent =
        msg === 'room-full'
          ? 'الغرفة عامرة — فيها جوج ديجا 😅'
          : msg === 'room-not-found'
            ? 'ما لقيناش هاد الكود… تأكد منو 🔍'
            : msg === 'bad-code'
              ? 'الكود خاصو 6 حروف/أرقام'
              : 'مشكل فالاتصال… عاود جرب 🔁';
      busy(false);
    }
  };

  const createBtn = el('button', { class: 'btn', onclick: () => go(() => o.onCreate(nameInput.value.trim(), ch)) }, 'صايب غرفة جديدة ✨');
  const joinBtn = el('button', { class: 'btn teal', onclick: () => go(() => o.onJoin(codeInput.value.trim().toUpperCase(), nameInput.value.trim(), ch)) }, 'دخل 🔑');
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });

  const right = el(
    'div',
    { class: 'card' },
    o.inviteCode ? el('div', { class: 'invite-banner' }, '💌 صاحبك عرض عليك! الكود: ', el('span', { style: 'direction:ltr;letter-spacing:.15em' }, o.inviteCode)) : null,
    el('div', { class: 'field' }, el('label', { for: 'name' }, 'شنو سميتك؟'), nameInput, el('div', { class: 'name-chips' }, ...['يسو', 'عاصم'].map((n) => el('button', { type: 'button', onclick: () => (nameInput.value = n) }, n)))),
    el('h3', {}, 'ختار الشخصية ديالك'),
    grid,
    el(
      'div',
      { class: 'actions' },
      o.inviteCode ? el('div', { class: 'join-row' }, codeInput, joinBtn) : createBtn,
      o.inviteCode ? el('button', { class: 'btn ghost', onclick: () => go(() => o.onCreate(nameInput.value.trim(), ch)) }, 'لا، صايب غرفة جديدة') : el('div', { class: 'join-row' }, codeInput, joinBtn),
    ),
    err,
  );
  const left = el('div', { class: 'card' }, el('div', { class: 'preview-wrap' }, canvas, info));
  root.append(
    hearts,
    el(
      'div',
      { class: 'wrap' },
      el('header', { class: 'hero' }, el('h1', {}, 'نادي التخربيق'), el('div', { class: 'en' }, 'PINK RIOT CLUB'), el('p', {}, 'عالم وردي صغير على البحر: كورة، مسبح، رسم، وضحك بزاف. جيب صاحبك والعبو بجوج 💗')),
      el('div', { class: 'lobby-grid' }, left, right),
      el('p', { class: 'foot' }, 'عاصم 🇱🇾 × يسو 🇲🇦 — صُنع بالحب والتخربيق'),
    ),
  );
  document.body.append(root);
  if (!o.inviteCode) nameInput.focus({ preventScroll: true });
  return () => {
    preview.dispose();
    root.remove();
  };
}
