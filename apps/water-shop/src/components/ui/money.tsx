import { formatNumber, CURRENCY, type Millimes } from '@/lib/money';
import { cn } from '@/lib/utils';

const tones = { pos: 'text-pos-600', neg: 'text-neg-600', warn: 'text-warn-600', brand: 'text-brand-700', neutral: '', muted: 'text-ink-3' };

/** Formatted LYD amount. Always use this for money so formatting is consistent. */
export function Money({ m, tone = 'neutral', className, currencyClassName, sign }: {
  m: Millimes; tone?: keyof typeof tones; className?: string; currencyClassName?: string; sign?: boolean;
}) {
  const prefix = sign && m > 0 ? '+' : '';
  return (
    <span className={cn('inline-flex items-baseline gap-1 font-extrabold', tones[tone], className)}>
      <span className="num">{prefix}{formatNumber(m)}</span>
      <span className={cn('text-[0.7em] font-bold opacity-75', currencyClassName)}>{CURRENCY}</span>
    </span>
  );
}
