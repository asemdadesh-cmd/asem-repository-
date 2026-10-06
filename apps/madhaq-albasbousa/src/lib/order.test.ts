import { describe, expect, it } from 'vitest';
import { cartLines, cartTotal } from './cart';
import { buildOrderMessage, emptyDetails, normalizePhone, validateDetails, whatsappUrl } from './order';
import type { CustomerDetails } from './types';

const items = [
  { productId: 'basbousa-qishta', variantId: 'medium', qty: 2 },
  { productId: 'kunafa-nutella', variantId: 'large', qty: 1 },
  { productId: 'baklava-mix', variantId: 'medium', qty: 1 },
];
const details: CustomerDetails = {
  ...emptyDetails,
  name: 'أحمد',
  phone: '٠٩١٢٣٤٥٦٧٨',
  area: 'حي الأندلس',
  address: 'قرب جامع الصحابة',
  notes: 'بدون فستق على البسبوسة',
};

describe('WhatsApp order message', () => {
  const lines = cartLines(items);
  const msg = buildOrderMessage('MB-1024', details, lines, cartTotal(lines));

  it('matches the agreed tray-based format', () => {
    expect(msg).toBe(
      [
        '🍰 طلب جديد — مذاق البسبوسة',
        '',
        'رقم الطلب: MB-1024',
        '',
        'الاسم: أحمد',
        'الهاتف: 0912345678',
        'المنطقة: طرابلس — حي الأندلس',
        'طريقة الاستلام: توصيل',
        'موعد التسليم: أقرب وقت',
        '',
        '━━━━━━━━━━',
        '',
        'الطلب:',
        '',
        '2× طاجين بسبوسة بالقشطة',
        'الحجم: وسط',
        '45 د.ل × 2',
        'المجموع: 90 د.ل',
        '',
        '1× صينية كنافة نوتيلا',
        'الحجم: كبير',
        '80 د.ل',
        '',
        '1× بوكس بقلاوة مشكلة',
        'الحجم: وسط',
        '55 د.ل',
        '',
        '━━━━━━━━━━',
        '',
        'الإجمالي: 225 د.ل',
        '(+ رسوم التوصيل حسب المنطقة)',
        '',
        'العنوان:',
        'قرب جامع الصحابة',
        '',
        'ملاحظات:',
        'بدون فستق على البسبوسة',
      ].join('\n'),
    );
  });

  it('never talks about pieces', () => {
    expect(msg).not.toMatch(/قطعة|حبة/);
  });

  it('does not repeat the unit when the name already starts with it', () => {
    const l = cartLines([{ productId: 'baklava-tray', variantId: 'small', qty: 1 }]);
    expect(buildOrderMessage('MB-1', details, l, cartTotal(l))).toContain('1× صينية بقلاوة بالفستق\n');
  });

  it('omits address lines for pickup and shows a chosen date', () => {
    const l = cartLines(items.slice(0, 1));
    const m = buildOrderMessage('MB-2', { ...details, fulfilment: 'pickup', when: 'date', date: '2026-10-09' }, l, 90);
    expect(m).toContain('طريقة الاستلام: استلام من المحل');
    expect(m).toContain('موعد التسليم: 9/10/2026');
    expect(m).not.toContain('العنوان:');
    expect(m).not.toContain('المنطقة:');
  });

  it('encodes the text into a wa.me link for the shop number', () => {
    const url = whatsappUrl('طلب & 2×');
    expect(url.startsWith('https://wa.me/218914153311?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('طلب & 2×');
  });
});

describe('checkout validation', () => {
  it('accepts Libyan numbers in any common form', () => {
    for (const p of ['0912345678', '091 234 5678', '+218 91 234 5678', '00218912345678', '912345678', '٠٩٢٣٤٥٦٧٨٩']) {
      expect(normalizePhone(p)).toMatch(/^09\d{8}$/);
    }
    expect(normalizePhone('12345')).toBeNull();
  });

  it('requires area and address only for delivery', () => {
    const base = { ...emptyDetails, name: 'سارة', phone: '0912345678' };
    expect(Object.keys(validateDetails(base))).toEqual(['area', 'address']);
    expect(validateDetails({ ...base, fulfilment: 'pickup' })).toEqual({});
  });

  it('rejects a past date', () => {
    const d = { ...details, when: 'date', date: '2020-01-01' };
    expect(validateDetails(d, new Date(2026, 9, 6)).date).toBeTruthy();
    expect(validateDetails({ ...d, date: '2026-10-06' }, new Date(2026, 9, 6)).date).toBeUndefined();
  });
});
