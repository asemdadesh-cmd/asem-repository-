import { Icon } from './Icon';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  labelledBy?: string;
  itemName: string;
  small?: boolean;
}

export function Stepper({ value, min, max, onChange, labelledBy, itemName, small }: Props) {
  return (
    <div className={`stepper${small ? ' stepper-sm' : ''}`} role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`زيد ${itemName}`}
      >
        <Icon name="plus" size={18} />
      </button>
      <output className="stepper-value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`نقّص ${itemName}`}
      >
        <Icon name="minus" size={18} />
      </button>
    </div>
  );
}
