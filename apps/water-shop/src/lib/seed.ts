import type { Category, Product } from './types';

/**
 * Initial catalog. IDs are FIXED so a second device seeding the same defaults
 * never creates duplicates on the server (upsert by id).
 */
const T = '2026-01-01T00:00:00.000Z';
const cat = (n: number) => `00000000-0000-4000-8000-0000000000c${n}`;
const prod = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;

export const SEED_CATEGORIES: Category[] = [
  { id: cat(1), name: 'تعبئة المياه', sort: 1, active: true, updatedAt: T },
  { id: cat(2), name: 'مياه', sort: 2, active: true, updatedAt: T },
  { id: cat(3), name: 'أكواسيلا', sort: 3, active: true, updatedAt: T },
  { id: cat(4), name: 'النبع', sort: 4, active: true, updatedAt: T },
];

const p = (n: number, c: number, name: string, priceM: number, kind: Product['kind'] = 'product'): Product => ({
  id: prod(n), categoryId: cat(c), name, priceM, kind, active: true, sort: n, updatedAt: T,
});

export const SEED_PRODUCTS: Product[] = [
  p(1, 1, 'تعبئة 7 لتر', 250, 'refill'),
  p(2, 1, 'تعبئة 10 لتر', 500, 'refill'),
  p(3, 1, 'تعبئة 15 لتر', 750, 'refill'),
  p(4, 1, 'تعبئة 20 لتر', 1000, 'refill'),
  p(5, 2, 'مياه 7 لتر', 3000),
  p(6, 2, 'مياه 15 لتر', 9000),
  p(7, 2, 'مياه دجلة', 6000),
  p(8, 3, 'أكواسيلا ربع لتر', 5500),
  p(9, 3, 'أكواسيلا نصف لتر', 5500),
  p(10, 3, 'صندوق أكواسيلا', 11000),
  p(11, 4, 'النبع نصف لتر', 7000),
  p(12, 4, 'النبع لتر ونصف', 8000),
];
