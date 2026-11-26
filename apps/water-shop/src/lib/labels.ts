import type { ExpenseCategory, PaymentMode, Txn } from './types';

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = { cash: 'نقداً', credit: 'بالدين', partial: 'دفع جزئي' };

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  transport: 'نقل ومواصلات', electricity: 'كهرباء', supplies: 'مستلزمات', other: 'مصروفات أخرى',
};

/** Arabic label for any txn, e.g. "بيع نقدي", "تسديد دين", "إلغاء بيع". */
export function txnLabel(t: Pick<Txn, 'type' | 'paymentMode' | 'reversedType' | 'expenseCategory'>): string {
  switch (t.type) {
    case 'sale':
      return t.paymentMode === 'cash' ? 'بيع نقدي' : t.paymentMode === 'credit' ? 'بيع بالدين' : 'بيع مع دفع جزئي';
    case 'payment':
      return 'تسديد دين';
    case 'expense':
      return `مصروف · ${EXPENSE_LABEL[t.expenseCategory ?? 'other']}`;
    case 'reversal':
      return t.reversedType === 'sale' ? 'إلغاء بيع' : t.reversedType === 'payment' ? 'إلغاء تسديد' : 'إلغاء مصروف';
  }
}

/** Main amount to show for a txn row (always positive; sign is conveyed by tone). */
export function txnAmount(t: Txn): number {
  switch (t.type) {
    case 'sale': return t.totalM ?? 0;
    case 'payment':
    case 'expense': return t.amountM ?? 0;
    case 'reversal': return Math.abs(t.salesM || t.cashM || t.debtM);
  }
}

/** Visual tone: pos = money in, neg = debt/money out, neutral otherwise. */
export function txnTone(t: Txn): 'pos' | 'neg' | 'warn' | 'neutral' {
  if (t.type === 'payment') return 'pos';
  if (t.type === 'expense') return 'neg';
  if (t.type === 'reversal') return 'warn';
  if (t.type === 'sale') return t.debtM > 0 ? 'neg' : 'pos';
  return 'neutral';
}

/** Payment status line for a sale. */
export function saleStatus(t: Txn): string | null {
  if (t.type !== 'sale') return null;
  if (t.debtM === 0) return 'مدفوع بالكامل';
  if (t.paidM === 0) return 'غير مدفوع';
  return 'مدفوع جزئياً';
}
