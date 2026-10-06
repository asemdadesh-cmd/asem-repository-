// Modal panels: photo lightbox, shared drawing, invite, settings, map, chat.
import qrcode from 'qrcode-generator';
import { ARTWORKS, PHOTOS, QUICK_LINES, assetUrl, CLUB_RULES, type Picture } from '../content.ts';
import { POIS } from '../../shared/world.ts';
import { CANVAS_H, CANVAS_W, type CharacterId } from '../../shared/api-types.ts';
import { COLORS, SIZES, type DrawingBoard } from '../game/drawing.ts';
import { copyText, el, modal } from './dom.ts';
import { characterGrid } from './lobby.ts';

export function openLightbox(kind: 'photo' | 'art', index: number) {
  const list: Picture[] = kind === 'photo' ? PHOTOS : ARTWORKS;
  let i = index;
  const img = el('img', { alt: '' }) as HTMLImageElement;
  const cap = el('div', { class: 'cap' });
  const thumbs = el('div', { class: 'thumbs' });
  const show = () => {
    const p = list[i];
    img.src = assetUrl(p.file);
    img.alt = p.title;
    cap.textContent = p.caption;
    thumbs.querySelectorAll('img').forEach((t, k) => t.setAttribute('aria-current', String(k === i)));
  };
  list.forEach((p, k) =>
    thumbs.append(
      el('img', { src: assetUrl(p.file, true), alt: p.title, onclick: () => ((i = k), show()) }),
    ),
  );
  let sx = 0;
  const wrap = el('div', { class: 'img-wrap' }, img);
  wrap.addEventListener('pointerdown', (e) => (sx = e.clientX));
  wrap.addEventListener('pointerup', (e) => {
    const d = e.clientX - sx;
    if (Math.abs(d) > 50) {
      i = (i + (d < 0 ? 1 : -1) + list.length) % list.length; // RTL: swipe left = next
      show();
    }
  });
  const box = el(
    'div',
    { class: 'lightbox' },
    wrap,
    cap,
    el(
      'div',
      { class: 'nav' },
      el('button', { class: 'btn ghost', onclick: () => ((i = (i - 1 + list.length) % list.length), show()) }, '→ اللي قبل'),
      el('button', { class: 'btn ghost', onclick: () => ((i = (i + 1) % list.length), show()) }, 'اللي من بعد ←'),
    ),
    thumbs,
  );
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') ((i = (i + 1) % list.length), show());
    if (e.key === 'ArrowRight') ((i = (i - 1 + list.length) % list.length), show());
  };
  window.addEventListener('keydown', onKey);
  show();
  return modal(box, { title: kind === 'photo' ? 'معرض يسو 📸' : 'رسومات يسو 🎨', wide: true, onClose: () => window.removeEventListener('keydown', onKey) });
}

export function openDrawing(board: DrawingBoard, peerName: () => string | null, onClose: () => void) {
  const stage = el('div', { class: 'draw-stage' });
  stage.append(board.canvas);
  const cursor = el('div', { class: 'remote-cursor hidden' });
  stage.append(cursor);
  const toPt = (e: PointerEvent) => {
    const r = board.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * CANVAS_W, ((e.clientY - r.top) / r.height) * CANVAS_H];
  };
  let drawing = false;
  board.canvas.onpointerdown = (e) => {
    e.preventDefault();
    board.canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const [x, y] = toPt(e);
    board.begin(x, y);
  };
  board.canvas.onpointermove = (e) => {
    if (!drawing) return;
    const evs = (e as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] }).getCoalescedEvents?.() ?? [e];
    for (const ce of evs) {
      const [x, y] = toPt(ce);
      board.move(x, y);
    }
  };
  const up = () => {
    if (!drawing) return;
    drawing = false;
    board.end();
  };
  board.canvas.onpointerup = up;
  board.canvas.onpointercancel = up;
  let hideT = 0;
  board.onRemoteActivity = (_seat, x, y, on) => {
    if (!on) {
      cursor.classList.add('hidden');
      return;
    }
    cursor.textContent = `✏️ ${peerName() ?? 'صاحبك'}`;
    cursor.style.left = `${(x / CANVAS_W) * 100}%`;
    cursor.style.top = `${(y / CANVAS_H) * 100}%`;
    cursor.classList.remove('hidden');
    clearTimeout(hideT);
    hideT = window.setTimeout(() => cursor.classList.add('hidden'), 1500);
  };
  const swatches = COLORS.map((c) =>
    el('button', { class: 'swatch', style: `background:${c}`, 'aria-label': c, 'aria-pressed': String(c === board.color && !board.erase), onclick: () => pickColor(c) }),
  );
  const custom = el('input', { type: 'color', value: board.color, 'aria-label': 'لون آخر', style: 'width:44px;height:44px;border:0;background:none;padding:0' }) as HTMLInputElement;
  custom.addEventListener('input', () => pickColor(custom.value));
  const eraser = el('button', { class: 'tool-btn', 'aria-pressed': String(board.erase), onclick: () => {
    board.erase = !board.erase;
    eraser.setAttribute('aria-pressed', String(board.erase));
    swatches.forEach((s) => s.setAttribute('aria-pressed', 'false'));
  } }, '🧽 مسّاحة');
  const pickColor = (c: string) => {
    board.color = c;
    board.erase = false;
    eraser.setAttribute('aria-pressed', 'false');
    swatches.forEach((s) => s.setAttribute('aria-pressed', String(s.getAttribute('aria-label') === c)));
  };
  const sizes = SIZES.map((s) =>
    el('button', { class: 'size-btn', 'aria-label': `حجم ${s}`, 'aria-pressed': String(s === board.size), onclick: (e: Event) => {
      board.size = s;
      sizes.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    } }, el('i', { style: `width:${Math.min(28, 4 + s * 0.55)}px;height:${Math.min(28, 4 + s * 0.55)}px` })),
  );
  const tools = el(
    'div',
    { class: 'draw-tools' },
    ...swatches,
    custom,
    el('span', { style: 'width:8px' }),
    ...sizes,
    eraser,
    el('button', { class: 'tool-btn', onclick: () => board.undo() }, '↩️ رجّع'),
    el('button', { class: 'tool-btn', onclick: async () => {
      if (confirm('نمسحو اللوحة كاملة للجوج؟ 🧹')) await board.clear().catch(() => alert('ما قدرناش نمسحو دابا، عاود 🙏'));
    } }, '🧹 مسح الكل'),
    el('button', { class: 'tool-btn', onclick: () => board.exportPng() }, '💾 PNG'),
  );
  return modal(el('div', { class: 'draw' }, stage, tools), {
    title: 'لوحة الرسم المشتركة 🖌️',
    wide: true,
    onClose: () => {
      up();
      board.canvas.onpointerdown = board.canvas.onpointermove = board.canvas.onpointerup = board.canvas.onpointercancel = null;
      board.canvas.remove();
      onClose();
    },
  });
}

export function openInvite(code: string, url: string, onClose?: () => void) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const q = el('div', { class: 'qr', 'aria-label': 'QR' });
  q.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  const status = el('div', { 'aria-live': 'polite', style: 'min-height:1.3em;font-weight:700;color:#1fa89b' });
  const share = async () => {
    const text = `يالله نلعبو فنادي التخربيق 💗⚽💦 الكود: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'نادي التخربيق — Pink Riot Club', text, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    status.textContent = (await copyText(`${text}\n${url}`)) ? 'تنسخ! صيفطو لصاحبك 💌' : 'ما تنسخش… نسخو يدويا';
  };
  return modal(
    el(
      'div',
      { class: 'invite' },
      el('p', { style: 'margin:0' }, 'صيفط هاد الرابط ولا الكود لصاحبك باش يدخل معاك:'),
      el('div', { class: 'code' }, code),
      q,
      el('div', { class: 'link-box' }, url),
      el('button', { class: 'btn', onclick: share }, 'شارك الرابط 💌'),
      el('button', { class: 'btn ghost', onclick: async () => (status.textContent = (await copyText(code)) ? 'الكود تنسخ ✅' : '') }, 'نسخ الكود'),
      status,
    ),
    { title: 'عرض صاحبك 💌', onClose },
  );
}

export function openChat(onSend: (t: string) => void) {
  const input = el('input', { class: 'input', maxlength: 80, placeholder: 'كتب شي حاجة…', 'aria-label': 'رسالة' }) as HTMLInputElement;
  let close: () => void = () => {};
  const send = (t: string) => {
    const v = t.trim();
    if (!v) return;
    onSend(v);
    close();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send(input.value);
  });
  close = modal(
    el(
      'div',
      {},
      el('div', { class: 'chat-row' }, input, el('button', { class: 'btn', onclick: () => send(input.value) }, 'صيفط')),
      el('div', { class: 'quick' }, ...QUICK_LINES.map((q) => el('button', { onclick: () => send(q) }, q))),
    ),
    { title: 'قول شي حاجة 💬' },
  );
  setTimeout(() => input.focus(), 50);
  return close;
}

export function openMap(onGo: (x: number, z: number) => void) {
  let close: () => void = () => {};
  close = modal(
    el('div', { class: 'menu-list' }, ...POIS.map((p) => el('button', { onclick: () => (onGo(p.x, p.z), close()) }, el('span', {}, `${p.emoji} ${p.label}`), el('span', {}, '←')))),
    { title: 'فين بغيتي تمشي؟ 🗺️' },
  );
  return close;
}

export function openRules() {
  return modal(el('div', { class: 'menu-list' }, ...CLUB_RULES.map((r) => el('div', { class: 'toggle' }, r))), { title: 'قوانين النادي 📜' });
}

export function openAbout() {
  return modal(
    el(
      'div',
      { style: 'display:grid;gap:10px;text-align:center;font-weight:700' },
      el('div', { style: 'font-size:40px' }, '🇱🇾 💗 🇲🇦'),
      el('div', {}, 'عاصم (2004) × يسو (2003)'),
      el('div', { style: 'color:var(--ink-soft)' }, 'يسو كبيرة بعام… ولكن عاصم كبير فالتخربيق 😂'),
      el('div', {}, 'هاد النادي تبنى باش تضحكو، تلعبو، وتتضاربو بالنودلز 🩷'),
    ),
    { title: 'نادي التخربيق — Pink Riot Club' },
  );
}

export interface SettingsActions {
  muted: boolean;
  gandas: boolean;
  character: CharacterId;
  onMute: (m: boolean) => void;
  onGandas: (g: boolean) => void;
  onCharacter: (c: CharacterId) => void;
  onInvite: () => void;
  onLeave: () => void;
  onRename: (n: string) => void;
  name: string;
}

export function openSettings(a: SettingsActions) {
  const mute = el('input', { type: 'checkbox', checked: a.muted }) as HTMLInputElement;
  mute.addEventListener('change', () => a.onMute(mute.checked));
  const gandas = el('input', { type: 'checkbox', checked: a.gandas }) as HTMLInputElement;
  gandas.addEventListener('change', () => a.onGandas(gandas.checked));
  const name = el('input', { class: 'input', value: a.name, maxlength: 20, 'aria-label': 'السمية' }) as HTMLInputElement;
  let close: () => void = () => {};
  close = modal(
    el(
      'div',
      { class: 'menu-list' },
      el('label', { class: 'toggle' }, 'كتم الصوت 🔇', mute),
      el('label', { class: 'toggle' }, 'زر مزحة «قندس» 🦫', gandas),
      el('div', { class: 'chat-row' }, name, el('button', { class: 'btn ghost', onclick: () => name.value.trim() && (a.onRename(name.value.trim()), close()) }, 'بدّل السمية')),
      el('h3', { style: 'margin:6px 0 0' }, 'بدّل الشخصية'),
      characterGrid(a.character, (c) => {
        a.onCharacter(c);
        close();
      }),
      el('button', { onclick: () => (a.onInvite(), close()) }, el('span', {}, 'عرض صاحبك 💌'), el('span', {}, '←')),
      el('button', { onclick: () => (openAbout(), close()) }, el('span', {}, 'على النادي 💗'), el('span', {}, '←')),
      el('button', { onclick: () => confirm('متأكد بغيتي تخرج من الغرفة؟') && a.onLeave() }, el('span', {}, 'خروج من الغرفة 🚪'), el('span', {}, '←')),
    ),
    { title: 'الإعدادات ⚙️' },
  );
  return close;
}
