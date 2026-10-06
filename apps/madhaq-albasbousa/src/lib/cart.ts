import { getProduct, getVariant, unitLabel } from './catalog';
import type { CartItem, Product, Variant } from './types';

export const MAX_QTY = 20;

/** A cart item joined with the live menu (prices always come from the menu, never from storage). */
export interface CartLine {
  key: string;
  product: Product;
  variant: Variant;
  qty: number;
  unit: string;
  total: number;
}

export const lineKey = (productId: string, variantId: string) => `${productId}:${variantId}`;

const clampQty = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(n)));

export type CartAction =
  | { type: 'add'; productId: string; variantId: string; qty: number }
  | { type: 'set'; productId: string; variantId: string; qty: number }
  | { type: 'remove'; productId: string; variantId: string }
  | { type: 'clear' }
  | { type: 'load'; items: CartItem[] };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = items.find((i) => i.productId === action.productId && i.variantId === action.variantId);
      if (existing) {
        return items.map((i) => (i === existing ? { ...i, qty: clampQty(i.qty + action.qty) } : i));
      }
      const qty = clampQty(action.qty);
      return qty ? [...items, { productId: action.productId, variantId: action.variantId, qty }] : items;
    }
    case 'set': {
      const qty = clampQty(action.qty);
      if (!qty) return items.filter((i) => !(i.productId === action.productId && i.variantId === action.variantId));
      return items.map((i) =>
        i.productId === action.productId && i.variantId === action.variantId ? { ...i, qty } : i,
      );
    }
    case 'remove':
      return items.filter((i) => !(i.productId === action.productId && i.variantId === action.variantId));
    case 'clear':
      return [];
    case 'load':
      return sanitizeCart(action.items);
  }
}

/** Drops anything that no longer exists on the menu or is malformed (e.g. old localStorage data). */
export function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const { productId, variantId, qty } = r as Record<string, unknown>;
    if (typeof productId !== 'string' || typeof variantId !== 'string' || typeof qty !== 'number') continue;
    const product = getProduct(productId);
    if (!product || !getVariant(product, variantId)) continue;
    const q = clampQty(qty);
    if (q && !out.some((i) => i.productId === productId && i.variantId === variantId)) {
      out.push({ productId, variantId, qty: q });
    }
  }
  return out;
}

export function cartLines(items: CartItem[]): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = getProduct(item.productId);
    const variant = product && getVariant(product, item.variantId);
    if (!product || !variant) continue;
    lines.push({
      key: lineKey(product.id, variant.id),
      product,
      variant,
      qty: item.qty,
      unit: unitLabel(product),
      total: variant.price * item.qty,
    });
  }
  return lines;
}

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.total, 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.qty, 0);
