// Keyboard, mouse (drag to orbit, click to move), touch (joystick, drag, pinch, tap).
import * as THREE from 'three';

export type ActionKey = 'jump' | 'interact' | 'bonk' | 'action' | 'kick' | 'chat' | 'emote1' | 'emote2' | 'emote3' | 'emote4' | 'escape' | 'gandas' | 'map';

const isTyping = () => {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
};

export class Input {
  keys = new Set<string>();
  joy = new THREE.Vector2();
  joyActive = false;
  orbit = new THREE.Vector2();
  zoom = 0;
  enabled = true;
  onAction: (a: ActionKey) => void = () => {};
  onTap: (x: number, y: number) => void = () => {};
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; moved: boolean }>();
  private pinchDist = 0;
  private joyId: number | null = null;
  private joyOrigin = new THREE.Vector2();

  constructor(
    private surface: HTMLElement,
    private joyZone: HTMLElement,
    private joyBase: HTMLElement,
    private joyKnob: HTMLElement,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
    surface.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    surface.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += Math.sign(e.deltaY) * 0.6;
    }, { passive: false });
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
    joyZone.addEventListener('pointerdown', this.onJoyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled || isTyping()) {
      if (e.key === 'Escape') this.onAction('escape');
      return;
    }
    const k = e.key.toLowerCase();
    this.keys.add(e.code);
    if (e.repeat) return;
    const map: Record<string, ActionKey> = {
      ' ': 'jump',
      e: 'interact',
      b: 'bonk',
      f: 'action',
      k: 'kick',
      t: 'chat',
      enter: 'chat',
      '1': 'emote1',
      '2': 'emote2',
      '3': 'emote3',
      '4': 'emote4',
      q: 'gandas',
      m: 'map',
      escape: 'escape',
    };
    const a = map[k];
    if (a) {
      e.preventDefault();
      this.onAction(a);
    }
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    this.surface.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false });
    if (this.pointers.size === 2) this.pinchDist = this.pairDist();
  };

  private pairDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.updateJoy(e.clientX, e.clientY);
      return;
    }
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 6) p.moved = true;
    if (this.pointers.size === 2) {
      const d = this.pairDist();
      this.zoom -= (d - this.pinchDist) * 0.02;
      this.pinchDist = d;
      return;
    }
    if (p.moved) {
      this.orbit.x += dx;
      this.orbit.y += dy;
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joyActive = false;
      this.joy.set(0, 0);
      this.joyBase.classList.remove('active');
      this.joyKnob.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (!p.moved && performance.now() - p.t < 400 && this.pointers.size === 0) this.onTap(e.clientX, e.clientY);
  };

  private onJoyDown = (e: PointerEvent) => {
    if (!this.enabled || this.joyId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    this.joyId = e.pointerId;
    this.joyZone.setPointerCapture?.(e.pointerId);
    this.joyActive = true;
    this.joyOrigin.set(e.clientX, e.clientY);
    const zr = this.joyZone.getBoundingClientRect();
    this.joyBase.style.left = `${e.clientX - zr.left}px`;
    this.joyBase.style.top = `${e.clientY - zr.top}px`;
    this.joyBase.classList.add('active');
    this.updateJoy(e.clientX, e.clientY);
  };

  private updateJoy(x: number, y: number) {
    const R = 52;
    const dx = x - this.joyOrigin.x;
    const dy = y - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);
    const k = len > R ? R / len : 1;
    this.joy.set((dx * k) / R, (-dy * k) / R);
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  /** Movement intent: x = right, y = forward, 0..1 magnitude; run flag. */
  getMove(): { x: number; y: number; run: boolean } {
    let x = 0;
    let y = 0;
    const K = this.keys;
    if (K.has('KeyW') || K.has('ArrowUp')) y += 1;
    if (K.has('KeyS') || K.has('ArrowDown')) y -= 1;
    if (K.has('KeyD') || K.has('ArrowRight')) x += 1;
    if (K.has('KeyA') || K.has('ArrowLeft')) x -= 1;
    let run = K.has('ShiftLeft') || K.has('ShiftRight');
    if (this.joyActive) {
      x = this.joy.x;
      y = this.joy.y;
      run = this.joy.length() > 0.92;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y, run };
  }

  consumeOrbit(): THREE.Vector2 {
    const o = this.orbit.clone();
    this.orbit.set(0, 0);
    return o;
  }

  consumeZoom(): number {
    const z = this.zoom;
    this.zoom = 0;
    return z;
  }
}

export class FollowCamera {
  camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0.36;
  dist: number;
  minDist: number;
  maxDist: number;
  target = new THREE.Vector3();
  private idleTime = 0;

  constructor(public mobile: boolean) {
    this.camera = new THREE.PerspectiveCamera(mobile ? 58 : 50, 1, 0.1, 1400);
    this.dist = mobile ? 4.3 : 7;
    this.minDist = mobile ? 2.4 : 3;
    this.maxDist = mobile ? 9 : 16;
    this.pitch = mobile ? 0.3 : 0.38;
  }

  setMobile(m: boolean) {
    if (m === this.mobile) return;
    this.mobile = m;
    this.camera.fov = m ? 58 : 50;
    this.dist = m ? 4.3 : 7;
    this.minDist = m ? 2.4 : 3;
    this.maxDist = m ? 9 : 16;
    this.camera.updateProjectionMatrix();
  }

  rotate(dx: number, dy: number) {
    this.yaw -= dx * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.05, 1.2);
    this.idleTime = 0;
  }

  zoom(d: number) {
    this.dist = THREE.MathUtils.clamp(this.dist + d, this.minDist, this.maxDist);
  }

  /** Unit vectors for movement relative to the view. */
  basis(): { fwd: THREE.Vector3; right: THREE.Vector3 } {
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    return { fwd, right };
  }

  update(dt: number, focus: THREE.Vector3, height: number, playerYaw: number, moving: boolean, groundAt: (x: number, z: number) => number) {
    this.idleTime += dt;
    // gently swing behind the player while they run around (not while orbiting)
    if (moving && this.idleTime > 1.2) {
      const behind = playerYaw + Math.PI;
      let d = behind - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * (this.mobile ? 1.2 : 0.6));
    }
    const k = 1 - Math.exp(-10 * dt);
    const want = new THREE.Vector3(focus.x, focus.y + height * (this.mobile ? 0.82 : 0.78), focus.z);
    this.target.lerp(want, k);
    const c = Math.cos(this.pitch);
    const pos = new THREE.Vector3(
      this.target.x + Math.sin(this.yaw) * c * this.dist,
      this.target.y + Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(this.yaw) * c * this.dist,
    );
    const gy = groundAt(pos.x, pos.z) + 0.35;
    if (pos.y < gy) pos.y = gy;
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }
}
