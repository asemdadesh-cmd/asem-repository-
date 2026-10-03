import { useId, type InputHTMLAttributes } from 'react';

const symbolCache = new Map<string, string>();
export function currencySymbol(currency: string): string {
  let s = symbolCache.get(currency);
  if (!s) {
    s =
      new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency;
    symbolCache.set(currency, s);
  }
  return s;
}

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  currency: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hideLabel?: boolean;
}

export function MoneyInput({ label, currency, value, onChange, error, hideLabel, className = '', ...rest }: Props) {
  const id = useId();
  const sym = currencySymbol(currency);
  return (
    <label className="field" htmlFor={id}>
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <div className="input-prefix" style={{ ['--prefix-w' as string]: `${sym.length}ch` }}>
        <b aria-hidden="true">{sym}</b>
        <input
          id={id}
          className={`input num ${className}`}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <small className="field-error" id={`${id}-err`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
