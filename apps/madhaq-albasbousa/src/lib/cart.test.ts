import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../config/menu';
import { defaultVariant, startingPrice, suggestTrays, unitLabel, wholeUnitLabel } from './catalog';
import { cartCount, cartLines, cartReducer, cartTotal, MAX_QTY, sanitizeCart } from './cart';

describe('menu model', () => {
  it('sells every product as a whole tray, box or cake — never per piece', () => {
    for (const p of PRODUCTS) {
      expect(['tray', 'box', 'cake']).toContain(p.unitType);
      expect(p.variants.length).toBeGreaterThan(0);
      for (const v of p.variants) {
        expect(v.price).toBeGreaterThan(0);
        expect(v.serves).toMatch(/\d/);
        expect(`${p.nameAr} ${v.nameAr} ${v.serves}`).not.toMatch(/قطعة|حبة|piece/i);
      }
    }
  });

  it('has unique product ids and unique size ids per product', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) expect(new Set(p.variants.map((v) => v.id)).size).toBe(p.variants.length);
  });

  it('labels units the Libyan way', () => {
    const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;
    expect(wholeUnitLabel(byId('basbousa-qishta'))).toBe('طاجين كامل');
    expect(unitLabel(byId('kunafa-qishta'))).toBe('صينية');
    expect(unitLabel(byId('baklava-mix'))).toBe('بوكس');
    expect(unitLabel(byId('lotus-cheesecake'))).toBe('قالب');
  });

  it('shows the cheapest size as the "from" price and pre-selects the middle size', () => {
    const b = PRODUCTS.find((p) => p.id === 'basbousa-qishta')!;
    expect(startingPrice(b)).toBe(30);
    expect(defaultVariant(b).id).toBe('medium');
  });
});

describe('cart', () => {
  const add = (productId: string, variantId: string, qty = 1) => ({ type: 'add', productId, variantId, qty }) as const;

  it('counts whole trays and multiplies by the size price', () => {
    let items = cartReducer([], add('basbousa-qishta', 'medium', 2));
    items = cartReducer(items, add('kunafa-nutella', 'large'));
    items = cartReducer(items, add('baklava-mix', 'medium'));
    const lines = cartLines(items);
    expect(lines.map((l) => l.total)).toEqual([90, 80, 55]);
    expect(cartTotal(lines)).toBe(225);
    expect(cartCount(items)).toBe(4);
  });

  it('merges the same product + size, keeps different sizes apart', () => {
    let items = cartReducer([], add('basbousa-qishta', 'medium'));
    items = cartReducer(items, add('basbousa-qishta', 'medium', 2));
    items = cartReducer(items, add('basbousa-qishta', 'large'));
    expect(items).toEqual([
      { productId: 'basbousa-qishta', variantId: 'medium', qty: 3 },
      { productId: 'basbousa-qishta', variantId: 'large', qty: 1 },
    ]);
  });

  it('clamps quantity and removes a line set to zero', () => {
    let items = cartReducer([], add('basbousa-qishta', 'small', 999));
    expect(items[0].qty).toBe(MAX_QTY);
    items = cartReducer(items, { type: 'set', productId: 'basbousa-qishta', variantId: 'small', qty: 0 });
    expect(items).toEqual([]);
  });

  it('drops stale or malformed saved items', () => {
    expect(
      sanitizeCart([
        { productId: 'basbousa-qishta', variantId: 'medium', qty: 2 },
        { productId: 'gone', variantId: 'medium', qty: 1 },
        { productId: 'basbousa-qishta', variantId: 'xl', qty: 1 },
        { productId: 'basbousa-qishta', variantId: 'small', qty: '3' },
        null,
      ]),
    ).toEqual([{ productId: 'basbousa-qishta', variantId: 'medium', qty: 2 }]);
    expect(sanitizeCart('nope')).toEqual([]);
  });
});

describe('how many trays for N people', () => {
  it('picks the fewest trays that cover the head-count', () => {
    expect(suggestTrays(4)).toEqual([{ size: 'small', count: 1 }]);
    expect(suggestTrays(9)).toEqual([{ size: 'medium', count: 1 }]);
    expect(suggestTrays(16)).toEqual([{ size: 'large', count: 1 }]);
    expect(suggestTrays(20)).toEqual([
      { size: 'large', count: 1 },
      { size: 'small', count: 1 },
    ]);
    expect(suggestTrays(40)).toEqual([
      { size: 'large', count: 2 },
      { size: 'medium', count: 1 },
    ]);
  });
});
