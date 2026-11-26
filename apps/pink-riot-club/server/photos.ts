// Private photo storage. Her photos never live in git or in the deploy bundle:
// they are uploaded once (scripts/upload-photos.mjs or /upload.html) into
// Netlify Blobs and served through the API.

export interface PhotoStore {
  get(name: string): Promise<Uint8Array | null>;
  put(name: string, bytes: Uint8Array): Promise<void>;
  list(): Promise<string[]>;
}

export const PHOTO_NAME = /^[a-z0-9][a-z0-9-]{0,60}\.jpg$/;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export class MemoryPhotos implements PhotoStore {
  private map = new Map<string, Uint8Array>();
  async get(name: string) {
    return this.map.get(name) ?? null;
  }
  async put(name: string, bytes: Uint8Array) {
    this.map.set(name, bytes);
  }
  async list() {
    return [...this.map.keys()].sort();
  }
}
