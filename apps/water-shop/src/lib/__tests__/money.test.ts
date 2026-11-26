import { describe, expect, it } from 'vitest';
import { formatNumber, parseMoney } from '../money';

describe('parseMoney', () => {
  it.each([
    ['5', 5000],
    ['0.25', 250],
    ['5.5', 5500],
    ['٥٫٥', 5500], // Arabic-Indic digits + Arabic decimal separator
    ['1.2345', null], // more than 3 decimals
    ['-1', null],
    ['', null],
    ['abc', null],
  ])('parseMoney(%j) -> %j', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it('returns null for null/undefined input', () => {
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
  });
});

describe('formatNumber', () => {
  it.each([
    [250, '0.25'],
    [5500, '5.50'],
    [125, '0.125'],
    [1234500, '1,234.50'],
    [-15000, '-15.00'],
  ])('formatNumber(%i) -> %j', (input, expected) => {
    expect(formatNumber(input)).toBe(expected);
  });
});
