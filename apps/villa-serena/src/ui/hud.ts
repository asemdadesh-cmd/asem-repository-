// In-game interface: context hints, partner name tags with off-screen arrows,
// room status + invite, travel, time of day, settings, help, touch controls.
import type { Action } from '../player/input.ts';

export interface Hint {
  key: string;
  label: string;
  action: Action;
}

export interface Tag {
  id: string;
  name: string;
  x: number;
  y: number;
  onScreen: boolean;
  behind: boolean;
  dist: number;
}

export interface TravelSpot {
  id: string;
  label: string;
}

export type Panel = 'menu' | 'travel' | 'help';
export type HudMode = 'foot' | 'seat' | 'drive' | 'carry' | 'swim';

export interface HudCallbacks {
  action(a: Action): void;
  emote(i: number): void;
  travel(id: string): void;
  travelSpots(): TravelSpot[];
  time(h: number, cycle: boolean): void;
  volume(v: number, muted: boolean): void;
  quality(q: 'high' | 'low'): void;
  invite(): string | null;
  leave(): void;
  sprint(on: boolean): void;
}

const EMOTES = [
  ['👋', 'Wave'],
  ['💃', 'Dance'],
  ['🎉', 'Cheer'],
  ['🙇', 'Bow'],
  ['🤸', 'Backflip'],
  ['👍', 'Nod'],
] as const;

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: Array<Node | string>): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids) e.append(c);
  return e;
};

export class Hud {
  readonly root: HTMLElement;
  private hints: HTMLElement;
  private tags = new Map<string, HTMLElement>();
  private tagLayer: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  private roomEl: HTMLElement;
  private panels = new Map<Panel, HTMLElement>();
  private touch: HTMLElement;
  private primary: HTMLButtonElement;
  private secondary: HTMLButtonElement;
  private kick: HTMLButtonElement;
  private lastHints = '';
  private mode: HudMode = 'foot';
  cb!: HudCallbacks;
  time = 18.5;
  cycle = false;

  constructor(parent: HTMLElement, private mobile: boolean) {
    this.root = h('div', { id: 'hud', class: mobile ? 'touch' : 'desktop' });
    parent.append(this.root);

    // top bar
    this.roomEl = h('div', { class: 'room chip', role: 'status', 'aria-live': 'polite' });
    const brand = h('div', { class: 'brand' }, h('span', { class: 'brand-name' }, 'Villa Serena'));
    const left = h('div', { class: 'top-left' }, brand, this.roomEl);
    const btn = (icon: string, label: string, fn: () => void) => {
      const b = h('button', { class: 'icon-btn', 'aria-label': label, title: label }, icon);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      return b;
    };
    const right = h(
      'div',
      { class: 'top-right' },
      btn('📍', 'Travel (M)', () => this.toggle('travel')),
      btn('⚙️', 'Settings (Esc)', () => this.toggle('menu')),
      btn('?', 'Controls (H)', () => this.toggle('help')),
    );
    this.root.append(left, right);

    // hints + toast + tags
    this.hints = h('div', { class: 'hints', 'aria-live': 'polite' });
    this.toastEl = h('div', { class: 'toast', role: 'status' });
    this.tagLayer = h('div', { class: 'tags', 'aria-hidden': 'true' });
    this.root.append(this.tagLayer, this.hints, this.toastEl);

    // emotes (desktop: a row of keys; touch: a tray)
    const emotes = h('div', { class: 'emotes', role: 'toolbar', 'aria-label': 'Emotes' });
    EMOTES.forEach(([icon, label], i) => {
      const b = h('button', { class: 'emote', 'aria-label': `${label} (${i + 1})`, title: `${label} (${i + 1})` }, icon, h('span', { class: 'k' }, String(i + 1)));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cb.emote(i);
        if (this.mobile) emotes.classList.remove('open');
      });
      emotes.append(b);
    });
    this.root.append(emotes);

    // touch controls
    this.touch = h('div', { class: 'touch-ui' });
    const zone = h('div', { id: 'stick-zone', 'aria-hidden': 'true' }, h('div', { id: 'stick-base' }, h('div', { id: 'stick-knob' })));
    const tbtn = (cls: string, label: string, a: Action | (() => void)) => {
      const b = h('button', { class: `tbtn ${cls}`, 'aria-label': label }, label);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof a === 'function') a();
        else this.cb.action(a);
      });
      return b;
    };
    this.primary = tbtn('primary', 'Use', 'interact');
    this.secondary = tbtn('secondary', 'Grab', 'grab');
    this.kick = tbtn('kick', 'Kick', 'kick');
    const jump = tbtn('jump', 'Jump', 'jump');
    let sprint = false;
    const run = tbtn('run', 'Run', () => {
      sprint = !sprint;
      run.classList.toggle('on', sprint);
      this.cb.sprint(sprint);
    });
    const emo = tbtn('emo', '☺', () => emotes.classList.toggle('open'));
    emo.setAttribute('aria-label', 'Emotes');
    this.touch.append(zone, h('div', { class: 'tbuttons' }, this.primary, this.secondary, this.kick, jump, run, emo));
    this.root.append(this.touch);

    this.buildPanels();
  }

  // ------------------------------------------------------------- panels
  private panel(id: Panel, title: string, body: HTMLElement) {
    const close = h('button', { class: 'icon-btn close', 'aria-label': 'Close' }, '✕');
    close.addEventListener('click', () => this.toggle(id, false));
    const el = h('div', { class: 'panel hidden', role: 'dialog', 'aria-label': title }, h('div', { class: 'panel-head' }, h('h2', {}, title), close), body);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(el);
    this.panels.set(id, el);
  }

  private buildPanels() {
    // settings
    const timeLabel = h('span', { class: 'value' });
    const time = h('input', { type: 'range', min: '0', max: '24', step: '0.1', 'aria-label': 'Time of day' }) as HTMLInputElement;
    const cycle = h('input', { type: 'checkbox' }) as HTMLInputElement;
    const fmt = (v: number) => `${String(Math.floor(v) % 24).padStart(2, '0')}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}`;
    time.addEventListener('input', () => {
      this.time = Number(time.value);
      timeLabel.textContent = fmt(this.time);
      this.cb.time(this.time, cycle.checked);
    });
    cycle.addEventListener('change', () => this.cb.time(Number(time.value), cycle.checked));
    const presets = h('div', { class: 'presets' });
    for (const [label, v] of [
      ['Sunrise', 7.1],
      ['Noon', 13],
      ['Golden hour', 18.7],
      ['Dusk', 19.25],
      ['Night', 22.5],
    ] as Array<[string, number]>) {
      const b = h('button', { class: 'pill' }, label);
      b.addEventListener('click', () => {
        time.value = String(v);
        time.dispatchEvent(new Event('input'));
      });
      presets.append(b);
    }
    let vol = 0.8;
    let muted = false;
    try {
      vol = Number(localStorage.getItem('vs:volume') ?? 0.8);
      muted = localStorage.getItem('vs:muted') === '1';
    } catch {
      /* ignore */
    }
    const volume = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(vol), 'aria-label': 'Volume' }) as HTMLInputElement;
    const mute = h('input', { type: 'checkbox' }) as HTMLInputElement;
    mute.checked = muted;
    const sendVol = () => this.cb.volume(Number(volume.value), mute.checked);
    volume.addEventListener('input', sendVol);
    mute.addEventListener('change', sendVol);
    const quality = h('select', { 'aria-label': 'Graphics quality' }, h('option', { value: 'high' }, 'High'), h('option', { value: 'low' }, 'Battery saver')) as HTMLSelectElement;
    quality.value = this.mobile ? 'low' : 'high';
    quality.addEventListener('change', () => this.cb.quality(quality.value as 'high' | 'low'));
    const invite = h('button', { class: 'btn' }, 'Copy invite link');
    invite.addEventListener('click', () => void this.copyInvite());
    const leave = h('button', { class: 'btn ghost' }, 'Leave');
    leave.addEventListener('click', () => this.cb.leave());
    this.syncTimeInputs = (hh: number, cyc: boolean) => {
      time.value = String(hh);
      timeLabel.textContent = fmt(hh);
      cycle.checked = cyc;
    };
    this.panel(
      'menu',
      'Settings',
      h(
        'div',
        { class: 'panel-body' },
        h('label', { class: 'row' }, h('span', {}, 'Time of day'), timeLabel),
        time,
        presets,
        h('label', { class: 'row check' }, cycle, h('span', {}, 'Let the day pass (1 hour per minute)')),
        h('label', { class: 'row' }, h('span', {}, 'Sound')),
        volume,
        h('label', { class: 'row check' }, mute, h('span', {}, 'Mute')),
        h('label', { class: 'row' }, h('span', {}, 'Graphics'), quality),
        h('div', { class: 'actions' }, invite, leave),
      ),
    );

    // travel
    this.panel('travel', 'Go to…', h('div', { class: 'panel-body travel' }));

    // help
    const keys: Array<[string, string]> = this.mobile
      ? [
          ['Left thumb', 'Move (push further to jog)'],
          ['Drag', 'Look around · pinch to zoom'],
          ['Use', 'Sit, drive, row, swing, get up'],
          ['Grab', 'Pick up / throw'],
          ['Run', 'Toggle running'],
          ['☺', 'Emotes'],
        ]
      : [
          ['W A S D', 'Move'],
          ['Shift', 'Sprint · C toggles walking'],
          ['Space', 'Jump · climb out of the pool · brake'],
          ['Mouse drag', 'Look · wheel to zoom'],
          ['E', 'Sit, lie back, drive, row, swing · get up'],
          ['F / Q', 'Pick up & throw / put down'],
          ['K', 'Kick'],
          ['1 – 6', 'Wave, dance, cheer, bow, backflip, nod'],
          ['M', 'Travel'],
          ['R', 'Reset the buggy'],
          ['P', 'Photo mode (hide the interface)'],
        ];
    const list = h('dl', { class: 'keys' });
    for (const [k, d] of keys) list.append(h('dt', {}, k), h('dd', {}, d));
    this.panel('help', 'Controls', h('div', { class: 'panel-body' }, list, h('p', { class: 'note' }, 'Every building, boat and piece of furniture here was modelled in Trimble SketchUp. Physics by Rapier.')));
  }

  syncTimeInputs: (h: number, cycle: boolean) => void = () => {};

  toggle(id: Panel, force?: boolean) {
    const el = this.panels.get(id)!;
    const open = force ?? el.classList.contains('hidden');
    for (const [k, p] of this.panels) if (k !== id) p.classList.add('hidden');
    el.classList.toggle('hidden', !open);
    if (open && id === 'travel') {
      const body = el.querySelector('.travel') as HTMLElement;
      body.replaceChildren();
      for (const s of this.cb.travelSpots()) {
        const b = h('button', { class: 'travel-btn' }, s.label);
        b.addEventListener('click', () => {
          this.cb.travel(s.id);
          this.toggle('travel', false);
        });
        body.append(b);
      }
    }
    if (open && id === 'menu') this.syncTimeInputs(this.time, this.cycle);
    if (open) (el.querySelector('.panel-body button, .panel-body input, .panel-body select') as HTMLElement | null)?.focus();
  }

  closeAll() {
    for (const p of this.panels.values()) p.classList.add('hidden');
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  get panelOpen(): boolean {
    return [...this.panels.values()].some((p) => !p.classList.contains('hidden'));
  }

  // ----------------------------------------------------------- per frame
  setHints(hints: Hint[], mode: HudMode) {
    const sig = hints.map((x) => x.key + x.label).join('|') + mode;
    if (sig === this.lastHints) return;
    this.lastHints = sig;
    this.mode = mode;
    this.hints.replaceChildren(
      ...hints.map((x) => {
        const b = h('button', { class: 'hint' }, h('kbd', {}, x.key), h('span', {}, x.label));
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cb.action(x.action);
        });
        return b;
      }),
    );
    // touch buttons follow the context
    const e = hints.find((x) => x.action === 'interact');
    this.primary.textContent = e ? e.label : 'Use';
    this.primary.classList.toggle('lit', !!e);
    const f = hints.find((x) => x.action === 'grab');
    this.secondary.textContent = f ? f.label.split(' ')[0] : 'Grab';
    this.secondary.classList.toggle('lit', !!f);
    this.kick.classList.toggle('lit', hints.some((x) => x.action === 'kick'));
    this.root.dataset.mode = this.mode;
  }

  setTags(tags: Tag[]) {
    const seen = new Set<string>();
    const W = innerWidth;
    const H = innerHeight;
    for (const t of tags) {
      seen.add(t.id);
      let el = this.tags.get(t.id);
      if (!el) {
        el = h('div', { class: 'tag' }, h('span', { class: 'name' }), h('span', { class: 'dist' }));
        this.tagLayer.append(el);
        this.tags.set(t.id, el);
      }
      (el.firstChild as HTMLElement).textContent = t.name;
      const far = t.dist > 25;
      (el.lastChild as HTMLElement).textContent = far ? `${Math.round(t.dist)} m` : '';
      if (t.onScreen) {
        el.classList.remove('edge');
        el.style.transform = `translate(${t.x}px, ${t.y}px) translate(-50%, -100%)`;
        el.style.opacity = String(Math.max(0.35, 1 - t.dist / 120));
      } else {
        // pin to the screen edge, pointing toward them
        let dx = t.x - W / 2;
        let dy = t.y - H / 2;
        if (t.behind) {
          dx = -dx;
          dy = Math.abs(dy) + H;
        }
        const k = Math.min((W / 2 - 60) / Math.max(1, Math.abs(dx)), (H / 2 - 70) / Math.max(1, Math.abs(dy)));
        el.classList.add('edge');
        el.style.transform = `translate(${W / 2 + dx * k}px, ${H / 2 + dy * k}px) translate(-50%, -50%)`;
        el.style.opacity = '0.95';
        (el.lastChild as HTMLElement).textContent = `${Math.round(t.dist)} m`;
      }
    }
    for (const [id, el] of this.tags) {
      if (!seen.has(id)) {
        el.remove();
        this.tags.delete(id);
      }
    }
  }

  setRoom(r: { code: string | null; status: string; peers: string[] }) {
    if (!r.code) {
      this.roomEl.replaceChildren(h('span', { class: 'dot solo' }), 'Exploring solo');
      return;
    }
    const label = r.status !== 'online' ? (r.status === 'connecting' ? 'Connecting…' : r.status === 'offline' ? 'Offline' : 'Reconnecting…') : r.peers.length ? `${r.peers.join(', ')} ${r.peers.length > 1 ? 'are' : 'is'} here` : 'Waiting for your partner';
    const inv = h('button', { class: 'link' }, 'Invite');
    inv.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.copyInvite();
    });
    const dot = r.status === 'online' ? (r.peers.length ? 'on' : 'wait') : r.status === 'offline' ? 'off' : 'wait';
    this.roomEl.replaceChildren(h('span', { class: `dot ${dot}` }), label, inv);
  }

  async copyInvite() {
    const link = this.cb.invite();
    if (!link) return this.toast('Exploring solo — start a shared villa from the main screen');
    try {
      if (navigator.share && this.mobile) await navigator.share({ title: 'Villa Serena', text: 'Come to the villa with me', url: link });
      else {
        await navigator.clipboard.writeText(link);
        this.toast('Invite link copied — send it to your partner');
      }
    } catch {
      this.toast(link);
    }
  }

  toast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 3200);
  }

  setPhoto(on: boolean) {
    this.root.classList.toggle('photo', on);
  }
}
