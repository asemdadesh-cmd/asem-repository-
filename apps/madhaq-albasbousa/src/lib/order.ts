import { store } from '../config/store';
import { formatPrice } from './catalog';
import type { CartLine } from './cart';
import type { CustomerDetails } from './types';

export const WHEN_OPTIONS = [
  { id: 'asap', label: 'أقرب وقت' },
  { id: 'today', label: 'اليوم' },
  { id: 'tomorrow', label: 'غدوة' },
  { id: 'date', label: 'تاريخ محدد' },
] as const;

export const LIMITS = { name: 60, area: 60, address: 300, notes: 500 } as const;

export const emptyDetails: CustomerDetails = {
  name: '',
  phone: '',
  fulfilment: 'delivery',
  area: '',
  address: '',
  when: 'asap',
  date: '',
  notes: '',
};

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → 0-9. Phone keyboards in Libya often type these. */
export const normalizeDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** Returns a local Libyan number like 0912345678, or null if it doesn't look like one. */
export function normalizePhone(input: string): string | null {
  let s = normalizeDigits(input).replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00')) s = s.slice(2);
  if (s.startsWith('218')) s = '0' + s.slice(3);
  if (/^9\d{8}$/.test(s)) s = '0' + s;
  return /^0\d{8,9}$/.test(s) ? s : null;
}

/** Strips control characters and collapses runaway whitespace so the WhatsApp text stays tidy. */
export function clean(s: string, max: number): string {
  return s
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export type DetailErrors = Partial<Record<keyof CustomerDetails, string>>;

export function validateDetails(d: CustomerDetails, today = new Date()): DetailErrors {
  const e: DetailErrors = {};
  if (!clean(d.name, LIMITS.name)) e.name = 'اكتب اسمك';
  if (!normalizePhone(d.phone)) e.phone = 'اكتب رقم هاتف صحيح، مثل 0912345678';
  if (d.fulfilment === 'delivery') {
    if (!clean(d.area, LIMITS.area)) e.area = 'اختار المنطقة';
    if (!clean(d.address, LIMITS.address)) e.address = 'اكتب العنوان أو أقرب نقطة دالة';
  }
  if (d.when === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.date = 'اختار التاريخ';
    else if (d.date < isoDate(today)) e.date = 'التاريخ لازم يكون اليوم أو بعده';
  }
  return e;
}

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function orderNumber(random = Math.random): string {
  return `${store.orderPrefix}-${1000 + Math.floor(random() * 9000)}`;
}

function whenText(d: CustomerDetails): string {
  if (d.when === 'date' && d.date) {
    const [y, m, day] = d.date.split('-');
    return `${Number(day)}/${Number(m)}/${y}`;
  }
  return WHEN_OPTIONS.find((w) => w.id === d.when)?.label ?? WHEN_OPTIONS[0].label;
}

/** "2× طاجين بسبوسة بالقشطة" — the unit word is skipped when the name already starts with it. */
export function lineTitle(line: CartLine): string {
  const name = line.product.nameAr.startsWith(line.unit) ? line.product.nameAr : `${line.unit} ${line.product.nameAr}`;
  return `${line.qty}× ${name}`;
}

const RULE = '━━━━━━━━━━';

export function buildOrderMessage(orderNo: string, d: CustomerDetails, lines: CartLine[], total: number): string {
  const delivery = d.fulfilment === 'delivery';
  const out: string[] = [];

  out.push(`🍰 طلب جديد — ${store.nameAr}`, '', `رقم الطلب: ${orderNo}`, '');
  out.push(`الاسم: ${clean(d.name, LIMITS.name)}`);
  out.push(`الهاتف: ${normalizePhone(d.phone) ?? clean(d.phone, 20)}`);
  if (delivery) out.push(`المنطقة: ${store.city} — ${clean(d.area, LIMITS.area)}`);
  out.push(`طريقة الاستلام: ${delivery ? 'توصيل' : 'استلام من المحل'}`);
  out.push(`موعد التسليم: ${whenText(d)}`);
  out.push('', RULE, '', 'الطلب:', '');

  for (const l of lines) {
    out.push(lineTitle(l), `الحجم: ${l.variant.nameAr}`);
    if (l.qty > 1) out.push(`${formatPrice(l.variant.price)} × ${l.qty}`, `المجموع: ${formatPrice(l.total)}`);
    else out.push(formatPrice(l.total));
    out.push('');
  }

  out.push(RULE, '', `الإجمالي: ${formatPrice(total)}`);
  if (delivery) out.push('(+ رسوم التوصيل حسب المنطقة)');

  if (delivery) out.push('', 'العنوان:', clean(d.address, LIMITS.address));
  const notes = clean(d.notes, LIMITS.notes);
  if (notes) out.push('', 'ملاحظات:', notes);

  return out.join('\n');
}

export const whatsappUrl = (text: string, number: string = store.whatsappNumber) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
