// The first screen: your name, who you play as, and whether you explore alone
// or open a private shared villa (an invite link carries the room code).
import { AVATARS, type AvatarId } from '../player/avatars.ts';
import { newRoomCode, normaliseCode } from '../net/room-code.ts';

export interface LobbyResult {
  name: string;
  avatar: AvatarId;
  room: string | null;
}

const THUMB: Record<AvatarId, string> = { him: 'asem.webp', her: 'yasso.webp', captain: 'captain.webp' };

export function roomFromHash(): string | null {
  const m = location.hash.match(/room=([A-Za-z0-9-]+)/);
  return m ? normaliseCode(m[1]) : null;
}

export function showLobby(parent: HTMLElement): Promise<LobbyResult> {
  return new Promise((resolve) => {
    const joining = roomFromHash();
    let name = '';
    let avatar: AvatarId = 'him';
    try {
      name = localStorage.getItem('vs:name') ?? '';
      avatar = (localStorage.getItem('vs:avatar') as AvatarId) || (joining ? 'her' : 'him');
      if (!(avatar in AVATARS)) avatar = 'him';
    } catch {
      /* private mode */
    }
    const el = document.createElement('main');
    el.id = 'lobby';
    el.innerHTML = `
      <div class="lobby-card" role="dialog" aria-labelledby="lobby-title">
        <p class="eyebrow">A seaside world for two</p>
        <h1 id="lobby-title">Villa Serena</h1>
        <p class="lede">A Mediterranean villa above a quiet cove — pool, garden, beach, pier and lighthouse. Every model built in Trimble SketchUp; everything moves with real physics.</p>
        ${joining ? `<p class="invite-note">You've been invited to a shared villa <span class="code">${joining}</span></p>` : ''}
        <label class="field"><span>Your name</span><input id="lobby-name" maxlength="18" autocomplete="nickname" placeholder="e.g. Sara" /></label>
        <fieldset class="avatars"><legend>Play as</legend>
          ${(Object.keys(AVATARS) as AvatarId[])
            .map(
              (id) => `<label class="avatar"><input type="radio" name="av" value="${id}" ${id === avatar ? 'checked' : ''} />
              <img src="${import.meta.env.BASE_URL}thumbs/${THUMB[id]}" alt="" width="100" height="125" /><span>${AVATARS[id].label}</span></label>`,
            )
            .join('')}
        </fieldset>
        <div class="lobby-actions">
          ${
            joining
              ? `<button class="btn" id="go-join">Join the villa</button><button class="btn ghost" id="go-solo">Explore on my own</button>`
              : `<button class="btn" id="go-host">Play together</button><button class="btn ghost" id="go-solo">Explore on my own</button>`
          }
        </div>
        <div class="share hidden" id="share">
          <p>Send this link to your partner — it opens the same private villa:</p>
          <div class="share-row"><input id="share-link" readonly aria-label="Invite link" /><button class="btn small" id="copy">Copy</button></div>
          <button class="btn" id="go-enter">Enter the villa</button>
        </div>
        <p class="fine">Shared villas are end-to-end encrypted; the relay only ever sees scrambled bytes. Best with headphones.</p>
      </div>`;
    parent.append(el);
    const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>(`#${id}`)!;
    const nameInput = $<HTMLInputElement>('lobby-name');
    nameInput.value = name;
    const done = (room: string | null) => {
      const n = nameInput.value.trim().slice(0, 18) || (avatar === 'him' ? 'Him' : avatar === 'her' ? 'Her' : 'Captain');
      const av = (el.querySelector<HTMLInputElement>('input[name=av]:checked')?.value ?? 'him') as AvatarId;
      try {
        localStorage.setItem('vs:name', n);
        localStorage.setItem('vs:avatar', av);
      } catch {
        /* ignore */
      }
      if (room) history.replaceState(null, '', `#room=${room.replace(/-/g, '')}`);
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 450);
      resolve({ name: n, avatar: av, room });
    };
    el.querySelectorAll<HTMLInputElement>('input[name=av]').forEach((r) => r.addEventListener('change', () => (avatar = r.value as AvatarId)));
    $('go-solo').addEventListener('click', () => {
      history.replaceState(null, '', location.pathname + location.search);
      done(null);
    });
    if (joining) $('go-join').addEventListener('click', () => done(joining));
    else
      $('go-host').addEventListener('click', () => {
        const code = newRoomCode();
        const link = `${location.origin}${location.pathname}#room=${code.replace(/-/g, '')}`;
        $<HTMLInputElement>('share-link').value = link;
        $('share').classList.remove('hidden');
        el.querySelector('.lobby-actions')!.classList.add('hidden');
        $('copy').addEventListener('click', async () => {
          try {
            if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Villa Serena', url: link });
            else await navigator.clipboard.writeText(link);
            $('copy').textContent = 'Copied ✓';
          } catch {
            $<HTMLInputElement>('share-link').select();
          }
        });
        $('go-enter').addEventListener('click', () => done(code));
      });
    nameInput.focus({ preventScroll: true });
  });
}

export function showLoading(parent: HTMLElement) {
  const el = document.createElement('div');
  el.id = 'loading';
  el.innerHTML = `<div class="load-card"><h2>Villa Serena</h2><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><p class="load-label">Loading…</p></div>`;
  parent.append(el);
  const bar = el.querySelector('.bar') as HTMLElement;
  const fill = el.querySelector('.bar i') as HTMLElement;
  const label = el.querySelector('.load-label') as HTMLElement;
  return {
    progress(f: number, text: string) {
      fill.style.transform = `scaleX(${Math.max(0.02, f)})`;
      bar.setAttribute('aria-valuenow', String(Math.round(f * 100)));
      label.textContent = text;
    },
    fail(msg: string) {
      label.textContent = msg;
      el.classList.add('error');
    },
    done() {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 600);
    },
  };
}
