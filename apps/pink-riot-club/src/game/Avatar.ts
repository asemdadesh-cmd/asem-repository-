// A character in the world + its floating name tag and speech bubble.
import * as THREE from 'three';
import type { CharacterId } from '../../shared/api-types.ts';
import { buildCharacter, metaFor } from '../characters/roster.ts';
import type { ActionName, CharacterRig } from '../characters/rig.ts';
import { buildSkinned, isSkinned, preloadCharacter, skinnedReady } from '../characters/skinned.ts';

const off = new THREE.Vector3();
const labelPos = new THREE.Vector3();

/** The best available rig: the skinned avatar once its model has loaded, else the sculpted one. */
export function makeRig(id: CharacterId): CharacterRig {
  return isSkinned(id) && skinnedReady(id) ? buildSkinned(id) : buildCharacter(id);
}

export class Avatar {
  root = new THREE.Group();
  rig!: CharacterRig;
  characterId!: CharacterId;
  speed = 0;
  mode: 'ground' | 'swim' | 'air' | 'sit' = 'ground';
  tag: HTMLDivElement;
  bubble: HTMLDivElement;
  private bubbleUntil = 0;
  private status: string | null = null;
  lookYaw = 0;
  /** called after the rig is swapped (e.g. the skinned model finished loading) */
  onRig: (() => void) | null = null;
  private disposed = false;

  constructor(
    characterId: CharacterId,
    public name: string,
    overlay: HTMLElement,
    public isLocal: boolean,
  ) {
    this.tag = document.createElement('div');
    this.tag.className = 'name-tag' + (isLocal ? ' me' : '');
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    overlay.append(this.tag, this.bubble);
    this.setCharacter(characterId);
  }

  get radius(): number {
    return this.characterId === 'teddy' ? 0.5 : this.characterId === 'duck' || this.characterId === 'cat' || this.characterId === 'beaver' ? 0.38 : 0.34;
  }

  setCharacter(id: CharacterId) {
    if (this.rig && this.characterId === id && (this.rig.skinned || !skinnedReady(id))) return;
    const old = this.rig;
    this.characterId = id;
    this.rig = makeRig(id);
    if (old) old.dispose();
    this.root.add(this.rig.root);
    this.refreshTag();
    this.onRig?.();
    // upgrade to the skinned avatar as soon as its model is ready
    if (isSkinned(id) && !this.rig.skinned) {
      void preloadCharacter(id).then((ok) => {
        if (ok && !this.disposed && this.characterId === id && !this.rig.skinned) this.setCharacter(id);
      });
    }
  }

  setName(n: string) {
    this.name = n;
    this.refreshTag();
  }

  setStatus(s: string | null) {
    this.status = s;
    this.refreshTag();
  }

  private refreshTag() {
    const meta = metaFor(this.characterId);
    this.tag.innerHTML = '';
    const n = document.createElement('b');
    n.textContent = this.name;
    this.tag.append(n);
    if (meta.name !== this.name) {
      const c = document.createElement('small');
      c.textContent = meta.name;
      this.tag.append(c);
    }
    if (this.status) {
      const st = document.createElement('i');
      st.textContent = this.status;
      this.tag.append(st);
    }
    this.tag.style.setProperty('--accent', meta.accent);
  }

  say(text: string, seconds = 3.2) {
    this.bubble.textContent = text;
    this.bubble.classList.remove('pop');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('pop', 'show');
    this.bubbleUntil = performance.now() + seconds * 1000;
  }

  play(a: ActionName) {
    this.rig.play(a);
  }

  headPos(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.rig.skinned) return this.rig.point('head', out).add(off.set(0, 0.06, 0));
    const h = this.mode === 'swim' ? this.rig.spec.hipY * 0.6 + this.rig.spec.headR * 2 : this.rig.height;
    return out.copy(this.root.position).add(off.set(0, h + 0.05, 0));
  }

  update(dt: number) {
    this.rig.update(dt, { speed: this.speed, mode: this.mode, lookYaw: this.lookYaw });
  }

  updateLabels(camera: THREE.Camera, w: number, h: number, maxDist = 40) {
    const p = this.headPos(labelPos).add(off.set(0, 0.28, 0));
    const dist = camera.position.distanceTo(p);
    p.project(camera);
    const visible = p.z < 1 && p.z > -1 && dist < maxDist;
    const x = (p.x * 0.5 + 0.5) * w;
    const y = (-p.y * 0.5 + 0.5) * h;
    const s = THREE.MathUtils.clamp(9 / dist, 0.55, 1.1);
    this.tag.style.display = visible ? '' : 'none';
    this.tag.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) scale(${s})`;
    const showBubble = visible && performance.now() < this.bubbleUntil;
    this.bubble.classList.toggle('show', showBubble);
    if (showBubble) this.bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 34 * s}px) scale(${Math.max(s, 0.75)})`;
  }

  dispose() {
    this.disposed = true;
    this.rig.dispose();
    this.tag.remove();
    this.bubble.remove();
    this.root.removeFromParent();
  }
}
