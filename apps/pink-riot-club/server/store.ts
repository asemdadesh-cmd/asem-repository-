// Minimal key/value interface over Netlify Blobs (prod) or memory (dev/tests).

export interface KV {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  /** Keys starting with prefix (full keys). */
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}

export class MemoryKV implements KV {
  private map = new Map<string, string>();
  latencyMs = 0;

  private async tick() {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
  }

  async getJSON<T>(key: string): Promise<T | null> {
    await this.tick();
    const v = this.map.get(key);
    return v === undefined ? null : (JSON.parse(v) as T);
  }

  async setJSON(key: string, value: unknown): Promise<void> {
    await this.tick();
    this.map.set(key, JSON.stringify(value));
  }

  async list(prefix: string): Promise<string[]> {
    await this.tick();
    return [...this.map.keys()].filter((k) => k.startsWith(prefix)).sort();
  }

  async delete(key: string): Promise<void> {
    await this.tick();
    this.map.delete(key);
  }
}
