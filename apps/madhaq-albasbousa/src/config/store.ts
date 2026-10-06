// ─────────────────────────────────────────────────────────────
// Store settings — everything about the shop that is NOT the menu.
// Edit this file when the owner confirms real details.
// ─────────────────────────────────────────────────────────────

export const store = {
  nameAr: 'مذاق البسبوسة',
  nameEn: 'Madhaq Al-Basbousa',
  established: 2020,

  /** Shown to customers. */
  phoneDisplay: '0914153311',
  /** International format, digits only — used for wa.me and tel: links. */
  whatsappNumber: '218914153311',

  city: 'طرابلس',
  currency: 'د.ل',

  /** Prefix for order numbers in the WhatsApp message, e.g. MB-1024. */
  orderPrefix: 'MB',

  /** V1 demo: shows a slim notice that prices and photos are placeholders. Set to false for launch. */
  demoMode: true,

  hours: 'يومياً من 10 الصبح إلى 11 الليل',
  pickupNote: 'الاستلام من المحل — نرسلك الموقع على واتساب بعد تأكيد الطلب.',
  deliveryFeeNote: 'رسوم التوصيل تتحدد حسب المنطقة ونأكدها معاك على واتساب.',
  leadTimeNote: 'الصواني الكبيرة وطلبات المناسبات يفضّل تطلبها قبلها بيوم.',
  paymentNote: 'الدفع كاش عند الاستلام.',

  /** Suggestions for the "المنطقة" field (customers can still type anything). */
  areas: [
    'وسط البلاد',
    'حي الأندلس',
    'قرجي',
    'قرقارش',
    'سوق الجمعة',
    'تاجوراء',
    'عين زارة',
    'الهضبة',
    'الدريبي',
    'جنزور',
    'السراج',
    'بن عاشور',
    'الظهرة',
    'الفرناج',
    'صلاح الدين',
  ],

  instagram: '',
  facebook: '',
} as const;

export type Store = typeof store;
