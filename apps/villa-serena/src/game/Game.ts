// Villa Serena: loads the SketchUp kit and builds the island, then runs the
// world — a fixed-step Rapier simulation (characters, props, buoyancy, the
// buggy, the boat, the swing) rendered with interpolation every frame.
import * as THREE from 'three';
import { Atmosphere } from '../engine/sky.ts';
import { Kit } from '../engine/kit.ts';
import { Physics, RAPIER, GROUP } from '../engine/physics.ts';
import { makeSea, type WaterUniforms } from '../engine/water.ts';
import { patternMaps, tiled } from '../engine/texgen.ts';
import { Avatar, preloadAvatar, type AvatarId, type Emote } from '../player/avatar.ts';
import { FollowCamera } from '../player/camera.ts';
import { CAPSULE, CharacterController, type MoveIntent } from '../player/controller.ts';
import { Input, type Action } from '../player/input.ts';
import { buildGround } from '../world/ground.ts';
import { Grass } from '../world/grass.ts';
import { Foliage } from '../world/foliage.ts';
import { PIER_END, SPAWNS } from '../world/layout.ts';
import { coastZ, sampleGrid, type Grid } from '../world/terrain.ts';
import { World, placementMatrix, type DynamicProp, type SeatSpot } from '../world/World.ts';
import { Audio } from './audio.ts';
import { Buggy } from './buggy.ts';
import { Buoyancy, boxFloater } from './buoyancy.ts';
import { Rowboat } from './boat.ts';
import { NightLights } from './lights.ts';
import { LocalPlayer } from './player.ts';
import { PropSystem, canCarry, isBall } from './props.ts';
import { Swing } from './swing.ts';
import { Waterline } from './waterline.ts';
import type { Hud, Hint, TravelSpot } from '../ui/hud.ts';
import { NetSync } from '../net/sync.ts';

export type Quality = 'high' | 'low';

export interface GameOptions {
  canvas: HTMLCanvasElement;
  name: string;
  avatar: AvatarId;
  room: string | null;
  quality: Quality;
  hud: Hud;
  onProgress: (f: number, label: string) => void;
}

const EMOTE_KEYS: Emote[] = ['wave', 'dance', 'cheer', 'bow', 'backflip', 'yes'];

const NAMES: Record<string, string> = {
  DiningChair: 'chair',
  BarStool: 'stool',
  Lantern: 'lantern',
  BeachBall: 'beach ball',
  Football: 'football',
  Crate: 'crate',
  Surfboard: 'surfboard',
  Pawn: 'pawn',
  Rook: 'rook',
  Knight: 'knight',
  Bishop: 'bishop',
  Queen: 'queen',
  King: 'king',
};

const SEAT_VERB: Record<SeatSpot['kind'], string> = {
  chair: 'Sit',
  stool: 'Sit',
  bed: 'Sit',
  lounger: 'Lie back',
  swing: 'Swing',
  driver: 'Drive',
  passenger: 'Ride along',
  rower: 'Row',
  boat: 'Get in',
};

/** Where to try standing up, in the seat's frame (x right, z forward), best first. */
const SEAT_EXITS: Array<[number, number]> = [[0, 0.6], [0.65, 0], [-0.65, 0], [0.5, 0.5], [-0.5, 0.5], [0, 1.3], [1, 0.3], [-1, 0.3], [0, -0.7], [0.9, 1.1], [-0.9, 1.1]];
const LOUNGER_EXITS: Array<[number, number]> = [[0.75, 0.2], [-0.75, 0.2], [0, 1.4], [1.1, 0.6], [-1.1, 0.6]];

/** Camera turn (from straight behind) and pitch when arriving at a spot. */
const TRAVEL_VIEW: Record<string, [number, number]> = {
  pool: [-0.6, 0.22],
  loggia: [0.35, 0.32],
  lighthouse: [0.3, 0.42],
  gallery: [0.9, 0.18],
  garden: [0.25, 0.3],
};

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly physics: Physics;
  readonly kit: Kit;
  readonly world: World;
  readonly grid: Grid;
  readonly sky: Atmosphere;
  readonly cam: FollowCamera;
  readonly input: Input;
  readonly water: Waterline;
  readonly props: PropSystem;
  readonly buoyancy: Buoyancy;
  readonly buggy: Buggy;
  readonly boat: Rowboat;
  readonly swing: Swing;
  readonly lights: NightLights;
  readonly grass: Grass;
  readonly foliage: Foliage;
  readonly audio = new Audio();
  readonly player: LocalPlayer;
  readonly net: NetSync;
  readonly seats = new Map<string, SeatSpot>();
  readonly mobile: boolean;
  private sea: { mesh: THREE.Mesh; uniforms: WaterUniforms };
  private clock = new THREE.Clock();
  readonly hud: Hud;
  private walkMode = false;
  hours = 18.5;
  dayCycle = false;
  private frameTimes: number[] = [];
  private pixelRatio: number;
  private underwater = false;
  private fogDensity = 0;
  private focus = new THREE.Vector3();
  private t = 0;
  private pendingJump = false;
  private kickPending: { at: number } | null = null;
  private releaseAt: { held: NonNullable<LocalPlayer['held']>; v: THREE.Vector3; at: number } | null = null;
  photo = false;

  static async start(o: GameOptions): Promise<Game> {
    const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: o.quality === 'high', powerPreference: 'high-performance' });
    const tm = new URLSearchParams(location.search).get('tm');
    renderer.toneMapping = tm === 'agx' ? THREE.AgXToneMapping : tm === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const ratio = Math.min(devicePixelRatio, o.quality === 'high' ? 1.75 : 1.25);
    renderer.setPixelRatio(ratio);
    renderer.setSize(innerWidth, innerHeight, false);
    o.onProgress(0.02, 'Starting physics');
    const physics = await Physics.create();
    o.onProgress(0.06, 'Loading the SketchUp models');
    const texSize = o.quality === 'high' ? 512 : 256;
    preloadAvatar(o.avatar).catch(() => {});
    const kit = await Kit.load(`${import.meta.env.BASE_URL}models/kit.glb`, renderer, { texSize, physical: o.quality === 'high' }, (f) => o.onProgress(0.06 + f * 0.5, 'Loading the SketchUp models'));
    o.onProgress(0.6, 'Shaping the island');
    await frame();
    const grid = sampleGrid();
    o.onProgress(0.68, 'Building the villa');
    await frame();
    const avatar = await Avatar.create(o.avatar);
    o.onProgress(0.8, 'Placing everything');
    await frame();
    const g = new Game(o, renderer, physics, kit, grid, avatar, texSize, ratio);
    o.onProgress(0.95, 'Lighting the scene');
    await frame();
    // compile shaders before the first visible frame
    await renderer.compileAsync(g.scene, g.cam.camera);
    o.onProgress(1, 'Ready');
    return g;
  }

  private constructor(o: GameOptions, renderer: THREE.WebGLRenderer, physics: Physics, kit: Kit, grid: Grid, avatar: Avatar, texSize: number, ratio: number) {
    this.renderer = renderer;
    this.physics = physics;
    this.kit = kit;
    this.grid = grid;
    this.hud = o.hud;
    this.pixelRatio = ratio;
    this.mobile = matchMedia('(pointer: coarse)').matches;

    // sky, light, ground, sea
    this.sky = new Atmosphere(renderer, this.scene);
    if (o.quality === 'low') this.sky.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(buildGround(renderer, grid, texSize));
    this.sea = makeSea(renderer, grid, texSize);
    this.scene.add(this.sea.mesh);
    physics.addTerrain(grid);

    // the SketchUp world
    this.world = new World(kit, physics, renderer, texSize);
    this.scene.add(this.world.root);
    this.water = new Waterline(grid, this.world);
    this.buoyancy = new Buoyancy(this.water);
    this.props = new PropSystem(physics, this.world);
    for (const d of this.world.dynamics) this.addFloater(d);

    // vehicles and the swing
    const bug = this.world.special.get('buggy')!;
    this.buggy = new Buggy(physics, kit, bug.matrix);
    this.world.root.add(this.buggy.object);
    this.world.addSeats('buggy', 'Buggy', this.buggy.template, null, this.buggy.object, undefined, 1.6);
    const moor = this.world.markers.find((m) => m.marker.kind === 'MOOR');
    const moorAt = moor ? moor.world.clone() : new THREE.Matrix4().makeTranslation(PIER_END.x - 4.4, 0, PIER_END.z - 0.8);
    moorAt.elements[13] = 0;
    this.boat = new Rowboat(physics, kit, moorAt, this.buoyancy);
    this.world.root.add(this.boat.object);
    this.world.addSeats('rowboat', 'Rowboat', kit.get('Rowboat'), null, this.boat.object, undefined, 2.7);
    const sw = this.world.special.get('swing-frame')!;
    const rope = new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 0.9, ...tiled(patternMaps(renderer, 'rope', texSize), 0.08) });
    this.swing = new Swing(physics, kit, placementMatrix(sw.placement), this.world.root, rope);
    this.world.addSeats('swing', 'SwingSeat', kit.get('SwingSeat'), null, this.swing.object, undefined, 1.4);
    for (const s of this.world.seats) this.seats.set(s.id, s);

    this.lights = new NightLights(this.scene, this.world, o.quality === 'high' ? 6 : 3);
    this.grass = new Grass(grid, this.world.floors, this.world.footprints, o.quality === 'high' ? { radius: 30, spacing: 0.17 } : { radius: 16, spacing: 0.22 });
    this.scene.add(this.grass.mesh);
    this.world.floors.length = 0; // only needed to plant the grass
    this.foliage = new Foliage(this.world.leaves, o.quality === 'high' ? 1 : 0.6);
    this.world.leaves.length = 0;
    this.scene.add(this.foliage.mesh);

    // you
    this.cam = new FollowCamera(physics, this.mobile);
    const spawn = this.spawnPoint('pool');
    const ctrl = new CharacterController(
      physics,
      { surfaceAt: (p) => this.water.surfaceAt(p), surfaceKind: (p) => this.water.surfaceKind(p) },
      {
        jump: () => this.player?.avatar.play('jump'),
        land: (v) => {
          if (v < 0) return this.respawn();
          if (v > 3.5) this.player.avatar.play('land');
          this.audio.land(v);
        },
        splash: (v, at) => this.audio.splash(v, at),
        step: (s) => this.audio.step(s),
        climb: () => this.player.avatar.play('pickup'),
        bump: (c, n, speed) => {
          const b = c.parent();
          if (b) this.props.bump(b, new THREE.Vector3(-n.x, 0, -n.z), speed, this.t);
        },
      },
      spawn.pos,
      spawn.yaw,
    );
    const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    this.player = new LocalPlayer(id, o.name, o.avatar, avatar, ctrl);
    this.scene.add(avatar.root);
    this.player.update(0, 1);
    // first view: over your shoulder across the infinity pool to the cove
    this.frameView('pool', spawn.yaw);
    this.cam.resize(innerWidth, innerHeight);

    // input
    const $ = (s: string) => document.getElementById(s) as HTMLElement;
    this.input = new Input(o.canvas, $('stick-zone'), $('stick-base'), $('stick-knob'));
    this.input.onAction = (a) => this.action(a);

    // fixed-step simulation
    physics.preStep.push((dt) => this.fixedStep(dt));
    physics.postStep.push(() => {
      this.buoyancy.clear();
      this.swing.clear();
    });

    this.net = new NetSync(this, o.room);
    this.setTime(this.hours);
    addEventListener('resize', this.onResize);
  }

  // ---------------------------------------------------------------- setup
  private addFloater(d: DynamicProp) {
    const a = d.placement.asset;
    const b = d.template.bounds;
    const s = d.object.scale.x;
    const min = b.min.clone().multiplyScalar(s);
    const max = b.max.clone().multiplyScalar(s);
    const fill: Record<string, number> = { BeachBall: 0.52, Football: 0.52, Lantern: 0.04, Crate: 0.7, Barrel: 0.75, Kayak: 0.45, Surfboard: 0.9, BarStool: 0.06 };
    const f = fill[a] ?? (['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'].includes(a) ? 0.3 : 0.14);
    const long = a === 'Kayak' || a === 'Surfboard';
    const fl = boxFloater(d.link.body, min, max, f, long ? 1 : 2, long ? 3 : 2, long ? new THREE.Vector3(120, 120, 8) : new THREE.Vector3(20, 40, 20));
    this.buoyancy.add(fl);
    // impact sounds for anything that can fall or be thrown
    for (let i = 0; i < d.link.body.numColliders(); i++) {
      const c = d.link.body.collider(i);
      c.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
      c.setContactForceEventThreshold((d.placement.mass ?? 10) * 40);
    }
  }

  spawnPoint(name: string): { pos: THREE.Vector3; yaw: number } {
    const marker = (asset: string, n: string) => this.world.markers.find((m) => m.placement.asset === asset && m.marker.kind === 'SPAWN' && m.marker.name === n);
    const fromMarker = (m: ReturnType<typeof marker>) => {
      const pos = new THREE.Vector3().setFromMatrixPosition(m!.world);
      const z = new THREE.Vector3(0, 0, 1).transformDirection(m!.world);
      return { pos: pos.add(new THREE.Vector3(0, 0.05, 0)), yaw: Math.atan2(z.x, z.z) };
    };
    /** A doorway spot: step out by `d` metres and turn round to face the building. */
    const facing = (s: { pos: THREE.Vector3; yaw: number }, d: number) => ({
      pos: s.pos.add(new THREE.Vector3(Math.sin(s.yaw) * d, 0.1, Math.cos(s.yaw) * d)),
      yaw: s.yaw + Math.PI,
    });
    switch (name) {
      case 'loggia':
        return facing(fromMarker(marker('Villa', 'loggia')), 1.2);
      case 'pool':
        return fromMarker(marker('Terrace', 'terrace'));
      case 'door':
        return fromMarker(marker('Villa', 'door'));
      case 'lighthouse':
        return facing(fromMarker(marker('Lighthouse', 'door')), 2.5);
      case 'gallery':
        return fromMarker(marker('Lighthouse', 'gallery'));
      case 'roof': {
        const v = SPAWNS.loggia;
        return { pos: new THREE.Vector3(v.x - 3.4, v.y + 3.79, v.z + 0.6), yaw: 0 };
      }
      case 'garden':
        return { pos: new THREE.Vector3(-8, 4.55, 20), yaw: -1.25 }; // the chess board, the sea on the left
      case 'beach':
        return { pos: new THREE.Vector3(SPAWNS.beach.x, SPAWNS.beach.y + 0.1, SPAWNS.beach.z), yaw: 0 };
      case 'pier':
        return { pos: new THREE.Vector3(PIER_END.x, PIER_END.y + 0.05, PIER_END.z - 1), yaw: 0 };
      case 'buggy': {
        const p = this.buggy.position;
        return { pos: new THREE.Vector3(p.x + 1.6, p.y + 0.3, p.z + 1.6), yaw: this.buggy.heading };
      }
    }
    return fromMarker(marker('Villa', 'loggia'));
  }

  travelSpots(): TravelSpot[] {
    const spots: TravelSpot[] = [
      { id: 'loggia', label: 'Villa loggia' },
      { id: 'pool', label: 'Infinity pool' },
      { id: 'roof', label: 'Roof terrace' },
      { id: 'garden', label: 'Garden & chess' },
      { id: 'beach', label: 'Beach bar' },
      { id: 'pier', label: 'Pier & rowboat' },
      { id: 'lighthouse', label: 'Lighthouse' },
      { id: 'gallery', label: 'Lighthouse gallery' },
      { id: 'buggy', label: 'Buggy' },
    ];
    for (const r of this.net.remotes.values()) spots.push({ id: `peer:${r.id}`, label: `Join ${r.name}` });
    return spots;
  }

  travel(id: string) {
    if (this.player.seat) this.leaveSeat(true);
    if (this.player.held) this.dropHeld();
    let at: { pos: THREE.Vector3; yaw: number };
    if (id.startsWith('peer:')) {
      const r = this.net.remotes.get(id.slice(5));
      if (!r) return;
      const back = new THREE.Vector3(-Math.sin(r.yaw), 0, -Math.cos(r.yaw)).multiplyScalar(1.2);
      at = { pos: r.position.clone().add(back).add(new THREE.Vector3(0, 0.3, 0)), yaw: r.yaw };
    } else at = this.spawnPoint(id);
    this.player.ctrl.teleport(at.pos, at.yaw);
    this.frameView(id, at.yaw);
  }

  /** Starts the camera where a spot's view opens up (not inside a doorway). */
  private frameView(id: string, yaw: number) {
    const [turn, pitch] = TRAVEL_VIEW[id] ?? [0, 0.28];
    this.cam.snapBehind(yaw + turn);
    this.cam.pitch = pitch;
  }

  private respawn() {
    this.travel('loggia');
    this.hud.toast('Back at the villa');
  }

  setTime(h: number, cycle = this.dayCycle, broadcast = false) {
    this.hours = ((h % 24) + 24) % 24;
    this.dayCycle = cycle;
    this.sky.setTime(this.hours);
    if (broadcast) this.net.sendTime();
  }

  // ---------------------------------------------------------------- input
  action(a: Action) {
    this.audio.unlock();
    const p = this.player;
    switch (a) {
      case 'jump':
        if (!p.seat) this.pendingJump = true;
        break;
      case 'interact':
        this.interact();
        break;
      case 'grab':
        this.grab();
        break;
      case 'drop':
        if (p.held) this.dropHeld();
        break;
      case 'kick':
        if (!p.seat && !p.held && !this.kickPending) {
          p.play('kick');
          this.kickPending = { at: this.t + 0.32 };
        }
        break;
      case 'walk':
        this.walkMode = !this.walkMode;
        this.hud.toast(this.walkMode ? 'Walking' : 'Jogging');
        break;
      case 'reset':
        if (p.seat?.kind === 'driver') this.buggy.reset((x, z) => this.water.ground(x, z));
        break;
      case 'menu':
        // Esc closes whatever is open first, then opens the settings
        if (this.hud.panelOpen) this.hud.closeAll();
        else this.hud.toggle('menu');
        break;
      case 'map':
        this.hud.toggle('travel');
        break;
      case 'help':
        this.hud.toggle('help');
        break;
      case 'photo':
        this.photo = !this.photo;
        this.hud.setPhoto(this.photo);
        break;
      default:
        if (a.startsWith('emote')) this.emote(EMOTE_KEYS[Number(a.slice(5)) - 1]);
    }
  }

  emote(e: Emote) {
    const p = this.player;
    if (p.ctrl.mode === 'swim' || p.ctrl.isClimbing) return;
    if (p.seat && !['wave', 'yes', 'cheer'].includes(e)) return;
    if (p.held && e !== 'wave' && e !== 'yes') return;
    p.play(e, e === 'dance');
  }

  private nearestSeat(): SeatSpot | null {
    const p = this.player;
    const at = p.feet;
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    let best: SeatSpot | null = null;
    let bestD = Infinity;
    for (const s of this.world.seats) {
      if (s.occupied) continue;
      v.setFromMatrixPosition(s.frame(m));
      const dy = v.y - at.y;
      if (dy > 1.3 || dy < -(s.reach > 2 ? 2.2 : 0.6)) continue;
      const d = Math.hypot(v.x - at.x, v.z - at.z);
      if (d < s.reach && d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  interact() {
    const p = this.player;
    if (p.seat) return this.leaveSeat();
    if (p.held) return this.dropHeld();
    if (p.ctrl.isClimbing) return;
    const s = this.nearestSeat();
    if (s) this.takeSeat(s);
  }

  private takeSeat(s: SeatSpot) {
    const p = this.player;
    p.avatar.stopEmote();
    p.sit(s);
    s.occupied = p.id;
    if (s.kind === 'driver') {
      this.buggy.occupied.driver = p.id;
      this.net.claimVehicle('buggy');
      this.cam.setMode('vehicle');
      this.hud.toast('W/S throttle · A/D steer · Space brake · R reset');
    } else if (s.kind === 'passenger') {
      this.buggy.occupied.passenger = p.id;
      this.cam.setMode('vehicle');
    } else if (s.kind === 'rower' || s.kind === 'boat') {
      if (s.kind === 'rower') {
        this.boat.occupied.row = p.id;
        this.net.claimVehicle('rowboat');
        this.hud.toast('W/S row · A/D turn');
      } else this.boat.occupied.stern = p.id;
      this.cam.setMode('boat');
    } else if (s.kind === 'swing') {
      this.net.claimVehicle('swing');
      this.cam.setMode('seat');
      this.hud.toast('W/S to swing higher');
    } else this.cam.setMode('seat');
    this.syncLoads();
  }

  /** Where you end up when you get off a seat. */
  private exitPoint(s: SeatSpot): { pos: THREE.Vector3; yaw: number } {
    const f = s.frame(new THREE.Matrix4());
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    f.decompose(pos, q, new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const yaw = Math.atan2(fwd.x, fwd.z);
    let off: THREE.Vector3;
    if (s.kind === 'driver') off = new THREE.Vector3(1.05, 0, 0.1);
    else if (s.kind === 'passenger') off = new THREE.Vector3(-1.05, 0, 0.1);
    else if (s.kind === 'rower' || s.kind === 'boat') {
      // back onto the pier if the boat is alongside it
      const deck = this.boat.moorPoint.clone().add(new THREE.Vector3(2.2, 1.32, 0));
      if (pos.distanceTo(deck) < 5) return { pos: deck, yaw: Math.PI / 2 };
      off = new THREE.Vector3(1.3, 0, 0);
    } else {
      // stand up in front of the seat, else beside it, past the coffee table
      // or behind it: on the floor, never on the table, the counter or a
      // neighbouring seat, and preferably clear of anything in the way
      const tries = s.kind === 'lounger' ? LOUNGER_EXITS : SEAT_EXITS;
      let onFloor: THREE.Vector3 | null = null;
      for (const [x, z] of tries) {
        const out = this.standAt(pos, q, new THREE.Vector3(x, 0, z));
        const drop = pos.y - out.y;
        if (drop < 0.2 || drop > 1.2) continue;
        if (this.physics.fits(out, CAPSULE.radius, CAPSULE.half)) return { pos: out, yaw };
        onFloor ??= out;
      }
      if (onFloor) return { pos: onFloor, yaw };
      off = new THREE.Vector3(tries[0][0], 0, tries[0][1]);
    }
    const out = this.standAt(pos, q, off);
    if (s.kind === 'rower' || s.kind === 'boat') out.y = Math.max(out.y, this.water.sea(out.x, out.z) - 1.2 + 0.04);
    return { pos: out, yaw };
  }

  /** Where your feet land at an offset (in the seat's frame) from a seat. */
  private standAt(pos: THREE.Vector3, q: THREE.Quaternion, off: THREE.Vector3): THREE.Vector3 {
    const out = off.clone().applyQuaternion(q).add(pos);
    out.y = pos.y + 0.6;
    const hit = this.physics.ray(out, new THREE.Vector3(0, -1, 0), 3.5, GROUP.STATIC | GROUP.DYNAMIC);
    out.y = hit === null ? Math.max(this.water.ground(out.x, out.z), pos.y - 0.5) : out.y - hit;
    return out.add(new THREE.Vector3(0, 0.04, 0));
  }

  private leaveSeat(silent = false) {
    const p = this.player;
    const s = p.seat;
    if (!s) return;
    const out = this.exitPoint(s);
    s.occupied = null;
    if (this.buggy.occupied.driver === p.id) this.buggy.occupied.driver = null;
    if (this.buggy.occupied.passenger === p.id) this.buggy.occupied.passenger = null;
    if (this.boat.occupied.row === p.id) {
      this.boat.occupied.row = null;
      this.boat.input = { x: 0, y: 0 };
      if (this.boat.position.distanceTo(this.boat.moorPoint) < 6) this.boat.tie();
    }
    if (this.boat.occupied.stern === p.id) this.boat.occupied.stern = null;
    this.swing.pump = 0;
    p.stand(out.pos, out.yaw);
    this.cam.setMode('foot');
    if (!silent) p.avatar.play('standUp');
    this.syncLoads();
  }

  /** People add weight to the boat and the swing. */
  private boatLoad = 0;
  syncLoads() {
    let swing = 0;
    let boat = 0;
    for (const s of this.world.seats) {
      if (!s.occupied) continue;
      if (s.kind === 'swing') swing++;
      if (s.kind === 'rower' || s.kind === 'boat') boat++;
    }
    if (swing !== this.swing.riders) this.swing.setRiders(swing);
    if (boat !== this.boatLoad) {
      this.boatLoad = boat;
      this.boat.setLoad(boat);
    }
  }

  grab() {
    const p = this.player;
    if (p.seat || p.ctrl.isClimbing || p.ctrl.mode === 'swim' || this.releaseAt) return;
    if (p.held) {
      const v = this.props.throwVelocity(p.held, p.yaw, p.ctrl.velocity);
      p.play('throw');
      // let go mid-swing of the throwing arm (keeps following the hands until then)
      this.releaseAt = { held: p.held, v, at: this.t + 0.28 };
      return;
    }
    const prop = this.props.nearest(p.feet, p.yaw, 1.05, canCarry);
    if (!prop) return;
    this.net.claim(prop);
    p.held = this.props.pickUp(prop, p.id, p.yaw);
    p.ctrl.ignore.add(prop.link.body.handle);
  }

  private dropHeld() {
    const p = this.player;
    if (!p.held) return;
    this.releaseAt = null;
    this.props.placeDown(p.held, p.feet, p.yaw);
    p.ctrl.ignore.delete(p.held.prop.link.body.handle);
    p.held = null;
  }

  // ------------------------------------------------------------- simulation
  private fixedStep(dt: number) {
    this.water.time += dt;
    const p = this.player;
    p.ctrl.step(dt, this.water.time);
    if (p.held) this.props.hold(p.held, p.ctrl.position, p.ctrl.yaw);
    this.buggy.step(dt);
    this.boat.step(dt);
    this.swing.step(dt);
    this.buoyancy.step(dt);
    // a thrown prop stops being ignored once it has left your hands
    for (const h of [...p.ctrl.ignore]) {
      const d = this.world.dynamics.find((x) => x.link.body.handle === h);
      if (!d || (!d.heldBy && d.object.position.distanceTo(p.ctrl.position) > 1.6)) p.ctrl.ignore.delete(h);
    }
  }

  private intent(): MoveIntent {
    const m = this.input.getMove();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.cam.basis(fwd, right);
    const dir = fwd.multiplyScalar(m.y).addScaledVector(right, m.x);
    const pace = m.sprint ? 'sprint' : this.walkMode && !m.analog ? 'walk' : 'jog';
    const jump = this.pendingJump;
    this.pendingJump = false;
    return { dir, pace, jump };
  }

  // ----------------------------------------------------------------- frame
  run() {
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame() {
    this.tick(Math.min(this.clock.getDelta(), 0.1), true);
  }

  /** One frame of the game. Tests call it with render=false to simulate quickly. */
  tick(dt: number, render: boolean) {
    this.t += dt;
    const p = this.player;
    this.input.poll(dt);
    const look = this.input.consumeLook();
    this.cam.look(look.x, look.y);
    this.cam.zoom(this.input.consumeZoom());

    // controls → the thing you are driving or your own body
    const seat = p.seat;
    if (seat?.kind === 'driver' && this.buggy.local) this.buggy.input = this.input.getDrive();
    else if (seat?.kind === 'rower') {
      const m = this.input.getMove();
      this.boat.input = { x: m.x, y: m.y };
    } else if (seat?.kind === 'swing') this.swing.pump = this.input.getMove().y;
    else if (!seat) p.ctrl.setIntent(this.intent());

    if (this.kickPending && this.t >= this.kickPending.at) {
      this.kickPending = null;
      const k = this.props.kick(p.ctrl.position, p.ctrl.yaw);
      if (k) {
        this.net.claim(k);
        this.audio.impact(isBall(k) ? 900 : 3000, k.object.position, !isBall(k));
      }
    }
    if (this.releaseAt && this.t >= this.releaseAt.at) {
      const r = this.releaseAt;
      this.releaseAt = null;
      if (p.held === r.held) p.held = null;
      this.props.release(r.held, r.v, 4);
      this.audio.whoosh();
    }
    if (this.buggy.flipped && seat?.kind === 'driver') this.hud.toast('Press R to put the buggy back on its wheels');

    this.net.beforePhysics();
    this.physics.update(dt);
    this.drainEvents();
    this.scene.updateMatrixWorld();

    if (this.dayCycle) this.setTime(this.hours + dt / 60); // one in-game hour per real minute
    this.sea.uniforms.uTime.value = this.water.time;

    // people
    p.lookYaw = this.headTarget();
    p.update(dt, this.physics.alpha);
    if (seat?.kind === 'driver' || seat?.kind === 'passenger') {
      p.avatar.pose.steer = seat.kind === 'driver' ? 1 : 0;
      p.avatar.pose.steerAngle = this.buggy.steer;
    }
    if (seat?.kind === 'rower') {
      p.avatar.pose.row = this.boat.rowing > 0.05 ? 1 : 0.6;
      p.avatar.pose.rowPhase = this.boat.phase;
    }
    this.net.update(dt);
    this.buggy.updateVisual(dt);
    this.boat.updateVisual();
    this.swing.updateVisual();

    // camera
    const mode = this.cam.mode;
    let focus = p.position;
    let heading = p.yaw;
    let follow = 0;
    if (mode === 'vehicle') {
      focus = this.buggy.position;
      heading = this.buggy.heading;
      follow = Math.abs(this.buggy.speed) > 1 ? 2.2 : 0;
    } else if (mode === 'boat') {
      focus = this.boat.position;
      heading = this.boat.heading + Math.PI;
      follow = this.boat.rowing > 0.2 ? 0.8 : 0;
    } else if (mode === 'foot' && p.ctrl.speed > 0.5) follow = this.mobile ? 1.1 : 0.45;
    this.focus.copy(focus);
    this.cam.update(dt, this.focus, heading, follow, this.input.lookIdle, (x, z) => this.water.ground(x, z));
    // in tight spots (a doorway, the lighthouse gallery) the view goes first-person
    p.avatar.root.visible = mode !== 'foot' || this.cam.distance > 0.85;
    this.sky.follow(this.focus);
    this.underwaterFog();

    this.lights.update(this.t, this.sky.state.daylight, this.cam.camera.position);
    this.grass.update(this.t, this.cam.camera.position.clone().lerp(this.focus, 0.6));
    this.foliage.update(this.t);
    this.audio.listener.copy(this.cam.camera.position);
    this.audio.update(dt, {
      coast: Math.abs(coastZ(this.focus.x) - this.focus.z),
      height: this.focus.y,
      night: 1 - this.sky.state.daylight,
      time: this.t,
      engine: this.buggy.occupied.driver ? this.buggy.speed : null,
      throttle: this.buggy.input.throttle,
    });
    this.updateHud();
    if (!render) return;
    this.renderer.render(this.scene, this.cam.camera);
    this.adaptResolution(dt);
  }

  /** Test hook: stop the render loop (simulate with tick, draw with renderOnce). */
  pause() {
    this.renderer.setAnimationLoop(null);
  }

  renderOnce() {
    this.renderer.render(this.scene, this.cam.camera);
  }

  /** The head turns to your partner when they're near, otherwise where you look. */
  private headTarget(): number {
    const p = this.player;
    const yaw = p.yaw;
    for (const r of this.net.remotes.values()) {
      const d = r.position.clone().sub(p.position);
      if (d.length() < 6) {
        let a = Math.atan2(d.x, d.z) - yaw;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < 1.7) return a;
      }
    }
    let a = this.cam.yaw + Math.PI - yaw;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) < 1.2 ? a * 0.7 : 0;
  }

  private drainEvents() {
    const w = this.physics.world;
    this.physics.eventQueue.drainContactForceEvents((e) => {
      const c = w.getCollider(e.collider1());
      const c2 = w.getCollider(e.collider2());
      const body = c?.parent()?.isDynamic() ? c.parent() : c2?.parent();
      if (!body) return;
      const t = body.translation();
      this.audio.impact(e.totalForceMagnitude(), new THREE.Vector3(t.x, t.y, t.z), body.mass() > 12);
    });
    this.physics.eventQueue.drainCollisionEvents(() => {});
  }

  private underwaterFog() {
    const c = this.cam.camera.position;
    const s = this.water.surfaceAt(c);
    const under = s !== null && c.y < s - 0.05;
    const fog = this.scene.fog as THREE.FogExp2;
    if (under !== this.underwater) {
      this.underwater = under;
      if (under) this.fogDensity = fog.density;
      else {
        fog.density = this.fogDensity;
        this.sky.setTime(this.hours);
      }
    }
    if (under) {
      fog.color.set('#0f5a63').multiplyScalar(0.35 + 0.65 * this.sky.state.daylight);
      fog.density = 0.12;
    }
  }

  private updateHud() {
    const hints: Hint[] = [];
    const p = this.player;
    const seat = p.seat;
    if (seat) {
      hints.push({ key: 'E', label: 'Get up', action: 'interact' });
    } else if (p.held) {
      hints.push({ key: 'F', label: 'Throw', action: 'grab' }, { key: 'Q', label: 'Put down', action: 'drop' });
    } else if (!p.ctrl.isClimbing) {
      if (p.ctrl.mode === 'swim') {
        hints.push({ key: 'Space', label: 'Climb out', action: 'jump' });
      } else {
        const s = this.nearestSeat();
        if (s) hints.push({ key: 'E', label: SEAT_VERB[s.kind], action: 'interact' });
        const prop = this.props.nearest(p.feet, p.yaw, 1.05, canCarry);
        if (prop) hints.push({ key: 'F', label: `Pick up ${NAMES[prop.placement.asset] ?? 'it'}`, action: 'grab' });
        const ball = this.props.nearest(p.feet, p.yaw, 1.0, () => true);
        if (ball && isBall(ball)) hints.push({ key: 'K', label: 'Kick', action: 'kick' });
      }
    }
    this.hud.setHints(hints, seat ? (seat.kind === 'driver' ? 'drive' : 'seat') : p.held ? 'carry' : p.ctrl.mode === 'swim' ? 'swim' : 'foot');
    // name tags over the other players
    const tags = [];
    const v = new THREE.Vector3();
    for (const r of this.net.remotes.values()) {
      if (!r.avatar) continue;
      v.copy(r.avatar.root.position);
      v.y += r.avatar.height + 0.32;
      const dist = v.distanceTo(this.cam.camera.position);
      v.project(this.cam.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      tags.push({ id: r.id, name: r.name, x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, onScreen: on, behind: v.z >= 1, dist });
    }
    this.hud.setTags(tags);
  }

  /** Lowers the render resolution if frames get slow (and restores it). */
  private adaptResolution(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    const max = Math.min(devicePixelRatio, 1.75);
    let r = this.renderer.getPixelRatio();
    if (avg > 1 / 40 && r > 0.75) r = Math.max(0.75, r - 0.15);
    else if (avg < 1 / 58 && r < Math.min(max, this.pixelRatio)) r = Math.min(this.pixelRatio, r + 0.1);
    else return;
    this.renderer.setPixelRatio(r);
    this.renderer.setSize(innerWidth, innerHeight, false);
  }

  private onResize = () => {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.cam.resize(innerWidth, innerHeight);
  };

  /** Applies settings from the menu. */
  setQuality(q: Quality) {
    this.pixelRatio = Math.min(devicePixelRatio, q === 'high' ? 1.75 : 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.shadowMap.enabled = true;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.net.dispose();
    removeEventListener('resize', this.onResize);
  }
}

function frame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
