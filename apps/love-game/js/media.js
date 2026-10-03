// Decrypts media/*.enc (see scripts/encrypt-media.mjs) with the key from the
// link (#k=…) and points every matching CONFIG path at the decrypted blob.
// No key, wrong key, or local photos/ present → nothing changes.
const KEY_STORE = 'love-game:key';
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mp3: 'audio/mpeg' };

export async function unlockMedia(config) {
  let k = null;
  const m = location.hash.match(/^#k=([A-Za-z0-9_-]{20,})$/);
  if (m) {
    k = m[1];
    try {
      localStorage.setItem(KEY_STORE, k);
    } catch {
      /* private mode: key lives for this visit only */
    }
    history.replaceState(null, '', location.pathname + location.search);
  } else {
    try {
      k = localStorage.getItem(KEY_STORE);
    } catch {
      k = null;
    }
  }
  if (!k || !window.crypto?.subtle) return;

  let names;
  try {
    const r = await fetch('media/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    names = await r.json();
  } catch {
    return;
  }

  let key;
  try {
    const raw = Uint8Array.from(atob(k.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  } catch {
    return;
  }

  const urls = {};
  await Promise.all(
    names.map(async (name) => {
      try {
        const buf = new Uint8Array(await (await fetch(`media/${name}.enc`)).arrayBuffer());
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
        const ext = name.split('.').pop().toLowerCase();
        urls[`photos/${name}`] = URL.createObjectURL(new Blob([plain], { type: MIME[ext] || '' }));
      } catch {
        /* wrong key or missing file → that photo falls back to a placeholder */
      }
    }),
  );
  rewrite(config, urls);
}

function rewrite(obj, urls) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string' && urls[v]) obj[k] = urls[v];
    else if (v && typeof v === 'object') rewrite(v, urls);
  }
}
