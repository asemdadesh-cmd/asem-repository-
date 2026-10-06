import { CATEGORIES, PRODUCTS, SERVES_UP_TO, UNIT_LABELS } from '../config/menu';
import { store } from '../config/store';
import type { CategoryId, Photo, Product, Variant } from './types';

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

export const getProduct = (id: string): Product | undefined => byId.get(id);

export const getVariant = (product: Product, variantId: string): Variant | undefined =>
  product.variants.find((v) => v.id === variantId);

export const unitLabel = (product: Product): string => product.unitLabel ?? UNIT_LABELS[product.unitType];

/** "طاجين كامل" / "بوكس كامل" / "قالب كامل" — tells the customer they buy the whole thing. */
export const wholeUnitLabel = (product: Product): string => `${unitLabel(product)} كامل`;

export const startingPrice = (product: Product): number => Math.min(...product.variants.map((v) => v.price));

export const defaultVariant = (product: Product): Variant =>
  (product.defaultVariantId && getVariant(product, product.defaultVariantId)) ||
  product.variants[Math.floor((product.variants.length - 1) / 2)];

export const variantImage = (product: Product, variant?: Variant): Photo => variant?.image ?? product.image;

export const productsIn = (category: CategoryId | 'all'): Product[] =>
  category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);

export const categoryName = (id: CategoryId): string => CATEGORIES.find((c) => c.id === id)?.nameAr ?? id;

export const formatPrice = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(2)} ${store.currency}`;

/**
 * "كم شخص عندك؟" — suggests the fewest standard trays that cover a head-count,
 * using the serving estimates in the menu config.
 */
export function suggestTrays(people: number): { size: 'small' | 'medium' | 'large'; count: number }[] {
  const { small, medium, large } = SERVES_UP_TO;
  let left = Math.max(1, Math.round(people));
  let bigOnes = 0;
  while (left > large) {
    bigOnes++;
    left -= large;
  }
  const last = left <= small ? 'small' : left <= medium ? 'medium' : 'large';
  const out: { size: 'small' | 'medium' | 'large'; count: number }[] = [];
  if (last === 'large') bigOnes++;
  if (bigOnes) out.push({ size: 'large', count: bigOnes });
  if (last !== 'large') out.push({ size: last, count: 1 });
  return out;
}
