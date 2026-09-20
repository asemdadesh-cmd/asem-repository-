/* ==========================================================================
   Barq — Non-product content: delivery zones, stores, payment, proof, FAQ.
   Shipping zones mirror how goods actually move in Libya: the Tripoli metro
   is next-day, the coastal west is 2–3 days, Cyrenaica is 3–5, and the south
   is a genuinely long haul. Pretending otherwise would just generate refunds.
   ========================================================================== */

export const CURRENCY = { code: 'LYD', ar: 'د.ل', en: 'LYD' };
export const VAT_RATE = 0;            /* Libya levies no consumer VAT on retail electronics */
export const FREE_SHIPPING_OVER = 1500;
export const PREPAY_DISCOUNT = 0.03;  /* 3% off when paying up front rather than on delivery */

export const ZONES = [
  { id: 'z1', fee: 15, days: { ar: '24 ساعة', en: '24 hours' }, name: { ar: 'طرابلس الكبرى', en: 'Greater Tripoli' } },
  { id: 'z2', fee: 25, days: { ar: '2 – 3 أيام', en: '2 – 3 days' }, name: { ar: 'الساحل الغربي', en: 'Western Coast' } },
  { id: 'z3', fee: 40, days: { ar: '3 – 5 أيام', en: '3 – 5 days' }, name: { ar: 'الشرق', en: 'Eastern Region' } },
  { id: 'z4', fee: 60, days: { ar: '5 – 8 أيام', en: '5 – 8 days' }, name: { ar: 'الجنوب', en: 'Southern Region' } },
];

export const CITIES = [
  { id: 'tripoli',  zone: 'z1', name: { ar: 'طرابلس', en: 'Tripoli' } },
  { id: 'janzour',  zone: 'z1', name: { ar: 'جنزور', en: 'Janzour' } },
  { id: 'tajoura',  zone: 'z1', name: { ar: 'تاجوراء', en: 'Tajoura' } },
  { id: 'zawiya',   zone: 'z1', name: { ar: 'الزاوية', en: 'Zawiya' } },
  { id: 'misrata',  zone: 'z2', name: { ar: 'مصراتة', en: 'Misrata' } },
  { id: 'khoms',    zone: 'z2', name: { ar: 'الخمس', en: 'Khoms' } },
  { id: 'zliten',   zone: 'z2', name: { ar: 'زليتن', en: 'Zliten' } },
  { id: 'sabratha', zone: 'z2', name: { ar: 'صبراتة', en: 'Sabratha' } },
  { id: 'gharyan',  zone: 'z2', name: { ar: 'غريان', en: 'Gharyan' } },
  { id: 'tarhuna',  zone: 'z2', name: { ar: 'ترهونة', en: 'Tarhuna' } },
  { id: 'sirte',    zone: 'z3', name: { ar: 'سرت', en: 'Sirte' } },
  { id: 'benghazi', zone: 'z3', name: { ar: 'بنغازي', en: 'Benghazi' } },
  { id: 'ajdabiya', zone: 'z3', name: { ar: 'أجدابيا', en: 'Ajdabiya' } },
  { id: 'marj',     zone: 'z3', name: { ar: 'المرج', en: 'Al Marj' } },
  { id: 'bayda',    zone: 'z3', name: { ar: 'البيضاء', en: 'Al Bayda' } },
  { id: 'derna',    zone: 'z3', name: { ar: 'درنة', en: 'Derna' } },
  { id: 'tobruk',   zone: 'z3', name: { ar: 'طبرق', en: 'Tobruk' } },
  { id: 'sebha',    zone: 'z4', name: { ar: 'سبها', en: 'Sebha' } },
  { id: 'ubari',    zone: 'z4', name: { ar: 'أوباري', en: 'Ubari' } },
  { id: 'murzuq',   zone: 'z4', name: { ar: 'مرزق', en: 'Murzuq' } },
  { id: 'ghat',     zone: 'z4', name: { ar: 'غات', en: 'Ghat' } },
  { id: 'kufra',    zone: 'z4', name: { ar: 'الكفرة', en: 'Kufra' } },
];

/* Libya has no Visa/Mastercard acquiring worth relying on, so the payment mix
   is cash on delivery, local bank transfer and the domestic mobile wallets. */
export const PAYMENTS = [
  {
    id: 'cod', fee: 0, popular: true,
    name: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
    desc: { ar: 'ادفع نقداً للمندوب بعد فحص المنتج أمامك.', en: 'Pay the courier in cash after you inspect the product.' },
  },
  {
    id: 'transfer', fee: 0, discount: PREPAY_DISCOUNT,
    name: { ar: 'حوالة مصرفية', en: 'Bank transfer' },
    desc: { ar: 'خصم 3% عند التحويل المسبق. نرسل لك بيانات الحساب بعد الطلب.', en: '3% off when you prepay. We send account details after you order.' },
  },
  {
    id: 'wallet', fee: 0, discount: PREPAY_DISCOUNT,
    name: { ar: 'محفظة إلكترونية', en: 'Mobile wallet' },
    desc: { ar: 'سداد · موبي كاش · إدفعلي — خصم 3%.', en: 'Sadad · MobiCash · Edfali — 3% off.' },
  },
  {
    id: 'store', fee: 0,
    name: { ar: 'الدفع في المعرض', en: 'Pay in store' },
    desc: { ar: 'احجز الآن وادفع عند الاستلام من أحد معارضنا.', en: 'Reserve now, pay when you collect from one of our stores.' },
  },
];

export const STORES = [
  {
    id: 'tripoli',
    name: { ar: 'معرض طرابلس — قرقارش', en: 'Tripoli Showroom — Gargaresh' },
    address: { ar: 'طريق قرقارش، بالقرب من تقاطع النجيلة، طرابلس', en: 'Gargaresh Road, near Al-Nejila junction, Tripoli' },
    phone: '+218 91 234 5678',
    hours: { ar: 'السبت – الخميس، 9:00 ص – 9:00 م', en: 'Sat – Thu, 9:00 – 21:00' },
  },
  {
    id: 'benghazi',
    name: { ar: 'معرض بنغازي — شارع دبي', en: 'Benghazi Showroom — Dubai Street' },
    address: { ar: 'شارع دبي، وسط المدينة، بنغازي', en: 'Dubai Street, city centre, Benghazi' },
    phone: '+218 92 345 6789',
    hours: { ar: 'السبت – الخميس، 9:30 ص – 8:30 م', en: 'Sat – Thu, 9:30 – 20:30' },
  },
  {
    id: 'misrata',
    name: { ar: 'معرض مصراتة — شارع طرابلس', en: 'Misrata Showroom — Tripoli Street' },
    address: { ar: 'شارع طرابلس، مصراتة', en: 'Tripoli Street, Misrata' },
    phone: '+218 94 456 7890',
    hours: { ar: 'السبت – الخميس، 9:00 ص – 8:00 م', en: 'Sat – Thu, 9:00 – 20:00' },
  },
];

/* Promo codes are validated client-side here purely because this build has no
   server. In production this check must move behind an API — see README. */
export const PROMOS = [
  { code: 'BARQ10', type: 'percent', value: 0.1, min: 500, label: { ar: 'خصم 10%', en: '10% off' } },
  { code: 'LIBYA50', type: 'amount', value: 50, min: 800, label: { ar: 'خصم 50 د.ل', en: '50 LYD off' } },
  { code: 'AHLAN', type: 'percent', value: 0.05, min: 0, label: { ar: 'خصم ترحيبي 5%', en: '5% welcome discount' } },
];

export const TESTIMONIALS = [
  {
    id: 't1', city: { ar: 'طرابلس', en: 'Tripoli' }, name: { ar: 'خالد المبروك', en: 'Khaled Al-Mabrouk' }, rating: 5,
    text: {
      ar: 'طلبت لابتوب يوم الثلاثاء ووصلني الأربعاء صباحاً بجنزور. فتحت الكرتونة قدام المندوب وفحصت الجهاز قبل ما أدفع. هذي أول مرة أشتري إلكترونيات أونلاين في ليبيا وأنا مرتاح.',
      en: 'Ordered a laptop on Tuesday, it reached me in Janzour on Wednesday morning. I opened the box in front of the courier and checked it before paying. First time I have bought electronics online in Libya and felt fine about it.',
    },
  },
  {
    id: 't2', city: { ar: 'بنغازي', en: 'Benghazi' }, name: { ar: 'سارة العبيدي', en: 'Sara Al-Obeidi' }, rating: 5,
    text: {
      ar: 'المكيف وصل بنغازي في أربعة أيام مع فني ركّبه في نفس اليوم. الفاتورة والضمان كانوا داخل الكرتونة، والرقم التسلسلي مطابق.',
      en: 'The AC reached Benghazi in four days and a technician fitted it the same day. Invoice and warranty were in the box, serial number matched.',
    },
  },
  {
    id: 't3', city: { ar: 'مصراتة', en: 'Misrata' }, name: { ar: 'أيمن الزروق', en: 'Ayman Al-Zarrouk' }, rating: 4,
    text: {
      ar: 'الأسعار واضحة والموقع يشتغل عربي بالكامل. الشحن أخذ ثلاثة أيام بدل يومين بس خدمة العملاء ردّت عليّ في دقائق عبر واتساب.',
      en: 'Prices are transparent and the site works fully in Arabic. Shipping took three days instead of two, but support answered on WhatsApp within minutes.',
    },
  },
  {
    id: 't4', city: { ar: 'سبها', en: 'Sebha' }, name: { ar: 'نورالدين قذاف', en: 'Nouraddin Gadaf' }, rating: 5,
    text: {
      ar: 'ساكن في سبها ومعظم المواقع ما توصل عندنا. برق وصّلت الثلاجة في ستة أيام وكانت مغلفة كويس جداً. ولا خدش.',
      en: 'I live in Sebha and most sites will not ship here. Barq delivered the fridge in six days, extremely well packed. Not a scratch.',
    },
  },
  {
    id: 't5', city: { ar: 'الزاوية', en: 'Zawiya' }, name: { ar: 'هدى الشريف', en: 'Huda Al-Sharif' }, rating: 5,
    text: {
      ar: 'استبدلت السماعات بعد أربعة أيام لأنها ما عجبتني والعملية كانت بدون تعقيد. رجّعوا المبلغ كامل.',
      en: 'I swapped the headphones after four days because I did not get on with them. No hassle at all, full refund.',
    },
  },
  {
    id: 't6', city: { ar: 'طبرق', en: 'Tobruk' }, name: { ar: 'محمد بن عامر', en: 'Mohamed Bin Amer' }, rating: 4,
    text: {
      ar: 'اشتريت تلفزيون ٥٥ بوصة. التغليف ممتاز والضمان سنتين محلي — يعني ما يحتاج أرسله برا ليبيا لو صار فيه مشكلة.',
      en: 'Bought a 55" TV. Packaging was excellent and the two-year warranty is local — no shipping it out of Libya if something goes wrong.',
    },
  },
];

export const FAQS = [
  {
    q: { ar: 'هل المنتجات أصلية ومضمونة؟', en: 'Are the products genuine and covered by warranty?' },
    a: {
      ar: 'كل جهاز نبيعه مستورد عبر قنوات رسمية ويصلك برقمه التسلسلي وفاتورة باسمك. الضمان محلي داخل ليبيا من 12 إلى 60 شهراً حسب المنتج، ويُنفّذ في مراكز الصيانة التابعة لنا في طرابلس وبنغازي ومصراتة.',
      en: 'Every device is imported through official channels and arrives with its serial number and an invoice in your name. Warranty is local — 12 to 60 months depending on the product — and is honoured at our own service centres in Tripoli, Benghazi and Misrata.',
    },
  },
  {
    q: { ar: 'كم يستغرق التوصيل؟ وهل توصلون لكل المدن؟', en: 'How long is delivery, and do you cover every city?' },
    a: {
      ar: 'طرابلس الكبرى خلال 24 ساعة، الساحل الغربي 2–3 أيام، الشرق 3–5 أيام، والجنوب 5–8 أيام. نوصل إلى 22 مدينة، والشحن مجاني لأي طلب فوق 1500 د.ل.',
      en: 'Greater Tripoli within 24 hours, the western coast in 2–3 days, the east in 3–5, and the south in 5–8. We reach 22 cities, and delivery is free on any order above 1,500 LYD.',
    },
  },
  {
    q: { ar: 'هل أقدر أفحص المنتج قبل ما أدفع؟', en: 'Can I inspect the product before paying?' },
    a: {
      ar: 'نعم. مع الدفع عند الاستلام، المندوب ينتظرك حتى تفتح الكرتونة وتتأكد من الجهاز والملحقات. إذا كان فيه أي عيب ظاهر، ترفض الاستلام ولا تدفع شيئاً.',
      en: 'Yes. With cash on delivery the courier waits while you open the box and check the device and accessories. If anything is visibly wrong, refuse the delivery and pay nothing.',
    },
  },
  {
    q: { ar: 'ما هي سياسة الإرجاع؟', en: 'What is the returns policy?' },
    a: {
      ar: 'لديك 14 يوماً لإرجاع أي منتج بحالته الأصلية مع التغليف والملحقات، مع استرداد كامل للمبلغ. المنتجات المعيبة تُستبدل خلال 30 يوماً دون أي تكلفة شحن.',
      en: 'You have 14 days to return any product in original condition with packaging and accessories, for a full refund. Faulty items are replaced within 30 days with no shipping cost to you.',
    },
  },
  {
    q: { ar: 'كيف أدفع؟ هل تقبلون البطاقات؟', en: 'How do I pay? Do you accept cards?' },
    a: {
      ar: 'نقبل الدفع عند الاستلام، الحوالة المصرفية، والمحافظ الإلكترونية (سداد، موبي كاش، إدفعلي)، أو الدفع مباشرة في أحد معارضنا. البطاقات الدولية غير مدعومة حالياً في ليبيا، ولهذا نمنح خصم 3% عند الدفع المسبق بدلاً منها.',
      en: 'Cash on delivery, bank transfer, mobile wallets (Sadad, MobiCash, Edfali), or payment in person at one of our stores. International cards are not workable in Libya today, which is why we give 3% off for prepayment instead.',
    },
  },
  {
    q: { ar: 'هل الأجهزة تناسب الكهرباء الليبية؟', en: 'Are the appliances suited to Libyan mains power?' },
    a: {
      ar: 'كل الأجهزة المنزلية والتلفزيونات التي نبيعها تعمل على 220–240 فولت بقابس أوروبي، ونختار موديلات بمدى جهد واسع تتحمل تذبذب الشبكة. نوصي بمنظم جهد مع الثلاجات والمكيفات — متوفر لدينا.',
      en: 'Every appliance and TV we sell runs on 220–240V with a European plug, and we pick wide-voltage models that tolerate grid fluctuation. We recommend a voltage stabiliser with fridges and air conditioners — we stock those too.',
    },
  },
  {
    q: { ar: 'هل التركيب متوفر؟', en: 'Is installation available?' },
    a: {
      ar: 'التركيب مجاني للتلفزيونات فوق 50 بوصة والمكيفات والغسالات داخل طرابلس وبنغازي ومصراتة. في باقي المدن نرتب لك فنياً معتمداً برسوم رمزية.',
      en: 'Installation is free for TVs above 50", air conditioners and washing machines inside Tripoli, Benghazi and Misrata. Elsewhere we arrange an approved technician for a nominal fee.',
    },
  },
  {
    q: { ar: 'كيف أتابع طلبي؟', en: 'How do I track my order?' },
    a: {
      ar: 'بعد تأكيد الطلب تصلك رسالة نصية وواتساب فيها رقم الطلب. استخدمه في صفحة تتبع الطلب، أو راسلنا على واتساب وسنخبرك بموقع الشحنة.',
      en: 'After you confirm, you get an SMS and a WhatsApp message with your order number. Use it on the tracking page, or message us on WhatsApp and we will tell you where the shipment is.',
    },
  },
];

export const CONTACT = {
  phone: '+218 91 234 5678',
  whatsapp: '218912345678',
  email: 'salam@barq.ly',
  hours: { ar: 'السبت – الخميس، 9:00 ص – 9:00 م', en: 'Sat – Thu, 9:00 – 21:00' },
};
