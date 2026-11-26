// The running world: local player physics, remote interpolation, games,
// social actions, interactions and rendering.
import * as THREE from 'three';
import type { CharacterId, RoomState } from '../../shared/api-types.ts';
import type { AnimCode, Msg } from '../../shared/protocol.ts';
import { inPool, POOL, SPAWN, PITCH, type Seat } from '../../shared/world.ts';
import { World, type Collider, type Interactable } from '../world/World.ts';
import { terrainHeight, SEA_LEVEL } from '../world/terrain.ts';
import type { RoomSession } from '../net/session.ts';
import { Avatar } from './Avatar.ts';
import { Effects } from './effects.ts';
import { FollowCamera, Input, type ActionKey } from './input.ts';
import { Football } from './football.ts';
import { PoolBattle } from './poolBattle.ts';
import { DrawingBoard } from './drawing.ts';
import { PairManager } from './pairs.ts';
import { restorePose } from '../characters/ik.ts';
import { sfx } from './audio.ts';
import { rid, type GameCtx } from './context.ts';
import { HudView } from '../ui/hud.ts';
import { isSmall, isTouch } from '../ui/dom.ts';
import { openChat, openDrawing, openInvite, openLightbox, openMap, openRules, openAbout, openSettings } from '../ui/panels.ts';
import { metaFor } from '../characters/roster.ts';
import { setMaxAnisotropy } from '../gfx/textures.ts';
import { applyEnvironment } from '../gfx/env.ts';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

interface Snap {
  t: number;
  p: THREE.Vector3;
  r: number;
  v: number;
  a: AnimCode;
}

const UP = new THREE.Vector3(0, 1, 0);

/** ?lowfx=1 (remembered for the tab) renders at low resolution without shadows — used by automated tests. */
function lowFx(): boolean {
  try {
    if (new URLSearchParams(location.search).has('lowfx')) sessionStorage.setItem('prc:lowfx', '1');
    return sessionStorage.getItem('prc:lowfx') === '1';
  } catch {
    return false;
  }
}

export class Game {
  renderer: THREE.WebGLRenderer;
  world: World;
  cam: FollowCamera;
  input: Input;
  effects = new Effects();
  hud: HudView;
  local: Avatar;
  remote: Avatar | null = null;
  football: Football;
  pool: PoolBattle;
  board: DrawingBoard;
  pairs: PairManager;
  ctx: GameCtx;
  private clock = new THREE.Clock();
  private time = 0;
  private vel = new THREE.Vector3();
  private onGround = true;
  private sitting: Interactable | null = null;
  private target: { x: number; z: number; then?: Interactable } | null = null;
  private marker: HTMLDivElement;
  private snaps: Snap[] = [];
  private remoteVel = new THREE.Vector3();
  private lastRemotePos = new THREE.Vector3();
  private sendTimer = 0;
  private lastSent = { p: new THREE.Vector3(1e9, 0, 0), r: 0, a: '' as AnimCode | '' };
  private near: Interactable | null = null;
  private readyAt = { bonk: 0, gandas: 0 };
  private drawingOpen = false;
  private closeModal: (() => void) | null = null;
  private gandasOn = true;
  private raycaster = new THREE.Raycaster();
  private wasInWater = false;
  private hudTimer = 0;
  private disposed = false;
  private stepTimer = 0;
  private lowfx = lowFx();
  private renderClock = 0;
  private perf = { frames: 0, time: 0, dpr: 0, maxDpr: 0, shadowsOff: false };

  constructor(
    canvas: HTMLCanvasElement,
    public session: RoomSession,
    private onExit: (reason?: string) => void,
  ) {
    const mobile = isTouch() || isSmall();
    const lowfx = lowFx();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowfx && (!mobile || devicePixelRatio < 2), powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(lowfx ? 0.5 : Math.min(devicePixelRatio, mobile ? 1.6 : 2));
    this.perf.dpr = this.perf.maxDpr = this.renderer.getPixelRatio();
    this.renderer.shadowMap.enabled = !lowfx;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setMaxAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.world = new World(mobile ? 'low' : 'high');
    applyEnvironment(this.renderer, this.world.scene, 0.5);
    this.world.scene.add(this.effects.group);
    this.cam = new FollowCamera(mobile);
    try {
      this.gandasOn = localStorage.getItem('prc:gandas') !== '0';
    } catch {
      /* ignore */
    }

    this.hud = new HudView({
      onReaction: (k) => this.reaction(k),
      onCtx: () => this.contextAction(),
      onJump: () => this.action('jump'),
      onSettings: () => this.openSettings(),
      onMap: () => this.action('map'),
      onInvite: () => this.invite(),
      onRoomChip: () => this.invite(),
      onPair: (k) => {
        sfx.unlock();
        this.standUp();
        if (k === 'blowkiss') this.pairs.blowKiss();
        else this.pairs.request(k);
      },
    });
    this.hud.setRoom(session.code);
    this.hud.setGandasVisible(this.gandasOn);
    this.hud.setWaiting(() => this.invite());
    this.marker = document.createElement('div');
    this.marker.className = 'marker hidden';
    this.hud.labels.append(this.marker);

    this.input = new Input(canvas, this.hud.joyZone, this.hud.joyBase, this.hud.joyKnob);
    this.input.onAction = (a) => this.action(a);
    this.input.onTap = (x, y) => this.tap(x, y);

    // local avatar at a spawn spot (seat 2 a little to the side)
    this.local = new Avatar(session.character, session.name, this.hud.labels, true);
    const sx = SPAWN.x + (session.seat === 1 ? -1.4 : 1.4);
    this.local.root.position.set(sx, 0.02, SPAWN.z);
    this.local.root.rotation.y = 0;
    this.world.scene.add(this.local.root);
    this.cam.yaw = Math.PI;

    this.ctx = {
      scene: this.world.scene,
      world: this.world,
      effects: this.effects,
      session,
      local: this.local,
      remote: null,
      remoteVel: this.remoteVel,
      localVel: this.vel,
      mySeat: session.seat,
      peerOnline: () => session.isPeerOnline,
      hud: this.hud,
      nameOf: (s: Seat) => this.nameOf(s),
      now: () => this.time,
    };
    this.pairs = new PairManager(this.ctx, {
      ask: (text, yes, no, s) => this.hud.pairAsk(text, yes, no, s),
      hideAsk: () => this.hud.hidePairAsk(),
      setActive: (text, onEnd) => this.hud.pairActive(text, onEnd),
      prepare: () => {
        this.standUp();
        this.target = null;
        this.marker.classList.add('hidden');
        this.vel.set(0, 0, 0);
      },
    });
    this.football = new Football(this.ctx);
    this.pool = new PoolBattle(this.ctx);
    this.board = new DrawingBoard(session, session.seat);
    if (this.world.easelCanvasMat) {
      this.world.easelCanvasMat.map = this.board.texture;
      this.world.easelCanvasMat.needsUpdate = true;
    }

    // network wiring
    session.on('msg', (m) => this.onMsg(m));
    session.on('state', (s) => this.onState(s));
    session.on('status', (s) => this.hud.setStatus(s, session.peerName));
    session.on('peer', (online, name) => this.onPeer(online, name));
    session.on('resync', () => {
      void this.board.load();
      void session.refreshState();
      this.sendState(true);
    });
    session.on('fatal', (r) => {
      alert(r === 'room-full' ? 'تخدات بلاصتك فالغرفة 😢' : 'تبدلات البلاصة ديالك فالغرفة');
      this.onExit(r);
    });
    this.hud.setStatus(session.status, session.peerName);
    this.onState(session.state);
    void this.board.load();

    // remote avatar right away if the seat is already taken
    const peer = session.state.seats.find((s) => s.seat === session.peerSeat);
    if (peer) this.ensureRemote(peer.character, peer.name);

    this.setupPost();
    addEventListener('resize', this.onResize);
    this.onResize();
    document.addEventListener('visibilitychange', this.onVis);
    (window as unknown as { __prc: unknown }).__prc = this;
    this.hud.toast(`مرحبا ${session.name} فنادي التخربيق 💗`, 'good');
    if (!session.state.seats.some((s) => s.seat === session.peerSeat)) setTimeout(() => !session.isPeerOnline && this.invite(), 900);
  }

  /** Desktop-class GPUs: MSAA + gentle bloom on highlights + a soft vignette. */
  private composer: EffectComposer | null = null;
  private setupPost() {
    if (this.lowfx || isTouch() || isSmall() || this.renderer.capabilities.maxSamples < 4) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.world.scene, this.cam.camera));
    // threshold in linear HDR: only true highlights (water glints, gold, sun) glow
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.4, 2.4));
    c.addPass(new OutputPass());
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.95;
    vignette.uniforms.darkness.value = 0.55;
    c.addPass(vignette);
    this.composer = c;
  }

  private dropPost() {
    this.composer?.dispose();
    this.composer = null;
  }

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onVis = () => {
    this.clock.getDelta();
  };

  private onResize = () => {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.cam.camera.aspect = w / h;
    this.cam.setMobile(isTouch() || isSmall());
    this.cam.camera.updateProjectionMatrix();
  };

  private nameOf(s: Seat): string {
    if (s === this.session.seat) return this.session.name;
    return this.session.peerName ?? this.session.state.seats.find((x) => x.seat === s)?.name ?? 'صاحبك';
  }

  // ------------------------------------------------------------------ net

  private ensureRemote(ch: CharacterId, name: string) {
    if (!this.remote) {
      this.remote = new Avatar(ch, name, this.hud.labels, false);
      this.remote.root.position.set(SPAWN.x + (this.session.seat === 1 ? 1.4 : -1.4), 0.02, SPAWN.z);
      this.world.scene.add(this.remote.root);
      this.ctx.remote = this.remote;
      this.remote.setStatus(this.session.isPeerOnline ? null : 'مقطوع/ة 📡');
    } else {
      if (this.remote.characterId !== ch) this.remote.setCharacter(ch);
      if (this.remote.name !== name) this.remote.setName(name);
    }
  }

  private onPeer(online: boolean, name: string | null) {
    if (online) {
      this.ensureRemote(this.session.peerCharacter ?? 'yasso', name ?? this.session.peerName ?? 'صاحبك');
      this.remote?.setStatus(null);
      this.hud.toast(`${name ?? 'صاحبك'} وصل/ات 💗`, 'good');
      // the friend is here: no need to keep the invite panel open
      if (this.inviteOpen) {
        this.closeModal?.();
        this.closeModal = null;
      }
      sfx.join();
      this.football.onPeerOnline();
      this.sendState(true);
      void this.session.sendHello(false);
    } else {
      this.remote?.setStatus('مقطوع/ة 📡');
      this.pairs.onPeerOffline();
      if (name) this.hud.toast(`${name} تقطع/ات… كنتسناو يرجع/ترجع 📡`, 'warn');
    }
  }

  private onState(s: RoomState) {
    const active = this.local.mode === 'swim' && inPool(this.local.root.position.x, this.local.root.position.z) ? 'pool' : this.onPitch() ? 'football' : null;
    this.hud.setScores(s, this.session.seat, active);
    const peer = s.seats.find((x) => x.seat === this.session.peerSeat);
    if (peer && !this.remote) this.ensureRemote(peer.character, peer.name);
  }

  private onPitch(): boolean {
    const p = this.local.root.position;
    return Math.abs(p.x - PITCH.cx) < PITCH.halfX + 3 && Math.abs(p.z - PITCH.cz) < PITCH.halfZ + 2;
  }

  private onMsg(m: Msg) {
    switch (m.t) {
      case 'hello':
        if (m.seat === this.session.peerSeat) this.ensureRemote(m.ch, m.name);
        break;
      case 'st':
        if (m.seat !== this.session.peerSeat) return;
        if (!this.remote) this.ensureRemote(this.session.peerCharacter ?? 'yasso', this.session.peerName ?? 'صاحبك');
        this.snaps.push({ t: performance.now(), p: new THREE.Vector3(...m.p), r: m.r, v: m.v, a: m.a });
        if (this.snaps.length > 30) this.snaps.shift();
        break;
      case 'ball':
      case 'kick':
      case 'goal':
      case 'handover':
        this.football.onMsg(m);
        break;
      case 'hit':
        this.pool.onMsg(m);
        break;
      case 'act':
        this.onRemoteAct(m);
        break;
      case 'say':
        if (m.seat === this.session.peerSeat) this.remote?.say(m.text);
        break;
      case 'score':
        if (m.winner && m.round) {
          if (m.game === 'football') this.football.roundWon(m.winner, m.round);
          else this.pool.roundWon(m.winner, m.round);
        }
        this.session.applyState(m.state);
        break;
      case 'dr':
      case 'undo':
      case 'clear':
        this.board.onMsg(m);
        break;
      case 'pair':
        this.pairs.onMsg(m);
        break;
    }
  }

  private onRemoteAct(m: Extract<Msg, { t: 'act' }>) {
    const r = this.remote;
    if (!r || m.seat === this.session.seat) return;
    switch (m.kind) {
      case 'splash':
        this.pool.onMsg(m);
        break;
      case 'bonk':
        r.play('bonk');
        r.say('بضربك😂', 2.4);
        setTimeout(() => {
          if (m.target === this.session.seat) this.getBonked(r);
          else sfx.bonk();
        }, 380);
        break;
      case 'gandas':
        r.play('gandas');
        r.say('يا قندس 🦫', 2.6);
        sfx.laugh();
        this.effects.emojiBurst(this.local.headPos(), '🦫', 9, 0.45, true);
        this.hud.replyPrompt('لم روحك 🤣', () => this.reply());
        break;
      case 'reply':
        r.play('reply');
        sfx.laugh();
        break;
      case 'kick':
        r.play('kick');
        break;
      case 'blowkiss':
        this.pairs.remoteBlowKiss();
        break;
      default:
        r.play(m.kind);
        if (m.kind === 'laugh') sfx.laugh();
        if (m.kind === 'celebrate') this.effects.confetti(r.headPos(), 30);
        if (m.kind === 'dance') this.effects.emojiBurst(r.headPos(), '🎶', 4, 0.35);
    }
  }

  private getBonked(by: Avatar) {
    this.local.play('hit');
    sfx.bonk();
    this.effects.stars(() => this.local.headPos());
    const away = this.local.root.position.clone().sub(by.root.position).setY(0).normalize();
    this.vel.addScaledVector(away, 3.2);
    if (this.onGround) this.vel.y = 3.2;
    this.standUp();
    this.hud.replyPrompt('لم روحك 🤣', () => this.reply());
    // Yasso's characters answer on their own if the player doesn't
    if (this.local.characterId === 'yasso' || this.local.characterId === 'yasso-kaftan') {
      const t = window.setTimeout(() => this.reply(), 1900);
      this.pendingAutoReply = t;
    }
  }
  private pendingAutoReply = 0;
  private lastReply = 0;

  private reply() {
    clearTimeout(this.pendingAutoReply);
    if (performance.now() - this.lastReply < 1200) return;
    this.lastReply = performance.now();
    this.hud.hideReply();
    this.local.play('reply');
    this.local.say('لم روحك 🤣', 2.6);
    sfx.laugh();
    this.session.send({ t: 'say', seat: this.session.seat, text: 'لم روحك 🤣' });
    this.session.send({ t: 'act', kind: 'reply', seat: this.session.seat, id: rid('a') });
  }

  private sendState(force = false) {
    const p = this.local.root.position;
    const anim: AnimCode = this.local.mode === 'swim' ? 'swim' : this.local.mode === 'sit' ? 'sit' : this.local.mode === 'air' ? 'jump' : this.local.speed > 5 ? 'run' : this.local.speed > 0.2 ? 'walk' : 'idle';
    const moved = p.distanceTo(this.lastSent.p) > 0.02 || Math.abs(this.local.root.rotation.y - this.lastSent.r) > 0.02 || anim !== this.lastSent.a;
    if (!force && !moved && this.sendTimer > -0.45) return;
    this.sendTimer = moved || force ? 1 / 12 : 0.5;
    this.lastSent.p.copy(p);
    this.lastSent.r = this.local.root.rotation.y;
    this.lastSent.a = anim;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    this.session.send({ t: 'st', seat: this.session.seat, p: [r2(p.x), r2(p.y), r2(p.z)], r: r2(this.local.root.rotation.y), v: r2(this.local.speed), a: anim, ts: Date.now() });
  }

  // ------------------------------------------------------------------ actions

  private action(a: ActionKey) {
    sfx.unlock();
    switch (a) {
      case 'jump':
        this.standUp();
        if (this.onGround && this.local.mode !== 'swim') {
          this.vel.y = 6.8;
          this.onGround = false;
        } else if (this.local.mode === 'swim') {
          this.effects.splash(this.local.root.position.clone().setY(this.waterLevel()), 0.6, this.waterLevel());
          sfx.splash();
        }
        break;
      case 'interact':
        if (this.near) this.interact(this.near);
        break;
      case 'action':
        this.contextAction();
        break;
      case 'kick':
        if (!this.football.tryKick()) this.local.play('kick');
        else this.session.send({ t: 'act', kind: 'kick', seat: this.session.seat, id: rid('a') });
        break;
      case 'bonk':
        this.bonk();
        break;
      case 'gandas':
        if (this.gandasOn) this.gandas();
        break;
      case 'emote1':
        this.emote('laugh');
        break;
      case 'emote2':
        this.emote('dance');
        break;
      case 'emote3':
        this.emote('wave');
        break;
      case 'emote4':
        this.emote('celebrate');
        break;
      case 'chat':
        this.openModal(() => openChat((t) => this.say(t)));
        break;
      case 'map':
        this.openModal(() =>
          openMap((x, z) => {
            this.standUp();
            this.local.root.position.set(x, this.world.groundAt(x, z) + 0.02, z);
            this.vel.set(0, 0, 0);
            this.target = null;
            this.effects.emojiBurst(this.local.headPos(), '✨', 8, 0.35);
          }),
        );
        break;
      case 'escape':
        this.standUp();
        this.hud.togglePairMenu(false);
        break;
      case 'pair':
        this.hud.togglePairMenu();
        break;
    }
  }

  private contextAction() {
    sfx.unlock();
    if (this.pool.canSplash()) {
      this.pool.splash();
      return;
    }
    if (this.football.nearBall(this.local.root.position, 1.8)) {
      this.action('kick');
      return;
    }
    if (this.near) this.interact(this.near);
  }

  private reaction(k: 'bonk' | 'reply' | 'gandas' | 'laugh' | 'dance' | 'wave' | 'celebrate' | 'chat') {
    sfx.unlock();
    if (k === 'bonk') this.bonk();
    else if (k === 'reply') this.reply();
    else if (k === 'gandas') this.gandas();
    else if (k === 'chat') this.action('chat');
    else this.emote(k);
  }

  private emote(kind: 'laugh' | 'dance' | 'wave' | 'celebrate') {
    this.standUp();
    this.local.play(kind);
    if (kind === 'laugh') {
      sfx.laugh();
      this.local.say('هههههههه 😂', 1.8);
    }
    if (kind === 'celebrate') this.effects.confetti(this.local.headPos(), 30);
    if (kind === 'dance') this.effects.emojiBurst(this.local.headPos(), '🎶', 4, 0.35);
    if (kind === 'wave') this.local.say('👋 سلام!', 1.6);
    this.session.send({ t: 'act', kind, seat: this.session.seat, id: rid('a') });
  }

  private bonk() {
    const now = performance.now();
    if (now < this.readyAt.bonk) return;
    this.readyAt.bonk = now + 700;
    this.standUp();
    const r = this.remote;
    const target = r && this.session.isPeerOnline && r.root.position.distanceTo(this.local.root.position) < 2.8 ? r : null;
    if (target) {
      // turn to face the victim
      const d = target.root.position.clone().sub(this.local.root.position);
      this.local.root.rotation.y = Math.atan2(d.x, d.z);
    }
    this.local.play('bonk');
    this.local.say('بضربك😂', 2.2);
    this.session.send({ t: 'act', kind: 'bonk', seat: this.session.seat, target: target ? this.session.peerSeat : undefined, id: rid('b') });
    setTimeout(() => {
      sfx.bonk();
      if (target) {
        target.play('hit');
        this.effects.stars(() => target.headPos());
      } else {
        this.effects.emojiBurst(this.local.headPos().add(new THREE.Vector3(0, 0.2, 0)), '💨', 3, 0.35);
      }
    }, 380);
  }

  private gandas() {
    const now = performance.now();
    if (now < this.readyAt.gandas) return;
    this.readyAt.gandas = now + 700;
    this.standUp();
    this.local.play('gandas');
    this.local.say('يا قندس 🦫', 2.4);
    sfx.laugh();
    if (this.remote) this.effects.emojiBurst(this.remote.headPos(), '🦫', 9, 0.45, true);
    this.session.send({ t: 'act', kind: 'gandas', seat: this.session.seat, target: this.session.peerSeat, id: rid('g') });
  }

  private say(t: string) {
    this.local.say(t);
    sfx.pop();
    this.session.send({ t: 'say', seat: this.session.seat, text: t.slice(0, 80) });
  }

  private interact(it: Interactable) {
    this.target = null;
    switch (it.kind) {
      case 'photo':
        this.openModal(() => openLightbox('photo', it.index ?? 0));
        break;
      case 'art':
        this.openModal(() => openLightbox('art', it.index ?? 0));
        break;
      case 'canvas':
        this.drawingOpen = true;
        this.input.enabled = false;
        this.openModal(() =>
          openDrawing(this.board, () => this.session.peerName, () => {
            this.drawingOpen = false;
            this.input.enabled = true;
          }),
        );
        break;
      case 'sit':
        if (it.sit) {
          this.sitting = it;
          this.local.mode = 'sit';
          this.local.root.position.copy(it.sit.pos);
          this.local.root.rotation.y = it.sit.yaw;
          this.vel.set(0, 0, 0);
        }
        break;
      case 'sign':
        this.openModal(() => openAbout());
        break;
      case 'rules':
        this.openModal(() => openRules());
        break;
    }
  }

  private openModal(fn: () => () => void) {
    this.closeModal?.();
    this.inviteOpen = false;
    this.input.keys.clear();
    this.closeModal = fn();
  }

  private standUp() {
    if (!this.sitting) return;
    const it = this.sitting;
    this.sitting = null;
    this.local.mode = 'ground';
    this.local.root.position.set(it.pos.x, this.world.groundAt(it.pos.x, it.pos.z) + 0.02, it.pos.z);
  }

  private inviteOpen = false;

  private invite() {
    this.openModal(() => {
      this.inviteOpen = true;
      const close = openInvite(this.session.code, this.session.inviteUrl(), () => (this.inviteOpen = false));
      return close;
    });
  }

  private openSettings() {
    this.openModal(() =>
      openSettings({
        muted: sfx.muted,
        gandas: this.gandasOn,
        character: this.local.characterId,
        name: this.session.name,
        onMute: (m) => sfx.setMuted(m),
        onGandas: (g) => {
          this.gandasOn = g;
          this.hud.setGandasVisible(g);
          try {
            localStorage.setItem('prc:gandas', g ? '1' : '0');
          } catch {
            /* ignore */
          }
        },
        onCharacter: (c) => {
          this.local.setCharacter(c);
          this.session.setIdentity(this.session.name, c);
          this.effects.emojiBurst(this.local.headPos(), '✨', 10, 0.4);
          this.hud.toast(`ولّيتي ${metaFor(c).name} ✨`, 'good');
        },
        onRename: (n) => {
          this.local.setName(n);
          this.session.setIdentity(n, this.local.characterId);
        },
        onInvite: () => setTimeout(() => this.invite(), 200),
        onLeave: () => this.onExit('leave'),
      }),
    );
  }

  private tap(x: number, y: number) {
    sfx.unlock();
    if (this.drawingOpen) return;
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam.camera);
    // interactables first
    const meshes = this.world.interactables.filter((i) => i.mesh).map((i) => i.mesh!);
    const hit = this.raycaster.intersectObjects(meshes, true)[0];
    if (hit) {
      const it = this.world.interactables.find((i) => {
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          if (o === i.mesh) return true;
          o = o.parent;
        }
        return false;
      });
      if (it) {
        if (it.pos.distanceTo(this.local.root.position.clone().setY(0)) < it.radius + 0.5) this.interact(it);
        else this.setTarget(it.pos.x, it.pos.z, it);
        return;
      }
    }
    // the ground (plane at y≈0, refined with the terrain)
    const plane = new THREE.Plane(UP, 0);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, p)) {
      const d = p.distanceTo(this.local.root.position);
      if (d < 120) this.setTarget(p.x, p.z);
    }
  }

  private setTarget(x: number, z: number, then?: Interactable) {
    this.standUp();
    this.target = { x, z, then };
    this.marker.classList.remove('hidden');
  }

  // ------------------------------------------------------------------ physics

  private waterLevel(): number {
    const p = this.local.root.position;
    return inPool(p.x, p.z) ? POOL.waterY : SEA_LEVEL;
  }

  private swimDepth(moving: number, hs: number): number {
    const s = this.local.rig.spec;
    if (this.local.rig.skinned) {
      // mocap swimmers: upright treading water when still, flat front crawl when moving
      const f = THREE.MathUtils.smoothstep(hs, 0.3, 1.2);
      return THREE.MathUtils.lerp(this.local.rig.height * 0.765, 0.24, f);
    }
    if (s.floats) return s.hipY * 0.75 + s.spine * 0.4;
    const still = s.hipY * 0.72 + s.spine + s.chest * 0.55;
    const move = s.hipY * 0.5 + 0.1;
    return THREE.MathUtils.lerp(still, move, moving);
  }

  private collide(p: THREE.Vector3, r: number) {
    for (const c of this.world.colliders) this.resolve(p, r, c);
    if (this.remote && this.session.isPeerOnline && !this.pairs.active) {
      const o = this.remote.root.position;
      const d = Math.hypot(p.x - o.x, p.z - o.z);
      const min = r + this.remote.radius;
      if (d < min && d > 1e-4 && Math.abs(p.y - o.y) < 1.2) {
        p.x = o.x + ((p.x - o.x) / d) * min;
        p.z = o.z + ((p.z - o.z) / d) * min;
      }
    }
  }

  private resolve(p: THREE.Vector3, r: number, c: Collider) {
    if (c.kind === 'circle') {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min) {
        if (d < 1e-4) {
          p.x += min;
          return;
        }
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    } else {
      const cx = THREE.MathUtils.clamp(p.x, c.x - c.hx, c.x + c.hx);
      const cz = THREE.MathUtils.clamp(p.z, c.z - c.hz, c.z + c.hz);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d < 1e-4) {
          // inside the box: push out on the shallowest axis
          const ox = c.hx - Math.abs(p.x - c.x) + r;
          const oz = c.hz - Math.abs(p.z - c.z) + r;
          if (ox < oz) p.x += Math.sign(p.x - c.x || 1) * ox;
          else p.z += Math.sign(p.z - c.z || 1) * oz;
        } else {
          p.x = cx + (dx / d) * r;
          p.z = cz + (dz / d) * r;
        }
      }
    }
  }

  private updateLocal(dt: number) {
    const av = this.local;
    const p = av.root.position;
    const mv = this.input.getMove();
    const hasInput = Math.hypot(mv.x, mv.y) > 0.08;
    if (hasInput) {
      this.target = null;
      this.marker.classList.add('hidden');
      this.standUp();
    }
    if (this.sitting) {
      av.speed = 0;
      av.mode = 'sit';
      return;
    }
    const pc = this.pairs.control(hasInput);
    if (pc === 'cancel') this.pairs.end();
    else if (pc) {
      // a moment together: glide into place and let the choreography run
      const k = 1 - Math.exp(-10 * dt);
      p.x += (pc.pos.x - p.x) * k;
      p.z += (pc.pos.z - p.z) * k;
      p.y = this.world.groundAt(p.x, p.z) + 0.02;
      let d = pc.yaw - av.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      av.root.rotation.y += d * k;
      this.vel.set(0, 0, 0);
      this.onGround = true;
      av.mode = 'ground';
      av.speed = pc.speed;
      return;
    }
    const { fwd, right } = this.cam.basis();
    const want = new THREE.Vector3();
    let speedMul = 1;
    if (hasInput) want.addScaledVector(right, mv.x).addScaledVector(fwd, mv.y);
    else if (this.target) {
      const dx = this.target.x - p.x;
      const dz = this.target.z - p.z;
      const d = Math.hypot(dx, dz);
      const then = this.target.then;
      const arrive = then ? then.radius * 0.7 : 0.35;
      if (d < arrive) {
        this.target = null;
        this.marker.classList.add('hidden');
        if (then) this.interact(then);
      } else {
        want.set(dx / d, 0, dz / d);
        speedMul = d > 6 ? 1.35 : 1;
      }
    }
    const swimming = av.mode === 'swim';
    const base = swimming ? 2.7 : mv.run || speedMul > 1 ? 7 : 4.3;
    const mag = hasInput ? Math.min(1, Math.hypot(mv.x, mv.y)) : want.lengthSq() > 0 ? 1 : 0;
    const desired = want.normalize().multiplyScalar(base * mag);
    const accel = swimming ? 4 : this.onGround ? 14 : 3;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (desired.x - this.vel.x) * k;
    this.vel.z += (desired.z - this.vel.z) * k;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.25) {
      const yaw = Math.atan2(this.vel.x, this.vel.z);
      let d = yaw - av.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      av.root.rotation.y += d * Math.min(1, dt * 12);
    }
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    this.collide(p, av.radius);
    // keep on the island shallows
    const maxR = this.world.boundRadius(p.x, p.z);
    const rr = Math.hypot(p.x, p.z);
    if (rr > maxR) {
      p.x *= maxR / rr;
      p.z *= maxR / rr;
      if (Math.random() < 0.01) this.hud.toast('ما تبعدش بزاف فالبحر 🌊', 'info');
    }

    // vertical: ground, pool, sea
    const inP = inPool(p.x, p.z);
    const terrain = terrainHeight(p.x, p.z);
    const seaSwim = !inP && terrain < SEA_LEVEL - 0.75;
    const water = inP ? POOL.waterY : SEA_LEVEL;
    const ground = inP ? POOL.floorY : this.world.groundAt(p.x, p.z);
    const moveF = THREE.MathUtils.clamp(hs / 2.4, 0, 1);
    const swimY = water - this.swimDepth(moveF, hs);
    if ((inP || seaSwim) && p.y <= swimY + 0.05 + (swimming ? 0.4 : 0)) {
      // in the water
      if (!swimming && this.vel.y < -2) {
        this.effects.splash(new THREE.Vector3(p.x, water, p.z), 1.3, water);
        if (inP) this.world.poolWater.ripple(p.x, p.z, 1.5);
        sfx.splash();
      }
      av.mode = 'swim';
      this.vel.y = 0;
      p.y += (swimY - p.y) * (1 - Math.exp(-6 * dt));
      this.onGround = false;
      if (hs > 0.8 && Math.random() < dt * 6 && inP) this.world.poolWater.ripple(p.x, p.z, 0.5);
    } else {
      if (swimming && !inP && !seaSwim) {
        // climb out onto the deck / beach
        p.y = ground + 0.02;
        this.vel.y = 2.5;
        sfx.plop();
      }
      this.vel.y -= 20 * dt;
      p.y += this.vel.y * dt;
      if (p.y <= ground + 0.02) {
        if (!this.onGround && this.vel.y < -6) this.effects.emojiBurst(p.clone().add(new THREE.Vector3(0, 0.2, 0)), '💨', 2, 0.3);
        p.y = ground + 0.02;
        this.vel.y = 0;
        this.onGround = true;
      } else if (p.y > ground + 0.25) this.onGround = false;
      av.mode = this.onGround ? 'ground' : inP && p.y < 0 ? 'ground' : 'air';
    }
    if (av.mode === 'swim' && !this.wasInWater) this.hud.toast(inP ? 'معركة المسبح! كليكي F ولا 💦 باش ترشّ 💦' : 'العومان فالبحر 🌊', 'info');
    this.wasInWater = av.mode === 'swim';
    av.speed = hs;

    // footstep puffs on sand
    if (av.mode === 'ground' && hs > 5 && terrain < -0.05) {
      this.stepTimer -= dt;
      if (this.stepTimer < 0) {
        this.stepTimer = 0.25;
        this.effects.emojiBurst(p.clone().add(new THREE.Vector3(0, 0.1, 0)), '·', 1, 0.2);
      }
    }
  }

  private updateRemote(dt: number) {
    const r = this.remote;
    if (!r) return;
    const renderT = performance.now() - 110;
    const s = this.snaps;
    let a: Snap | undefined;
    let b: Snap | undefined;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i].t <= renderT) {
        a = s[i];
        b = s[i + 1];
        break;
      }
    }
    const prev = this.lastRemotePos.copy(r.root.position);
    if (a && b) {
      const f = THREE.MathUtils.clamp((renderT - a.t) / Math.max(1, b.t - a.t), 0, 1);
      r.root.position.lerpVectors(a.p, b.p, f);
      let d = b.r - a.r;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.root.rotation.y = a.r + d * f;
      this.applyAnim(r, f < 0.5 ? a : b);
    } else if (s.length) {
      const last = s[s.length - 1];
      // smooth toward the newest snapshot (no extrapolation past 250ms)
      r.root.position.lerp(last.p, 1 - Math.exp(-12 * dt));
      let d = last.r - r.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.root.rotation.y += d * Math.min(1, dt * 10);
      this.applyAnim(r, last);
    }
    const rc = this.pairs.remoteControl();
    if (rc) {
      const k = 1 - Math.exp(-10 * dt);
      r.root.position.x += (rc.pos.x - r.root.position.x) * k;
      r.root.position.z += (rc.pos.z - r.root.position.z) * k;
      let d = rc.yaw - r.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.root.rotation.y += d * k;
      r.mode = 'ground';
      r.speed = rc.speed;
    }
    if (dt > 0) this.remoteVel.copy(r.root.position).sub(prev).divideScalar(dt).setY(0);
    if (this.remoteVel.length() > 15) this.remoteVel.setLength(15);
    // drop very old snapshots
    while (s.length > 2 && s[1].t < renderT - 1000) s.shift();
  }

  private applyAnim(r: Avatar, s: Snap) {
    r.speed = s.a === 'idle' || s.a === 'sit' ? 0 : s.v;
    r.mode = s.a === 'swim' ? 'swim' : s.a === 'sit' ? 'sit' : s.a === 'jump' ? 'air' : 'ground';
  }

  private updateNear() {
    if (this.sitting || this.drawingOpen) {
      this.near = null;
      this.hud.setPrompt(null, '', () => {});
      return;
    }
    const p = this.local.root.position;
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.world.interactables) {
      const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
      if (d < it.radius && d < bd) {
        best = it;
        bd = d;
      }
    }
    if (best !== this.near) {
      this.near = best;
      this.hud.setPrompt(best ? best.label : null, 'E', () => best && this.interact(best));
    }
    const inPoolNow = this.pool.canSplash();
    const nearBall = this.football.nearBall(p, 1.8);
    this.hud.setCtx(inPoolNow ? '💦' : nearBall ? '⚽' : best ? '✋' : '✋', inPoolNow || nearBall || !!best);
  }

  // ------------------------------------------------------------------ loop

  private frame() {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const o = this.input.consumeOrbit();
    if (o.lengthSq()) this.cam.rotate(o.x, o.y);
    const z = this.input.consumeZoom();
    if (z) this.cam.zoom(z);

    this.updateLocal(dt);
    this.updateRemote(dt);
    restorePose();
    this.local.update(dt);
    this.remote?.update(dt);
    this.pairs.update(dt);
    this.football.update(dt);
    this.pool.update(dt);
    this.effects.update(dt);
    this.world.update(this.time, dt);
    this.world.focus(this.local.root.position);
    this.board.tick();
    this.sendTimer -= dt;
    if (this.sendTimer <= 0) this.sendState();

    // look at the friend when they're close
    if (this.remote) {
      const d = this.remote.root.position.clone().sub(this.local.root.position);
      const dist = d.length();
      const rel = Math.atan2(d.x, d.z) - this.local.root.rotation.y;
      const relN = Math.atan2(Math.sin(rel), Math.cos(rel));
      this.local.lookYaw = !this.pairs.active && dist < 6 && Math.abs(relN) < 1.4 ? relN * 0.6 : 0;
    }

    const moving = this.local.speed > 0.5 && !this.target;
    // moments together: frame both friends up close
    const pair = this.pairs.active;
    const together = !!pair && pair.kind !== 'hands' && !!this.remote;
    this.cam.closeUp = together ? 1 : 0;
    const focus = together ? this.local.root.position.clone().lerp(this.remote!.root.position, 0.5) : this.local.root.position;
    this.cam.update(dt, focus, this.local.rig.height, this.local.root.rotation.y, moving && this.input.joyActive, (x, zz) => this.world.groundAt(x, zz));
    const w = innerWidth;
    const h = innerHeight;
    this.local.updateLabels(this.cam.camera, w, h);
    this.remote?.updateLabels(this.cam.camera, w, h);
    if (this.target) {
      const v = new THREE.Vector3(this.target.x, this.world.groundAt(this.target.x, this.target.z) + 0.05, this.target.z).project(this.cam.camera);
      this.marker.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
      this.marker.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
    }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.2;
      this.updateNear();
      this.onState(this.session.state);
    }
    if (!this.lowfx) this.adaptQuality(dt);
    // test mode: keep simulating every frame but only draw ~10 fps
    this.renderClock += dt;
    if (!this.lowfx || this.renderClock > 0.1) {
      this.renderClock = 0;
      if (this.composer) this.composer.render(dt);
      else this.renderer.render(this.world.scene, this.cam.camera);
    }
  }

  /** Dynamic resolution: keep phones smooth without hurting fast devices. */
  private adaptQuality(dt: number) {
    const p = this.perf;
    p.frames++;
    p.time += dt;
    if (p.time < 2.5) return;
    const fps = p.frames / p.time;
    p.frames = 0;
    p.time = 0;
    if (document.visibilityState !== 'visible') return;
    if (fps < 45 && this.composer) {
      // the post stack is the first thing to go on a struggling GPU
      this.dropPost();
    } else if (fps < 40 && p.dpr > 0.75) {
      p.dpr = Math.max(0.75, p.dpr - 0.25);
      this.renderer.setPixelRatio(p.dpr);
      this.onResize();
    } else if (fps < 26 && !p.shadowsOff) {
      p.shadowsOff = true;
      this.renderer.shadowMap.enabled = false;
      this.world.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) m.needsUpdate = true;
      });
    } else if (fps > 57 && p.dpr < p.maxDpr) {
      p.dpr = Math.min(p.maxDpr, p.dpr + 0.25);
      this.renderer.setPixelRatio(p.dpr);
      this.onResize();
    }
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    this.closeModal?.();
    this.dropPost();
    this.hud.dispose();
    this.local.dispose();
    this.remote?.dispose();
    this.renderer.dispose();
  }
}
