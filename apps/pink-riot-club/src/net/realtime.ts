// Realtime relay over MQTT-over-WebSocket. Connects to every configured relay
// at once and publishes each message to all of them; the receiver drops
// duplicates by (sender, seq). If one relay dies the game keeps going on the
// other with no handover. Payloads are AES-GCM encrypted with the room key.

import mqtt, { type MqttClient } from 'mqtt';
import type { Envelope, Msg } from '../../shared/protocol.ts';

export type LinkState = 'connecting' | 'up' | 'down';
export type RealtimeStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';

interface Link {
  url: string;
  client: MqttClient;
  state: LinkState;
  everUp: boolean;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class Realtime {
  private links: Link[] = [];
  private key!: CryptoKey;
  private seq = 0;
  private seen = new Map<string, { max: number; recent: Set<number> }>();
  private handlers = new Set<(m: Msg, from: string) => void>();
  private statusHandlers = new Set<(s: RealtimeStatus, links: LinkState[]) => void>();
  private everOnline = false;
  private closed = false;
  readonly senderId: string;
  private topicName: string;
  stats = { sent: 0, received: 0, dropped: 0 };

  constructor(
    private brokers: string[],
    topic: string,
    private keyB64: string,
    seat: number,
  ) {
    this.topicName = `prc/v1/${topic}`;
    const nonce = Math.random().toString(36).slice(2, 8);
    this.senderId = `${seat}:${nonce}`;
  }

  async connect(): Promise<void> {
    this.key = await crypto.subtle.importKey('raw', b64ToBytes(this.keyB64) as BufferSource, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
    for (const url of this.brokers) this.links.push(this.openLink(url));
    this.emitStatus();
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  private onOnline = () => {
    for (const l of this.links) if (l.state !== 'up') l.client.reconnect();
    this.emitStatus();
  };

  private onOffline = () => this.emitStatus();

  private openLink(url: string): Link {
    const client = mqtt.connect(url, {
      protocolVersion: 4,
      clean: true,
      keepalive: 20,
      reconnectPeriod: 1500,
      connectTimeout: 8000,
      clientId: `prc_${Math.random().toString(36).slice(2, 12)}`,
      resubscribe: true,
    });
    const link: Link = { url, client, state: 'connecting', everUp: false };
    client.on('connect', () => {
      link.state = 'up';
      link.everUp = true;
      client.subscribe(this.topicName, { qos: 0 });
      this.emitStatus();
    });
    const down = () => {
      if (link.state !== 'down') {
        link.state = 'down';
        this.emitStatus();
      }
    };
    client.on('close', down);
    client.on('offline', down);
    client.on('error', () => {
      /* reconnect handles it */
    });
    client.on('reconnect', () => {
      link.state = 'connecting';
      this.emitStatus();
    });
    client.on('message', (_topic, payload) => {
      void this.receive(payload);
    });
    return link;
  }

  get status(): RealtimeStatus {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    if (this.links.some((l) => l.state === 'up')) return 'online';
    return this.everOnline ? 'reconnecting' : 'connecting';
  }

  get linkStates(): LinkState[] {
    return this.links.map((l) => l.state);
  }

  private emitStatus() {
    const s = this.status;
    if (s === 'online') this.everOnline = true;
    for (const h of this.statusHandlers) h(s, this.linkStates);
  }

  onStatus(h: (s: RealtimeStatus, links: LinkState[]) => void): () => void {
    this.statusHandlers.add(h);
    return () => this.statusHandlers.delete(h);
  }

  on(h: (m: Msg, from: string) => void): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  async send(m: Msg): Promise<void> {
    if (this.closed) return;
    const env: Envelope = { f: this.senderId, n: ++this.seq, m };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(env));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, plain));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv, 0);
    out.set(ct, 12);
    let any = false;
    for (const l of this.links) {
      if (l.state !== 'up') continue;
      // mqtt.js expects a Buffer-like; its browser build polyfills Buffer.
      l.client.publish(this.topicName, out as unknown as Buffer, { qos: 0 });
      any = true;
    }
    if (any) this.stats.sent++;
  }

  private async receive(payload: Uint8Array): Promise<void> {
    if (payload.length < 13) return;
    let env: Envelope;
    try {
      const iv = payload.subarray(0, 12);
      const ct = payload.subarray(12);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, this.key, ct as BufferSource);
      env = JSON.parse(new TextDecoder().decode(plain)) as Envelope;
    } catch {
      this.stats.dropped++; // not ours / tampered
      return;
    }
    if (!env || typeof env.f !== 'string' || typeof env.n !== 'number' || !env.m) return;
    if (env.f === this.senderId) return; // our own echo
    if (!this.firstTime(env.f, env.n)) return; // duplicate from the other relay
    this.stats.received++;
    for (const h of this.handlers) h(env.m, env.f);
  }

  private firstTime(sender: string, n: number): boolean {
    let s = this.seen.get(sender);
    if (!s) {
      s = { max: 0, recent: new Set() };
      this.seen.set(sender, s);
    }
    if (s.recent.has(n)) return false;
    if (n < s.max - 2000) return false; // ancient
    s.recent.add(n);
    if (n > s.max) s.max = n;
    if (s.recent.size > 4000) {
      for (const x of s.recent) if (x < s.max - 2000) s.recent.delete(x);
    }
    return true;
  }

  /** Force-drop and re-open all relay connections (used by tests + "reconnect" button). */
  reconnectAll() {
    for (const l of this.links) {
      l.client.end(true);
    }
    this.links = this.brokers.map((u) => this.openLink(u));
    this.emitStatus();
  }

  /** Simulate a network blip (debug + e2e). */
  simulateDrop(ms: number) {
    for (const l of this.links) l.client.stream?.destroy?.();
    void ms;
  }

  close() {
    this.closed = true;
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    for (const l of this.links) l.client.end(true);
    this.links = [];
  }
}
