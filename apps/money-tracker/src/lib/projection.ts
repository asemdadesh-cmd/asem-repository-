export interface ProjectionPoint {
  year: number;
  contributed: number;
  value: number;
}

/**
 * Month-by-month compound growth. Amounts in minor units, `annualRate` in percent.
 * Returns one point per year (including year 0).
 */
export function project(start: number, monthly: number, annualRate: number, years: number): ProjectionPoint[] {
  const r = annualRate / 100 / 12;
  let value = start;
  let contributed = start;
  const out: ProjectionPoint[] = [{ year: 0, contributed, value }];
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) out.push({ year: m / 12, contributed, value: Math.round(value) });
  }
  return out;
}

/** Months needed to reach `target`, or null if it's not reachable within 100 years. */
export function monthsToTarget(start: number, monthly: number, annualRate: number, target: number): number | null {
  if (start >= target) return 0;
  const r = annualRate / 100 / 12;
  let value = start;
  for (let m = 1; m <= 1200; m++) {
    value = value * (1 + r) + monthly;
    if (value >= target) return m;
  }
  return null;
}
