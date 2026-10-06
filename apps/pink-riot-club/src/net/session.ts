// A joined room: owns the realtime link, server heartbeats, peer presence,
// reconnection and the authoritative room state.

import type { CharacterId, JoinResponse, RoomState } from '../../shared/api-types.ts';
import type { Msg } from '../../shared/protocol.ts';
import type { Seat } from '../../shared/world.ts';
import { api, ApiFailure } from './api.ts';
import { Realtime, type LinkState, type RealtimeStatus } from './realtime.ts';

export const BROKERS: string[] = (
  (import.meta.env.VITE_BROKERS as string | undefined) ??
  'wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const HEARTBEAT_MS = 20_000;
const PEER_TIMEOUT_MS = 7000;

export interface Creds {
  token: string;
  seat: Seat;
  name: string;
  character: CharacterId;
}

export interface ConnStatus {
  relay: RealtimeStatus;
  links: LinkState[];
  api: 'ok' | 'retrying' | 'error';
  peer: 'online' | 'away' | 'none';
  rtt: number | null;
}

type Events = {
  msg: (m: Msg) => void;
  state: (s: RoomState) => void;
  status: (s: ConnStatus) => void;
  peer: (online: boolean, name: string | null) => void;
  resync: () => void;
  fatal: (reason: string) => void;
};

const credKey = (code: string) => `prc:cred:${code}`;

export function loadCreds(code: string): Creds | null {
  try {
    const raw = localStorage.getItem(credKey(code));
    return raw ? (JSON.parse(raw) as Creds) : null;
  } catch {
    return null;
  }
}

function saveCreds(code: string, c: Creds) {
  try {
    localStorage.setItem(credKey(code), JSON.stringify(c));
    localStorage.setItem('prc:last', code);
  } catch {
    /* private mode: reconnect after reload won't reclaim the seat, that's ok */
  }
}

export class RoomSession {
  readonly code: string;
  seat: Seat;
  token: string;
  name: string;
  character: CharacterId;
  state: RoomState;
  rt: Realtime;
  peerSeat: Seat;
  peerName: string | null = null;
  peerCharacter: CharacterId | null = null;
  private lastPeerAt = 0;
  private peerOnline = false;
  private apiStatus: ConnStatus['api'] = 'ok';
  private rtt: number | null = null;
  private timers: number[] = [];
  private listeners: { [K in keyof Events]?: Set<Events[K]> } = {};
  private lastRelay: RealtimeStatus = 'connecting';
  private closed = false;

  static async create(name: string, character: CharacterId): Promise<RoomSession> {
    const r = await api.create(name, character);
    return new RoomSession(r, name, character);
  }

  static async join(code: string, name: string, character: CharacterId): Promise<RoomSession> {
    const prev = loadCreds(code.toUpperCase());
    const r = await api.join(code, name, character, prev?.token);
    return new RoomSession(r, name, character);
  }

  private constructor(r: JoinResponse, name: string, character: CharacterId) {
    this.code = r.code;
    this.seat = r.seat;
    this.token = r.token;
    this.name = name;
    this.character = character;
    this.state = r.state;
    this.peerSeat = r.seat === 1 ? 2 : 1;
    saveCreds(r.code, { token: r.token, seat: r.seat, name, character });
    this.rt = new Realtime(BROKERS, r.topic, r.key, r.seat);
    const peer = r.state.seats.find((s) => s.seat === this.peerSeat);
    if (peer) {
      this.peerName = peer.name;
      this.peerCharacter = peer.character;
    }
  }

  on<K extends keyof Events>(ev: K, fn: Events[K]): () => void {
    const map = this.listeners as Record<string, Set<unknown> | undefined>;
    const set = (map[ev] ??= new Set<unknown>());
    set.add(fn);
    return () => void set.delete(fn);
  }

  private emit<K extends keyof Events>(ev: K, ...args: Parameters<Events[K]>) {
    const set = this.listeners[ev] as Set<(...a: Parameters<Events[K]>) => void> | undefined;
    if (set) for (const fn of set) fn(...args);
  }

  async start(): Promise<void> {
    this.rt.on((m) => this.onMsg(m));
    this.rt.onStatus((s) => {
      const was = this.lastRelay;
      this.lastRelay = s;
      if (s === 'online' && was !== 'online') {
        // (Re)connected: announce ourselves and ask the peer to answer.
        void this.sendHello(true);
        if (was === 'reconnecting' || was === 'offline') this.emit('resync');
      }
      this.emitStatus();
    });
    await this.rt.connect();
    this.timers.push(window.setInterval(() => void this.heartbeat(), HEARTBEAT_MS));
    this.timers.push(
      window.setInterval(() => {
        this.checkPeer();
        if (this.rt.status === 'online') void this.rt.send({ t: 'ping', ts: performance.now() });
      }, 2000),
    );
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') {
      void this.heartbeat();
      void this.sendHello(true);
      this.emit('resync');
    }
  };

  private onPageHide = () => {
    void this.rt.send({ t: 'bye', seat: this.seat });
  };

  send(m: Msg) {
    void this.rt.send(m);
  }

  async sendHello(reply = false) {
    await this.rt.send({ t: 'hello', seat: this.seat, name: this.name, ch: this.character, reply });
  }

  setIdentity(name: string, character: CharacterId) {
    this.name = name;
    this.character = character;
    saveCreds(this.code, { token: this.token, seat: this.seat, name, character });
    void this.sendHello(false);
    void this.heartbeat();
  }

  private onMsg(m: Msg) {
    // Anything from the peer proves they're alive.
    const fromPeer = !('seat' in m) || m.seat !== this.seat;
    if (fromPeer) this.touchPeer();
    switch (m.t) {
      case 'hello':
        if (m.seat === this.peerSeat) {
          this.peerName = m.name;
          this.peerCharacter = m.ch;
          if (m.reply) void this.sendHello(false);
        }
        break;
      case 'ping':
        void this.rt.send({ t: 'pong', ts: m.ts });
        return;
      case 'pong':
        this.rtt = Math.round(performance.now() - m.ts);
        this.emitStatus();
        return;
      case 'bye':
        if (m.seat === this.peerSeat) {
          this.lastPeerAt = 0;
          this.checkPeer();
        }
        break;
      case 'score':
        // A hint that the server state changed — fetch the real thing.
        void this.refreshState();
        break;
    }
    this.emit('msg', m);
  }

  private touchPeer() {
    this.lastPeerAt = performance.now();
    if (!this.peerOnline) {
      this.peerOnline = true;
      this.emit('peer', true, this.peerName);
      this.emitStatus();
      void this.refreshState();
    }
  }

  private checkPeer() {
    const online = performance.now() - this.lastPeerAt < PEER_TIMEOUT_MS;
    if (online !== this.peerOnline) {
      this.peerOnline = online;
      this.emit('peer', online, this.peerName);
      this.emitStatus();
    }
  }

  get isPeerOnline() {
    return this.peerOnline;
  }

  applyState(s: RoomState) {
    if (s.version < this.state.version && s.serverTime < this.state.serverTime) return;
    this.state = s;
    const peer = s.seats.find((x) => x.seat === this.peerSeat);
    if (peer && !this.peerName) this.peerName = peer.name;
    this.emit('state', s);
  }

  async refreshState() {
    try {
      const r = await api.state(this.code, this.token);
      this.apiOk();
      this.applyState(r.state);
    } catch (e) {
      this.apiFail(e);
    }
  }

  async heartbeat() {
    if (this.closed) return;
    try {
      const r = await api.heartbeat(this.code, this.token, this.name, this.character);
      this.apiOk();
      this.applyState(r.state);
    } catch (e) {
      this.apiFail(e);
      if (e instanceof ApiFailure && e.status === 401) await this.rejoin();
    }
  }

  private async rejoin() {
    try {
      const r = await api.join(this.code, this.name, this.character, this.token);
      if (r.seat !== this.seat) {
        // Seat changed under us (lease expired and the other seat was free).
        this.emit('fatal', 'seat-changed');
        return;
      }
      this.token = r.token;
      this.applyState(r.state);
      this.apiOk();
    } catch (e) {
      if (e instanceof ApiFailure && e.code === 'room-full') this.emit('fatal', 'room-full');
    }
  }

  private apiOk() {
    if (this.apiStatus !== 'ok') {
      this.apiStatus = 'ok';
      this.emitStatus();
    }
  }

  private apiFail(e: unknown) {
    const next = e instanceof ApiFailure && e.status >= 400 && e.status < 500 ? 'error' : 'retrying';
    if (this.apiStatus !== next) {
      this.apiStatus = next;
      this.emitStatus();
    }
  }

  get status(): ConnStatus {
    return {
      relay: this.rt.status,
      links: this.rt.linkStates,
      api: this.apiStatus,
      peer: this.peerOnline ? 'online' : this.peerName ? 'away' : 'none',
      rtt: this.rtt,
    };
  }

  private emitStatus() {
    this.emit('status', this.status);
  }

  inviteUrl(): string {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('room', this.code);
    return u.toString();
  }

  async leave() {
    this.closed = true;
    void this.rt.send({ t: 'bye', seat: this.seat });
    try {
      await api.leave(this.code, this.token);
    } catch {
      /* best effort */
    }
    this.dispose();
  }

  dispose() {
    this.closed = true;
    for (const t of this.timers) clearInterval(t);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('pagehide', this.onPageHide);
    this.rt.close();
  }
}
