import type { RoomState } from '../../shared/api-types.ts';
import type { Seat } from '../../shared/world.ts';
import type { ConnStatus } from '../net/session.ts';
import type { Hud } from '../game/context.ts';
import type { PairKind } from '../../shared/protocol.ts';
import { el, isTouch } from './dom.ts';

/** Paired moments offered in the 💞 menu (blowkiss needs no consent). */
const PAIR_MENU: Array<[PairKind | 'blowkiss', string]> = [
  ['hug', '🤗 عنقة'],
  ['kiss', '😘 بوسة على الخد'],
  ['blowkiss', '💋 بوسة فالهوا'],
  ['highfive', '✋ تصفيقة'],
  ['dance', '💃 شطحة مع بعض'],
  ['hands', '🤝 شدّ يدي'],
];

export interface HudHandlers {
  onReaction: (k: 'bonk' | 'reply' | 'gandas' | 'laugh' | 'dance' | 'wave' | 'celebrate' | 'chat') => void;
  onCtx: () => void;
  onJump: () => void;
  onSettings: () => void;
  onMap: () => void;
  onInvite: () => void;
  onRoomChip: () => void;
  onPair: (k: PairKind | 'blowkiss') => void;
}

export class HudView implements Hud {
  root = el('div', { id: 'hud' });
  labels = el('div', { id: 'labels' });
  private dot = el('span', { class: 'status-dot connecting' });
  private statusText = el('span', {}, 'كنتصلو…');
  private roomChip: HTMLButtonElement;
  private peerChip = el('span', { class: 'chip' }, '👤 …');
  private fb = this.scoreEl('⚽');
  private pl = this.scoreEl('💦');
  private promptWrap = el('div', { class: 'prompt hidden' });
  private toasts = el('div', { class: 'toasts', 'aria-live': 'polite' });
  private bannerWrap = el('div', {});
  private replyWrap = el('div', { class: 'reply hidden' });
  private gandasBtn: HTMLButtonElement;
  private ctxBtn: HTMLButtonElement;
  private peerWait = el('div', { class: 'peer-wait hidden' });
  joyZone = el('div', { class: 'joy-zone' });
  joyBase = el('div', { class: 'joy-base' });
  joyKnob = el('div', { class: 'joy-knob' });
  private lastScores = { fb: '', pl: '' };
  private replyTimer = 0;
  private pairMenu = el('div', { class: 'pair-menu hidden', role: 'menu', 'aria-label': 'لحظات مع صاحبك' });
  private pairAskWrap = el('div', { class: 'pair-ask hidden', role: 'alertdialog', 'aria-live': 'assertive' });
  private pairEndWrap = el('div', { class: 'pair-end hidden' });
  private pairBtn: HTMLButtonElement;
  private askTimer = 0;

  constructor(h: HudHandlers) {
    this.roomChip = el('button', { class: 'chip room-chip', title: 'نسخ رابط العرضة', onclick: () => h.onRoomChip() }, '—') as HTMLButtonElement;
    const top = el(
      'div',
      { class: 'topbar' },
      el('div', { class: 'group' }, el('span', { class: 'chip', role: 'status' }, this.dot, this.statusText), this.peerChip),
      el('div', { class: 'group' }, this.roomChip),
    );
    const side = el(
      'div',
      { class: 'side-menu' },
      el('button', { class: 'icon-btn', 'aria-label': 'الإعدادات', title: 'الإعدادات', onclick: () => h.onSettings() }, '⚙️'),
      el('button', { class: 'icon-btn', 'aria-label': 'الخريطة', title: 'الخريطة (M)', onclick: () => h.onMap() }, '🗺️'),
      el('button', { class: 'icon-btn', 'aria-label': 'عرض صاحبك', title: 'عرض صاحبك', onclick: () => h.onInvite() }, '💌'),
    );
    this.gandasBtn = el('button', { onclick: () => h.onReaction('gandas'), title: 'Q' }, 'يا قندس 🦫') as HTMLButtonElement;
    this.pairBtn = el('button', { class: 'love', onclick: () => this.togglePairMenu(), title: 'H', 'aria-label': 'لحظات مع صاحبك', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, '💞') as HTMLButtonElement;
    for (const [k, label] of PAIR_MENU) {
      this.pairMenu.append(
        el('button', { role: 'menuitem', onclick: () => {
          this.togglePairMenu(false);
          h.onPair(k);
        } }, label),
      );
    }
    const reactions = el(
      'div',
      { class: 'reactions', role: 'toolbar', 'aria-label': 'تفاعلات' },
      el('button', { class: 'hot', onclick: () => h.onReaction('bonk'), title: 'B' }, 'بضربك😂'),
      this.pairBtn,
      el('button', { onclick: () => h.onReaction('reply') }, 'لم روحك 🤣'),
      this.gandasBtn,
      el('button', { onclick: () => h.onReaction('laugh'), title: '1', 'aria-label': 'ضحك' }, '😂'),
      el('button', { onclick: () => h.onReaction('dance'), title: '2', 'aria-label': 'شطيح' }, '💃'),
      el('button', { onclick: () => h.onReaction('wave'), title: '3', 'aria-label': 'سلام' }, '👋'),
      el('button', { onclick: () => h.onReaction('celebrate'), title: '4', 'aria-label': 'احتفال' }, '🎉'),
      el('button', { onclick: () => h.onReaction('chat'), title: 'T', 'aria-label': 'رسالة' }, '💬'),
    );
    const scores = el('div', { class: 'scoreboard', 'aria-live': 'polite' }, this.fb.root, this.pl.root);
    this.ctxBtn = el('button', { class: 'ctx', 'aria-label': 'تفاعل', onclick: () => h.onCtx() }, '✋') as HTMLButtonElement;
    const touch = el(
      'div',
      { class: 'touch-btns' },
      el('button', { 'aria-label': 'نقز', onclick: () => h.onJump() }, '⤒'),
      this.ctxBtn,
      el('button', { class: 'bonk', 'aria-label': 'بضربك', onclick: () => h.onReaction('bonk') }, '🩷'),
      el('button', { 'aria-label': 'ضحك', onclick: () => h.onReaction('laugh') }, '😂'),
    );
    this.joyBase.append(this.joyKnob);
    this.joyZone.append(this.joyBase);
    const help = el(
      'div',
      { class: 'help' },
      el('div', {}, el('kbd', {}, 'WASD'), ' مشي · ', el('kbd', {}, 'Shift'), ' جري · ', el('kbd', {}, 'Space'), ' نقز'),
      el('div', {}, el('kbd', {}, 'E'), ' تفاعل · ', el('kbd', {}, 'F'), ' كورة/رشّ · ', el('kbd', {}, 'B'), ' بضربك😂'),
      el('div', {}, 'كليكي على الأرض باش تمشي · جر الماوس باش تدور'),
    );
    this.root.append(top, scores, side, this.peerWait, this.toasts, this.bannerWrap, this.promptWrap, this.replyWrap, this.pairAskWrap, this.pairEndWrap, this.pairMenu, reactions);
    if (isTouch()) this.root.append(this.joyZone, touch);
    else this.root.append(help);
    document.body.append(this.labels, this.root);
  }

  private scoreEl(icon: string) {
    const a = el('span', { class: 'who' }, '—');
    const an = el('span', { class: 'n' }, '0');
    const bn = el('span', { class: 'n' }, '0');
    const b = el('span', { class: 'who' }, '—');
    const rnd = el('span', { class: 'rnd' }, '');
    const root = el('div', { class: 'score' }, el('span', {}, icon), a, an, el('span', {}, '-'), bn, b, rnd);
    return { root, a, an, bn, b, rnd };
  }

  setRoom(code: string) {
    this.roomChip.textContent = `🔑 ${code}`;
  }

  setStatus(s: ConnStatus, peerName: string | null) {
    this.dot.className = `status-dot ${s.relay}`;
    const relay = s.relay === 'online' ? 'متصل' : s.relay === 'reconnecting' ? 'كنعاودو نتصلو…' : s.relay === 'offline' ? 'ما كاينش الأنترنت' : 'كنتصلو…';
    const extra = s.relay === 'online' && s.links.filter((l) => l === 'up').length === 1 && s.links.length > 1 ? ' (خط واحد)' : '';
    const api = s.api === 'ok' ? '' : s.api === 'retrying' ? ' · السيرفر كيعاود' : ' · مشكل فالسيرفر';
    this.statusText.textContent = `${relay}${extra}${api}${s.rtt !== null && s.relay === 'online' ? ` · ${s.rtt}ms` : ''}`;
    const pn = peerName ?? 'صاحبك';
    this.peerChip.textContent = s.peer === 'online' ? `💗 ${pn} هنا` : s.peer === 'away' ? `📡 ${pn} مقطوع/ة` : '👤 بوحدك دابا';
    this.peerWait.classList.toggle('hidden', s.peer !== 'none');
  }

  setWaiting(onInvite: () => void) {
    this.peerWait.replaceChildren(el('button', { class: 'btn', onclick: onInvite }, 'كنتسناو صاحبك… عرضو 💌'));
  }

  setScores(st: RoomState, mySeat: Seat, active: 'football' | 'pool' | null) {
    const name = (s: Seat) => st.seats.find((x) => x.seat === s)?.name ?? (s === mySeat ? 'أنا' : '…');
    for (const [k, view, g] of [
      ['fb', this.fb, st.football],
      ['pl', this.pl, st.pool],
    ] as const) {
      view.a.textContent = name(1);
      view.b.textContent = name(2);
      view.an.textContent = String(g.scores[0]);
      view.bn.textContent = String(g.scores[1]);
      view.rnd.textContent = `ج${g.round}${g.roundsWon[0] + g.roundsWon[1] ? ` (${g.roundsWon[0]}:${g.roundsWon[1]})` : ''}`;
      const key = `${g.round}:${g.scores.join(',')}`;
      if (this.lastScores[k] && this.lastScores[k] !== key) {
        view.root.classList.remove('bump');
        void view.root.offsetWidth;
        view.root.classList.add('bump');
      }
      this.lastScores[k] = key;
    }
    this.fb.root.classList.toggle('active', active === 'football');
    this.pl.root.classList.toggle('active', active === 'pool');
  }

  setPrompt(text: string | null, key: string, onClick: () => void) {
    if (!text) {
      this.promptWrap.classList.add('hidden');
      return;
    }
    this.promptWrap.classList.remove('hidden');
    const b = el('button', { onclick: onClick }, text, isTouch() ? '' : el('kbd', {}, key));
    this.promptWrap.replaceChildren(b);
  }

  setCtx(icon: string, active: boolean) {
    if (this.ctxBtn.textContent !== icon) this.ctxBtn.textContent = icon;
    this.ctxBtn.classList.toggle('glow', active);
  }

  setGandasVisible(v: boolean) {
    this.gandasBtn.classList.toggle('hidden', !v);
  }

  toast(text: string, kind: 'info' | 'good' | 'warn' = 'info') {
    const t = el('div', { class: `toast ${kind}` }, text);
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.remove(), 3800);
  }

  banner(title: string, sub?: string, emoji?: string) {
    const b = el('div', { class: 'banner' }, el('div', { class: 'big' }, `${emoji ? emoji + ' ' : ''}${title}`), sub ? el('div', { class: 'sub' }, sub) : null);
    this.bannerWrap.replaceChildren(b);
    setTimeout(() => b.remove(), 2800);
  }

  replyPrompt(text: string, onReply: () => void, seconds = 4) {
    clearTimeout(this.replyTimer);
    const b = el('button', { class: 'btn', onclick: () => {
      this.replyWrap.classList.add('hidden');
      onReply();
    } }, text);
    this.replyWrap.replaceChildren(b);
    this.replyWrap.classList.remove('hidden');
    this.replyTimer = window.setTimeout(() => this.replyWrap.classList.add('hidden'), seconds * 1000);
  }

  hideReply() {
    this.replyWrap.classList.add('hidden');
  }

  togglePairMenu(open = this.pairMenu.classList.contains('hidden')) {
    this.pairMenu.classList.toggle('hidden', !open);
    this.pairBtn.setAttribute('aria-expanded', String(open));
    if (open) (this.pairMenu.firstElementChild as HTMLElement | null)?.focus({ preventScroll: true });
  }

  /** "X wants to hug you" with yes / «لا، لم روحك 🤣». */
  pairAsk(text: string, onYes: () => void, onNo: () => void, seconds: number) {
    clearTimeout(this.askTimer);
    const bar = el('div', { class: 'bar', style: `animation-duration:${seconds}s` });
    this.pairAskWrap.replaceChildren(
      el('div', { class: 't' }, text),
      el('div', { class: 'row' }, el('button', { class: 'btn', onclick: onYes }, 'آه 💗'), el('button', { class: 'btn ghost', onclick: onNo }, 'لا، لم روحك 🤣')),
      bar,
    );
    this.pairAskWrap.classList.remove('hidden');
    (this.pairAskWrap.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
    this.askTimer = window.setTimeout(() => this.hidePairAsk(), seconds * 1000);
  }

  hidePairAsk() {
    clearTimeout(this.askTimer);
    this.pairAskWrap.classList.add('hidden');
  }

  /** Shows a button to end a long moment (holding hands); null hides it. */
  pairActive(text: string | null, onEnd: () => void) {
    this.pairEndWrap.classList.toggle('hidden', !text);
    if (text) this.pairEndWrap.replaceChildren(el('button', { class: 'btn ghost', onclick: onEnd }, text));
  }

  dispose() {
    this.root.remove();
    this.labels.remove();
  }
}
