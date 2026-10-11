import { wedding } from './config';

type Unit = 'd' | 'h' | 'm' | 's';

/** Arabic counted-noun forms: zero/one, two (dual), 3–10 (plural), 11–99 (singular accusative). */
const forms: Record<Unit, Record<Intl.LDMLPluralRule, string>> = {
  d: { zero: 'يوم', one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا', other: 'يوم' },
  h: { zero: 'ساعة', one: 'ساعة', two: 'ساعتان', few: 'ساعات', many: 'ساعةً', other: 'ساعة' },
  m: { zero: 'دقيقة', one: 'دقيقة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقةً', other: 'دقيقة' },
  s: { zero: 'ثانية', one: 'ثانية', two: 'ثانيتان', few: 'ثوانٍ', many: 'ثانيةً', other: 'ثانية' },
};

export function startCountdown(root: HTMLElement): void {
  const target = Date.parse(wedding.startsAt);
  const end = target + wedding.durationHours * 3600_000;
  const rules = new Intl.PluralRules('ar');
  const label = root.querySelector<HTMLElement>('#countdownLabel')!;
  const nums = {} as Record<Unit, HTMLElement>;
  const labels = {} as Record<Unit, HTMLElement>;
  for (const u of ['d', 'h', 'm', 's'] as Unit[]) {
    nums[u] = root.querySelector(`[data-unit="${u}"]`)!;
    labels[u] = root.querySelector(`[data-label="${u}"]`)!;
  }

  const set = (u: Unit, n: number) => {
    const text = u === 'd' ? String(n) : String(n).padStart(2, '0');
    if (nums[u].textContent === text) return;
    nums[u].textContent = text;
    labels[u].textContent = forms[u][rules.select(n)];
    nums[u].classList.remove('tick');
    void nums[u].offsetWidth; // restart the animation
    nums[u].classList.add('tick');
  };

  let timer = 0;
  const update = () => {
    const now = Date.now();
    if (now >= end) {
      root.className = 'countdown is-past';
      label.textContent = 'تمّ الفرح بحمد الله، بارك الله لهما';
      clearInterval(timer);
      return;
    }
    if (now >= target) {
      root.className = 'countdown is-today';
      label.textContent = 'الفرح قائم الآن، أهلًا وسهلًا بكم';
      return;
    }
    let s = Math.floor((target - now) / 1000);
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const h = Math.floor(s / 3600);
    s -= h * 3600;
    const m = Math.floor(s / 60);
    set('d', d);
    set('h', h);
    set('m', m);
    set('s', s - m * 60);
  };
  update();
  timer = window.setInterval(update, 1000);
}
