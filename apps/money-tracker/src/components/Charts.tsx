import { useLayoutEffect, useRef, useState } from 'react';
import { getCategory } from '../lib/categories';
import { monthLabel } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { ProjectionPoint } from '../lib/projection';
import type { MonthTotals } from '../lib/stats';

const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };
const innerH = H - PAD.top - PAD.bottom;

/** Track the rendered width so SVG text stays at true pixel size on every screen. */
function useWidth<T extends HTMLElement>(fallback = 520) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(240, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** ~4 "nice" ticks from 0 to >= max. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Bar path with a 4px rounded data-end and a square baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function YAxis({ ticks, scale, currency, W }: { ticks: number[]; scale: (v: number) => number; currency: string; W: number }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line className="gridline" x1={PAD.left} x2={W - PAD.right} y1={scale(t)} y2={scale(t)} />
          <text className="axis num" x={PAD.left - 8} y={scale(t)} textAnchor="end" dominantBaseline="middle">
            {formatMoney(t, currency, { compact: true })}
          </text>
        </g>
      ))}
    </g>
  );
}

/* ---------------- Cash flow: income vs spent per month ---------------- */
export function CashflowChart({ data, currency }: { data: MonthTotals[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLElement>();
  const innerW = W - PAD.left - PAD.right;
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const band = innerW / data.length;
  const barW = Math.min(22, band * 0.3);
  const gap = 2;
  const m = (v: number) => formatMoney(v, currency);

  return (
    <figure className="chart" style={{ margin: 0 }} ref={ref}>
      <div className="legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--series-income)' }} />
          Money in
        </span>
        <span>
          <i style={{ background: 'var(--series-expense)' }} />
          Money out
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Money in versus money out for the last six months" onMouseLeave={() => setHover(null)}>
        <YAxis ticks={ticks} scale={y} currency={currency} W={W} />
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          return (
            <g key={d.month} opacity={hover === null || hover === i ? 1 : 0.45}>
              <path d={barPath(cx - barW - gap / 2, y(d.income), barW, y(0) - y(d.income))} fill="var(--series-income)" />
              <path d={barPath(cx + gap / 2, y(d.expense), barW, y(0) - y(d.expense))} fill="var(--series-expense)" />
              <text className="axis" x={cx} y={H - 8} textAnchor="middle">
                {monthLabel(d.month, 'short')}
              </text>
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="tooltip"
          style={{
            left: `${((PAD.left + band * hover + band / 2) / W) * 100}%`,
            top: `${(y(Math.max(data[hover].income, data[hover].expense)) / H) * 100}%`,
          }}
        >
          <div className="t">{monthLabel(data[hover].month)}</div>
          <div className="r">
            <span>Money in</span>
            <b className="num">{m(data[hover].income)}</b>
          </div>
          <div className="r">
            <span>Money out</span>
            <b className="num">{m(data[hover].expense)}</b>
          </div>
          <div className="r">
            <span>Kept</span>
            <b className="num">{m(data[hover].saved)}</b>
          </div>
        </div>
      )}
      <div className="sr-only">
        <table>
        <caption>Monthly cash flow</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Money in</th>
            <th scope="col">Money out</th>
            <th scope="col">Kept</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th scope="row">{monthLabel(d.month)}</th>
              <td>{m(d.income)}</td>
              <td>{m(d.expense)}</td>
              <td>{m(d.saved)}</td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
    </figure>
  );
}

/* ---------------- Spending by category ---------------- */
export function CategoryBars({ data, currency, total, limit = 6 }: { data: { id: string; amount: number }[]; currency: string; total: number; limit?: number }) {
  const shown = data.slice(0, limit);
  const rest = data.slice(limit).reduce((s, d) => s + d.amount, 0);
  const rows = rest ? [...shown, { id: '__rest', amount: rest }] : shown;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="catbars">
      {rows.map((r) => {
        const c = r.id === '__rest' ? { emoji: '…', label: 'Everything else' } : getCategory(r.id);
        const share = total ? Math.round((r.amount / total) * 100) : 0;
        return (
          <li key={r.id} className="catbar">
            <div className="top">
              <span>
                <span aria-hidden="true">{c.emoji}</span> {c.label}
              </span>
              <span className="num">
                {formatMoney(r.amount, currency)} <span className="muted small">· {share}%</span>
              </span>
            </div>
            <div className="track" aria-hidden="true">
              <i style={{ width: `${(r.amount / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Savings-rate ring ---------------- */
export function RateRing({ rate, target }: { rate: number; target: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, rate));
  const targetAngle = (target / 100) * 360 - 90;
  const tx = 60 + r * Math.cos((targetAngle * Math.PI) / 180);
  const ty = 60 + r * Math.sin((targetAngle * Math.PI) / 180);
  return (
    <svg className="rate-ring" width="128" height="128" viewBox="0 0 120 120" role="img" aria-label={`Savings rate ${Math.round(rate)} percent, target ${target} percent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--hero-accent)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * c} ${c}`}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      <circle cx={tx} cy={ty} r="4" fill="#fff" stroke="var(--hero-2)" strokeWidth="2" />
      <text x="60" y="58" textAnchor="middle" fontSize="24" fontWeight="780" className="num">
        {Math.round(rate)}%
      </text>
      <text x="60" y="78" textAnchor="middle" fontSize="10.5" opacity="0.8">
        kept
      </text>
    </svg>
  );
}

/* ---------------- Wealth projection: contributions + growth ---------------- */
export function ProjectionChart({ data, currency }: { data: ProjectionPoint[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLElement>();
  const innerW = W - PAD.left - PAD.right;
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 1));
  const top = ticks[ticks.length - 1];
  const n = data.length - 1 || 1;
  const x = (i: number) => PAD.left + (i / n) * innerW;
  const y = (v: number) => PAD.top + innerH - (Math.max(0, v) / top) * innerH;
  const line = (key: 'value' | 'contributed') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[key])}`).join('');
  const area = (key: 'value' | 'contributed') => `${line(key)}L${x(n)},${y(0)}L${x(0)},${y(0)}Z`;
  const step = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor(innerW / 60))));
  const m = (v: number) => formatMoney(v, currency);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * n);
    setHover(Math.max(0, Math.min(n, i)));
  };

  return (
    <figure className="chart" style={{ margin: 0 }} ref={ref}>
      <div className="legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--series-income)' }} />
          What you put in
        </span>
        <span>
          <i style={{ background: 'var(--series-growth)' }} />
          Growth (money making money)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Projected savings growth by year" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <YAxis ticks={ticks} scale={y} currency={currency} W={W} />
        <path d={area('value')} fill="var(--series-growth)" opacity="0.28" />
        <path d={area('contributed')} fill="var(--series-income)" opacity="0.32" />
        <path d={line('value')} fill="none" stroke="var(--series-growth)" strokeWidth="2" />
        <path d={line('contributed')} fill="none" stroke="var(--series-income)" strokeWidth="2" />
        {data.map((d, i) =>
          (i % step === 0 && n - i >= step * 0.6) || i === n ? (
            <text key={d.year} className="axis" x={x(i)} y={H - 8} textAnchor="middle">
              {d.year === 0 ? 'Now' : `${d.year}y`}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="var(--series-growth)" stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(data[hover].contributed)} r="5" fill="var(--series-income)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${Math.min(80, Math.max(20, (x(hover) / W) * 100))}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          <div className="t">{data[hover].year === 0 ? 'Today' : `After ${data[hover].year} year${data[hover].year > 1 ? 's' : ''}`}</div>
          <div className="r">
            <span>Total</span>
            <b className="num">{m(data[hover].value)}</b>
          </div>
          <div className="r">
            <span>You put in</span>
            <b className="num">{m(data[hover].contributed)}</b>
          </div>
          <div className="r">
            <span>Growth</span>
            <b className="num">{m(data[hover].value - data[hover].contributed)}</b>
          </div>
        </div>
      )}
      <div className="sr-only">
        <table>
        <caption>Projected savings by year</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Total</th>
            <th scope="col">Contributed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.year}>
              <th scope="row">{d.year}</th>
              <td>{m(d.value)}</td>
              <td>{m(d.contributed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
    </figure>
  );
}
