// Keyboard + mouse, touch (virtual stick, drag to look, pinch to zoom, buttons)
// and gamepads, merged into one movement intent and a stream of actions.
import * as THREE from 'three';

export type Action =
  | 'jump'
  | 'interact'
  | 'grab'
  | 'drop'
  | 'kick'
  | 'emote1'
  | 'emote2'
  | 'emote3'
  | 'emote4'
  | 'emote5'
  | 'emote6'
  | 'walk'
  | 'reset'
  | 'menu'
  | 'map'
  | 'photo'
  | 'help';

const KEYMAP: Record<string, Action> = {
  Space: 'jump',
  KeyE: 'interact',
  KeyF: 'grab',
  KeyQ: 'drop',
  KeyK: 'kick',
  Digit1: 'emote1',
  Digit2: 'emote2',
  Digit3: 'emote3',
  Digit4: 'emote4',
  Digit5: 'emote5',
  Digit6: 'emote6',
  KeyC: 'walk',
  KeyR: 'reset',
  Escape: 'menu',
  KeyM: 'map',
  KeyP: 'photo',
  KeyH: 'help',
};

const isTyping = () => {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
};

export interface MoveState {
  x: number; // right
  y: number; // forward
  sprint: boolean;
  /** joystick held lightly: walk */
  analog: boolean;
}

export class Input {
  readonly keys = new Set<string>();
  enabled = true;
  onAction: (a: Action) => void = () => {};
  private look = new THREE.Vector2();
  private zoom = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean }>();
  private pinch = 0;
  private stickId: number | null = null;
  private stickOrigin = new THREE.Vector2();
  private stick = new THREE.Vector2();
  private padPrev: boolean[] = [];
  sprintToggle = false;
  /** seconds since the user last moved the camera themselves */
  lookIdle = 99;

  constructor(
    private surface: HTMLElement,
    private stickZone: HTMLElement,
    private stickBase: HTMLElement,
    private stickKnob: HTMLElement,
  ) {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    surface.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    surface.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom += Math.sign(e.deltaY) * 0.7;
      },
      { passive: false },
    );
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
    stickZone.addEventListener('pointerdown', this.stickDown);
  }

  private keyDown = (e: KeyboardEvent) => {
    if (isTyping()) return;
    if (!this.enabled && e.code !== 'Escape') return;
    this.keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    const a = KEYMAP[e.code];
    if (a) this.onAction(a);
  };

  private down = (e: PointerEvent) => {
    if (!this.enabled) return;
    this.surface.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
    if (this.pointers.size === 2) this.pinch = this.pairDist();
  };

  private pairDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private move = (e: PointerEvent) => {
    if (e.pointerId === this.stickId) return this.updateStick(e.clientX, e.clientY);
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 5) p.moved = true;
    if (this.pointers.size === 2) {
      const d = this.pairDist();
      this.zoom -= (d - this.pinch) * 0.025;
      this.pinch = d;
      return;
    }
    if (p.moved) {
      const k = e.pointerType === 'touch' ? 1.35 : 1;
      this.look.x += dx * k;
      this.look.y += dy * k;
      this.lookIdle = 0;
    }
  };

  private up = (e: PointerEvent) => {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.stick.set(0, 0);
      this.stickBase.classList.remove('active');
      this.stickKnob.style.transform = 'translate(-50%, -50%)';
      return;
    }
    this.pointers.delete(e.pointerId);
  };

  private stickDown = (e: PointerEvent) => {
    if (!this.enabled || this.stickId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    this.stickId = e.pointerId;
    this.stickZone.setPointerCapture?.(e.pointerId);
    this.stickOrigin.set(e.clientX, e.clientY);
    const r = this.stickZone.getBoundingClientRect();
    this.stickBase.style.left = `${e.clientX - r.left}px`;
    this.stickBase.style.top = `${e.clientY - r.top}px`;
    this.stickBase.classList.add('active');
    this.updateStick(e.clientX, e.clientY);
  };

  private updateStick(x: number, y: number) {
    const R = 56;
    const dx = x - this.stickOrigin.x;
    const dy = y - this.stickOrigin.y;
    const len = Math.hypot(dx, dy);
    const k = len > R ? R / len : 1;
    this.stick.set((dx * k) / R, (-dy * k) / R);
    this.stickKnob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  /** Call once per frame: polls gamepads and fires their button actions. */
  poll(dt: number) {
    this.lookIdle += dt;
    const pads = navigator.getGamepads?.() ?? [];
    for (const gp of pads) {
      if (!gp) continue;
      const map: Array<[number, Action]> = [
        [0, 'jump'],
        [2, 'interact'],
        [1, 'grab'],
        [3, 'kick'],
        [4, 'emote1'],
        [5, 'emote3'],
        [9, 'menu'],
        [8, 'map'],
        [11, 'walk'],
      ];
      for (const [i, a] of map) {
        const now = !!gp.buttons[i]?.pressed;
        if (now && !this.padPrev[i]) this.onAction(a);
        this.padPrev[i] = now;
      }
      const rx = dead(gp.axes[2] ?? 0);
      const ry = dead(gp.axes[3] ?? 0);
      if (rx || ry) {
        this.look.x += rx * 520 * dt;
        this.look.y += ry * 380 * dt;
        this.lookIdle = 0;
      }
      break;
    }
  }

  getMove(): MoveState {
    let x = 0;
    let y = 0;
    const K = this.keys;
    if (this.enabled) {
      if (K.has('KeyW') || K.has('ArrowUp')) y += 1;
      if (K.has('KeyS') || K.has('ArrowDown')) y -= 1;
      if (K.has('KeyD') || K.has('ArrowRight')) x += 1;
      if (K.has('KeyA') || K.has('ArrowLeft')) x -= 1;
    }
    let sprint = K.has('ShiftLeft') || K.has('ShiftRight');
    let analog = false;
    if (this.stickId !== null) {
      x = this.stick.x;
      y = this.stick.y;
      analog = true;
      sprint = this.sprintToggle && this.stick.length() > 0.8;
    }
    const gp = (navigator.getGamepads?.() ?? []).find((g) => !!g);
    if (gp) {
      const gx = dead(gp.axes[0] ?? 0);
      const gy = -dead(gp.axes[1] ?? 0);
      if (gx || gy) {
        x = gx;
        y = gy;
        analog = true;
        sprint = !!gp.buttons[10]?.pressed || (gp.buttons[7]?.value ?? 0) > 0.5;
      }
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y, sprint, analog };
  }

  /** Vehicle controls: throttle −1..1, steer −1..1, brake 0..1. */
  getDrive(): { throttle: number; steer: number; brake: number } {
    const m = this.getMove();
    let throttle = m.y;
    let brake = this.keys.has('Space') ? 1 : 0;
    const gp = (navigator.getGamepads?.() ?? []).find((g) => !!g);
    if (gp) {
      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.05 || lt > 0.05) throttle = rt - lt;
      if (gp.buttons[0]?.pressed) brake = 1;
    }
    return { throttle, steer: m.x, brake };
  }

  consumeLook(): THREE.Vector2 {
    const o = this.look.clone();
    this.look.set(0, 0);
    return o;
  }

  consumeZoom(): number {
    const z = this.zoom;
    this.zoom = 0;
    return z;
  }
}

function dead(v: number) {
  return Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85;
}
