type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

/** Tiny hyperscript: el('button', { class: 'x', onclick: fn }, 'label'). Text children are escaped. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (k === 'style') e.setAttribute('style', String(v));
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const e = root.querySelector(sel);
  if (!e) throw new Error(`missing ${sel}`);
  return e as HTMLElement;
}

export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const isSmall = () => Math.min(innerWidth, innerHeight) < 600 || innerWidth < 760;

export async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }, t);
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Generic modal sheet. Returns a close() function. */
export function modal(content: HTMLElement, opts: { title?: string; wide?: boolean; onClose?: () => void; className?: string } = {}): () => void {
  const close = () => {
    root.classList.add('closing');
    window.removeEventListener('keydown', onKey);
    setTimeout(() => root.remove(), 160);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const sheet = el(
    'div',
    { class: `sheet ${opts.wide ? 'wide' : ''} ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title ?? '' },
    el('div', { class: 'sheet-head' }, opts.title ? el('h2', {}, opts.title) : el('span'), el('button', { class: 'icon-btn close', 'aria-label': 'سد', onclick: () => close() }, '✕')),
    content,
  );
  const root: HTMLDivElement = el('div', { class: 'modal', onclick: (e: Event) => e.target === root && close() }, sheet);
  document.body.append(root);
  window.addEventListener('keydown', onKey);
  (sheet.querySelector('button, input, [tabindex]') as HTMLElement | null)?.focus();
  return close;
}
