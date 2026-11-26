import { currentMonth, monthLabel, shiftMonth } from '../lib/dates';
import { Icon } from './Icon';

export function MonthSwitch({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const atCurrent = month >= currentMonth();
  return (
    <div className="month-switch" role="group" aria-label="Choose month">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <Icon name="left" size={18} />
      </button>
      <span aria-live="polite">{monthLabel(month, 'long')}</span>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} disabled={atCurrent} aria-label="Next month">
        <Icon name="right" size={18} />
      </button>
    </div>
  );
}
