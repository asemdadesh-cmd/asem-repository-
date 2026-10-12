// Serverless realtime link for two (or a few) players. Messages go to two public
// MQTT-over-WebSocket brokers at once (if one drops, the other carries on;
// duplicates are discarded). Everything is end-to-end encrypted with AES-GCM
// using a key derived from the private room code, and the topic name is a hash
// of the code, so the brokers never see the code, the key or any content.
import mqtt, { type MqttClient } from 'mqtt';
export { newRoomCode, normaliseCode } from './room-code.ts';

export const BROKERS: string[] = ((import.meta.env.VITE_BROKERS as string | undefined) ?? 'wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export type RelayStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';

interface Envelope<M> {
  f: string; // sender id
  n: number; // sequence (dedupe across brokers)
  m: M;
}

async function deriveKey(code: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('villa-serena/v1/key'), iterations: 120_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function topicFor(code: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`villa-serena/v1/topic/${code}`)));
  return `villa-serena/v1/${Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export class Relay<M> {
  private links: Array<{ client: MqttClient; up: boolean }> = [];
  private key!: CryptoKey;
  private topic = '';
  private seq = 0;
  private seen = new Map<string, Set<number>>();
  private handlers = new Set<(m: M, from: string) => void>();
  private statusHandlers = new Set<(s: RelayStatus) => void>();
  private everUp = false;
  private closed = false;
  readonly id = crypto.getRandomValues(new Uint32Array(2)).join('').slice(0, 12);

  constructor(
    readonly code: string,
    private brokers = BROKERS,
  ) {}

  async connect() {
    [this.key, this.topic] = await Promise.all([deriveKey(this.code), topicFor(this.code)]);
    for (const url of this.brokers) this.open(url);
    this.emit();
  }

  private open(url: string) {
    const client = mqtt.connect(url, {
      protocolVersion: 4,
      clean: true,
      keepalive: 20,
      reconnectPeriod: 1500,
      connectTimeout: 8000,
      clientId: `vs_${Math.random().toString(36).slice(2, 12)}`,
      resubscribe: true,
    });
    const link = { client, up: false };
    this.links.push(link);
    client.on('connect', () => {
      link.up = true;
      client.subscribe(this.topic, { qos: 0 });
      this.emit();
    });
    const down = () => {
      if (!link.up) return;
      link.up = false;
      this.emit();
    };
    client.on('close', down);
    client.on('offline', down);
    client.on('error', () => {
      /* mqtt.js reconnects by itself */
    });
    client.on('message', (_t, payload) => void this.receive(payload));
  }

  get status(): RelayStatus {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    if (this.links.some((l) => l.up)) return 'online';
    return this.everUp ? 'reconnecting' : 'connecting';
  }

  private emit() {
    const s = this.status;
    if (s === 'online') this.everUp = true;
    for (const h of this.statusHandlers) h(s);
  }

  onStatus(h: (s: RelayStatus) => void) {
    this.statusHandlers.add(h);
    return () => this.statusHandlers.delete(h);
  }

  on(h: (m: M, from: string) => void) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  async send(m: M) {
    if (this.closed || !this.key) return;
    const env: Envelope<M> = { f: this.id, n: ++this.seq, m };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(JSON.stringify(env))));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv, 0);
    out.set(ct, 12);
    for (const l of this.links) if (l.up) l.client.publish(this.topic, out as unknown as Buffer, { qos: 0 });
  }

  private async receive(payload: Uint8Array) {
    if (payload.length < 13) return;
    let env: Envelope<M>;
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.subarray(0, 12) as BufferSource }, this.key, payload.subarray(12) as BufferSource);
      env = JSON.parse(new TextDecoder().decode(plain)) as Envelope<M>;
    } catch {
      return; // not for us, or tampered with
    }
    if (!env || typeof env.f !== 'string' || typeof env.n !== 'number' || env.f === this.id) return;
    let s = this.seen.get(env.f);
    if (!s) this.seen.set(env.f, (s = new Set()));
    if (s.has(env.n)) return; // the copy from the other broker
    s.add(env.n);
    if (s.size > 3000) for (const x of s) if (x < env.n - 1500) s.delete(x);
    for (const h of this.handlers) h(env.m, env.f);
  }

  close() {
    this.closed = true;
    for (const l of this.links) l.client.end(true);
    this.links = [];
  }
}
