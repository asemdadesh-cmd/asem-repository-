/* ==========================================================================
   Barq — Bilingual engine (Arabic default, English secondary)
   Arabic is the primary language because that is the market; English is the
   convenience option. Switching rewrites <html lang> and <html dir>, and the
   whole layout follows because the stylesheets use logical properties.
   Prices keep Latin digits in both languages — that is what Libyan shoppers
   actually read on a price tag.
   ========================================================================== */

export const LANGS = ['ar', 'en'];
export const DEFAULT_LANG = 'ar';
const STORAGE_KEY = 'barq.lang';

const DICT = {
  ar: {
    'brand.name': 'برق',
    'brand.tagline': 'إلكترونيات ليبيا',
    'brand.full': 'برق للإلكترونيات',

    'nav.home': 'الرئيسية',
    'nav.shop': 'المتجر',
    'nav.deals': 'العروض',
    'nav.about': 'من نحن',
    'nav.contact': 'اتصل بنا',
    'nav.menu': 'القائمة',
    'nav.close': 'إغلاق',
    'nav.skip': 'تخطَّ إلى المحتوى',

    'announce.text': 'شحن مجاني لكل الطلبات فوق 1500 د.ل — إلى 22 مدينة ليبية',
    'announce.cta': 'تسوّق الآن',

    'search.label': 'ابحث عن منتج',
    'search.placeholder': 'ابحث عن هاتف، لابتوب، مكيف…',
    'search.empty': 'لا توجد نتائج مطابقة',
    'search.viewAll': 'عرض كل النتائج',

    'a11y.cart': 'سلة التسوق',
    'a11y.wishlist': 'المفضلة',
    'a11y.compare': 'المقارنة',
    'a11y.theme': 'تبديل المظهر',
    'a11y.lang': 'تغيير اللغة',
    'a11y.prev': 'السابق',
    'a11y.next': 'التالي',

    'hero.eyebrow': 'إلكترونيات أصلية بضمان محلي',
    'hero.title.a': 'أحدث الأجهزة،',
    'hero.title.b': 'توصيل لكل ليبيا',
    'hero.lede': 'من طرابلس إلى الكفرة. ادفع عند الاستلام بعد ما تفحص الجهاز بنفسك، وضمان محلي من 12 إلى 60 شهراً في معارضنا.',
    'hero.cta.primary': 'تصفّح المتجر',
    'hero.cta.secondary': 'شاهد العروض',
    'hero.reassure.1': 'فحص قبل الدفع',
    'hero.reassure.2': 'ضمان محلي داخل ليبيا',
    'hero.reassure.3': 'إرجاع خلال 14 يوم',
    'hero.stat.1': 'مدينة نوصل إليها',
    'hero.stat.2': 'عميل خلال 2025',
    'hero.stat.3': 'تقييم العملاء',

    'trust.1.t': 'ادفع عند الاستلام',
    'trust.1.d': 'افحص الجهاز قدام المندوب قبل ما تدفع دينار واحد.',
    'trust.2.t': 'ضمان محلي حقيقي',
    'trust.2.d': 'صيانة في طرابلس وبنغازي ومصراتة — بدون شحن للخارج.',
    'trust.3.t': 'شحن مجاني فوق 1500',
    'trust.3.d': 'إلى 22 مدينة، مع تتبع للشحنة على واتساب.',
    'trust.4.t': 'إرجاع خلال 14 يوم',
    'trust.4.d': 'ما عجبك؟ رجّعه بحالته الأصلية واسترد كامل المبلغ.',

    'sec.categories.title': 'تسوّق حسب الفئة',
    'sec.categories.lede': 'ست فئات، أكثر من 30 منتجاً مختاراً بعناية.',
    'sec.featured.title': 'الأكثر مبيعاً هذا الشهر',
    'sec.featured.lede': 'الأجهزة التي يشتريها الليبيون أكثر من غيرها.',
    'sec.deals.title': 'عرض محدود',
    'sec.deals.lede': 'ينتهي العرض بعد:',
    'sec.new.title': 'وصل حديثاً',
    'sec.new.lede': 'أحدث ما استوردناه هذا الموسم.',
    'sec.why.title': 'لماذا برق؟',
    'sec.testimonials.title': 'ماذا يقول عملاؤنا',
    'sec.testimonials.lede': 'تقييمات حقيقية من مشترين في مدن مختلفة.',
    'sec.faq.title': 'أسئلة يسألها الجميع',
    'sec.faq.lede': 'كل ما تحتاج معرفته قبل الطلب.',
    'sec.viewAll': 'عرض الكل',

    'cd.days': 'يوم',
    'cd.hours': 'ساعة',
    'cd.mins': 'دقيقة',
    'cd.secs': 'ثانية',

    'cta.title': 'وصلك خبر العروض قبل الكل',
    'cta.lede': 'اشترك واحصل على خصم 5% على طلبك الأول، وتنبيه أول ما تنزل شحنة جديدة.',
    'cta.email': 'البريد الإلكتروني',
    'cta.emailPlaceholder': 'name@example.com',
    'cta.submit': 'اشترك',
    'cta.note': 'لا رسائل مزعجة. إلغاء الاشتراك في أي وقت.',
    'cta.success': 'تم الاشتراك! كود الخصم AHLAN جاهز للاستخدام.',

    'product.addToCart': 'أضف إلى السلة',
    'product.added': 'أُضيف إلى السلة',
    'product.buyNow': 'اشترِ الآن',
    'product.outOfStock': 'غير متوفر',
    'product.notify': 'نبّهني عند التوفر',
    'product.inStock': 'متوفر',
    'product.lowStock': 'بقي {n} فقط',
    'product.reviews': '{n} تقييم',
    'product.save': 'وفّر {amount}',
    'product.addWishlist': 'أضف إلى المفضلة',
    'product.removeWishlist': 'إزالة من المفضلة',
    'product.addCompare': 'أضف للمقارنة',
    'product.sku': 'رقم المنتج',
    'product.warranty': 'ضمان {n} شهراً',
    'product.highlights': 'أبرز المزايا',
    'product.specs': 'المواصفات',
    'product.reviewsTab': 'التقييمات',
    'product.related': 'منتجات مشابهة',
    'product.recentlyViewed': 'شاهدت مؤخراً',
    'product.gallery': 'صور المنتج',
    'product.color': 'اللون',
    'product.viewImage': 'عرض الصورة {n}',
    'product.quantity': 'الكمية',
    'product.increase': 'زيادة الكمية',
    'product.decrease': 'إنقاص الكمية',
    'product.delivery.t': 'التوصيل إلى مدينتك',
    'product.delivery.d': 'اختر مدينتك لمعرفة الرسوم والمدة',
    'product.warranty.t': 'ضمان محلي {n} شهراً',
    'product.warranty.d': 'صيانة في معارضنا داخل ليبيا',
    'product.returns.t': 'إرجاع خلال 14 يوم',
    'product.returns.d': 'بالحالة الأصلية مع التغليف',
    'product.ratingOf': 'تقييم {rating} من 5',

    'badge.new': 'جديد',
    'badge.deal': 'عرض',
    'badge.bestseller': 'الأكثر مبيعاً',

    'shop.title': 'كل المنتجات',
    'shop.lede': 'فلتر حسب الفئة والماركة والسعر لتصل لما تحتاجه بسرعة.',
    'shop.filters': 'الفلاتر',
    'shop.showFilters': 'إظهار الفلاتر',
    'shop.clear': 'مسح الكل',
    'shop.clearOne': 'إزالة فلتر {name}',
    'shop.category': 'الفئة',
    'shop.brand': 'الماركة',
    'shop.price': 'السعر',
    'shop.availability': 'التوفر',
    'shop.inStockOnly': 'المتوفر فقط',
    'shop.onSaleOnly': 'العروض فقط',
    'shop.min': 'من',
    'shop.max': 'إلى',
    'shop.sort': 'ترتيب حسب',
    'shop.sort.relevance': 'الأكثر ملاءمة',
    'shop.sort.priceAsc': 'السعر: من الأقل',
    'shop.sort.priceDesc': 'السعر: من الأعلى',
    'shop.sort.rating': 'الأعلى تقييماً',
    'shop.sort.newest': 'الأحدث',
    'shop.results': '{n} منتج',
    'shop.noResults': 'لا توجد منتجات مطابقة',
    'shop.noResultsLede': 'جرّب توسيع نطاق السعر أو إزالة بعض الفلاتر.',
    'shop.resetFilters': 'إعادة ضبط الفلاتر',
    'shop.loadMore': 'عرض المزيد ({n} متبقي)',

    'cart.title': 'سلة التسوق',
    'cart.empty': 'سلتك فارغة',
    'cart.emptyLede': 'أضف منتجاً وابدأ التسوّق — الشحن مجاني فوق 1500 د.ل.',
    'cart.continue': 'تابع التسوق',
    'cart.remove': 'إزالة',
    'cart.removed': 'أُزيل من السلة',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.shipping': 'الشحن',
    'cart.shippingFree': 'مجاني',
    'cart.shippingCalc': 'يُحسب عند اختيار المدينة',
    'cart.discount': 'الخصم',
    'cart.total': 'الإجمالي',
    'cart.checkout': 'إتمام الطلب',
    'cart.promo': 'كود الخصم',
    'cart.promoPlaceholder': 'أدخل الكود',
    'cart.apply': 'تطبيق',
    'cart.promoOk': 'تم تطبيق الكود {code}',
    'cart.promoBad': 'الكود غير صالح',
    'cart.promoMin': 'الكود يتطلب حداً أدنى {amount}',
    'cart.freeShipHint': 'أضف {amount} للحصول على شحن مجاني',
    'cart.freeShipDone': 'حصلت على شحن مجاني',
    'cart.items': 'المنتجات',
    'cart.qtyFor': 'كمية {name}',

    'checkout.title': 'إتمام الطلب',
    'checkout.step1': 'التوصيل',
    'checkout.step2': 'الدفع',
    'checkout.step3': 'المراجعة',
    'checkout.back': 'رجوع',
    'checkout.next': 'التالي',
    'checkout.delivery': 'بيانات التوصيل',
    'checkout.payment': 'طريقة الدفع',
    'checkout.review': 'مراجعة الطلب',
    'checkout.firstName': 'الاسم الأول',
    'checkout.lastName': 'اسم العائلة',
    'checkout.phone': 'رقم الهاتف',
    'checkout.phoneHint': 'مثال: 0912345678 — نستخدمه للتواصل بخصوص الشحنة فقط',
    'checkout.city': 'المدينة',
    'checkout.cityPlaceholder': 'اختر مدينتك',
    'checkout.address': 'العنوان التفصيلي',
    'checkout.addressHint': 'الحي، أقرب معلم، رقم المبنى',
    'checkout.notes': 'ملاحظات للمندوب (اختياري)',
    'checkout.place': 'تأكيد الطلب',
    'checkout.placing': 'جارٍ التأكيد…',
    'checkout.prepayNote': 'خصم 3% مطبّق للدفع المسبق',
    'checkout.editCart': 'تعديل السلة',
    'checkout.deliverTo': 'التوصيل إلى',
    'checkout.payWith': 'الدفع بواسطة',
    'checkout.eta': 'مدة التوصيل المتوقعة: {days}',
    'checkout.terms': 'بتأكيد الطلب أنت توافق على شروط البيع وسياسة الإرجاع.',
    'checkout.done.title': 'تم استلام طلبك',
    'checkout.done.lede': 'سنتصل بك خلال ساعتي عمل لتأكيد التفاصيل. رقم طلبك:',
    'checkout.done.demo': 'هذا متجر تجريبي — لم تتم أي عملية دفع حقيقية ولم يُرسل أي طلب.',
    'checkout.done.home': 'العودة للرئيسية',
    'checkout.done.shop': 'تسوّق المزيد',
    'checkout.emptyCart': 'سلتك فارغة — أضف منتجاً أولاً.',

    'form.required': 'هذا الحقل مطلوب',
    'form.phoneInvalid': 'أدخل رقم هاتف ليبي صحيح (09xxxxxxxx)',
    'form.emailInvalid': 'أدخل بريداً إلكترونياً صحيحاً',
    'form.nameShort': 'الاسم قصير جداً',
    'form.addressShort': 'اكتب عنواناً أوضح (10 أحرف على الأقل)',
    'form.fixErrors': 'راجع الحقول المظللة بالأحمر',

    'compare.title': 'مقارنة المنتجات',
    'compare.lede': 'قارن حتى 4 منتجات جنباً إلى جنب.',
    'compare.empty': 'لم تضف أي منتج للمقارنة',
    'compare.emptyLede': 'اضغط على أيقونة المقارنة في أي منتج لإضافته هنا.',
    'compare.browse': 'تصفّح المنتجات',
    'compare.remove': 'إزالة من المقارنة',
    'compare.clear': 'مسح المقارنة',
    'compare.full': 'يمكنك مقارنة 4 منتجات كحد أقصى',
    'compare.added': 'أُضيف للمقارنة',
    'compare.best': 'الأفضل',

    'about.title': 'من نحن',
    'about.lede': 'بدأنا بمحل صغير في قرقارش، وصرنا نوصل لـ22 مدينة ليبية.',
    'about.story.title': 'قصتنا',
    'about.story.p1': 'انطلقت برق سنة 2019 من معرض واحد في طريق قرقارش بطرابلس. كانت المشكلة واضحة: الليبي اللي يبغي يشتري جهاز إلكتروني إما يسافر، أو يشتري من صفحة على فيسبوك بدون ضمان ولا فاتورة ولا حق إرجاع.',
    'about.story.p2': 'قررنا نبني البديل. استوردنا عبر قنوات رسمية فقط، وأصدرنا فاتورة لكل جهاز، وفتحنا مراكز صيانة خاصة بنا حتى يكون الضمان قابلاً للتنفيذ فعلاً داخل ليبيا — لا وعداً على ورقة.',
    'about.story.p3': 'اليوم نغطي 22 مدينة من طرابلس إلى الكفرة، ولدينا ثلاثة معارض ومركز توزيع واحد، وأكثر من 12 ألف طلب سُلّم خلال 2025 وحده.',
    'about.values.title': 'ما نلتزم به',
    'about.v1.t': 'شفافية في السعر',
    'about.v1.d': 'السعر المعروض هو السعر النهائي. لا رسوم مخفية تظهر عند الدفع.',
    'about.v2.t': 'ضمان قابل للتنفيذ',
    'about.v2.d': 'مراكز صيانتنا داخل ليبيا. لا نطلب منك شحن جهازك للخارج.',
    'about.v3.t': 'منتجات أصلية فقط',
    'about.v3.d': 'استيراد رسمي، رقم تسلسلي مطابق، وفاتورة باسمك مع كل طلب.',
    'about.v4.t': 'خدمة بلغتك',
    'about.v4.d': 'فريق يرد بالعربية على واتساب خلال دقائق، لا روبوتات.',
    'about.timeline.title': 'محطات',
    'about.tl.2019': 'افتتاح أول معرض في طريق قرقارش بطرابلس.',
    'about.tl.2021': 'إطلاق التوصيل إلى بنغازي ومصراتة وافتتاح مركز صيانة ثانٍ.',
    'about.tl.2023': 'تغطية الجنوب الليبي — سبها وأوباري ومرزق والكفرة.',
    'about.tl.2026': 'إطلاق المتجر الإلكتروني وتغطية 22 مدينة.',
    'about.stores.title': 'معارضنا',
    'about.cta.title': 'عندك سؤال قبل ما تطلب؟',
    'about.cta.lede': 'فريقنا يرد على واتساب خلال دقائق خلال ساعات العمل.',

    'contact.title': 'اتصل بنا',
    'contact.lede': 'سؤال عن منتج، أو طلب قائم، أو صيانة — اختر الطريقة الأسرع لك.',
    'contact.form.title': 'أرسل لنا رسالة',
    'contact.name': 'الاسم الكامل',
    'contact.email': 'البريد الإلكتروني',
    'contact.subject': 'الموضوع',
    'contact.subject.sales': 'استفسار عن منتج',
    'contact.subject.order': 'طلب قائم',
    'contact.subject.support': 'صيانة وضمان',
    'contact.subject.other': 'موضوع آخر',
    'contact.message': 'رسالتك',
    'contact.send': 'إرسال الرسالة',
    'contact.sent': 'وصلتنا رسالتك. سنرد خلال ساعات العمل.',
    'contact.sentDemo': 'هذا نموذج تجريبي — لم تُرسل الرسالة فعلياً.',
    'contact.whatsapp': 'راسلنا على واتساب',
    'contact.call': 'اتصل بنا',
    'contact.hours': 'ساعات العمل',
    'contact.stores': 'زُر أحد معارضنا',
    'contact.track.title': 'تتبع طلبك',
    'contact.track.lede': 'أدخل رقم الطلب الذي وصلك في الرسالة النصية.',
    'contact.track.placeholder': 'BRQ-XXXXXX',
    'contact.track.btn': 'تتبع',
    'contact.track.found': 'الطلب {ref}: قيد التجهيز في مستودع طرابلس. التسليم المتوقع خلال {days}.',
    'contact.track.notFound': 'لم نجد طلباً بهذا الرقم. تأكد من الرقم أو راسلنا على واتساب.',
    'contact.map': 'خريطة الموقع',
    'contact.mapNote': 'معرض طرابلس — طريق قرقارش',

    'footer.about': 'برق للإلكترونيات — متجر ليبي لبيع الأجهزة الأصلية بضمان محلي وتوصيل لكل المدن.',
    'footer.shop': 'تسوّق',
    'footer.help': 'المساعدة',
    'footer.company': 'الشركة',
    'footer.rights': '© {year} برق للإلكترونيات. جميع الحقوق محفوظة.',
    'footer.demo': 'موقع تجريبي — المنتجات والأسعار والعلامات التجارية خيالية لأغراض العرض.',
    'footer.payments': 'طرق الدفع',
    'footer.returns': 'سياسة الإرجاع',
    'footer.warranty': 'الضمان',
    'footer.shipping': 'الشحن والتوصيل',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.track': 'تتبع طلبك',

    'nf.title': 'الصفحة غير موجودة',
    'nf.lede': 'الرابط الذي فتحته غير صحيح أو تم نقل الصفحة.',
    'nf.home': 'العودة للرئيسية',
    'nf.shop': 'تصفّح المتجر',

    'theme.dark': 'داكن',
    'theme.light': 'فاتح',
  },

  en: {
    'brand.name': 'Barq',
    'brand.tagline': 'Electronics Libya',
    'brand.full': 'Barq Electronics',

    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.deals': 'Deals',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'nav.close': 'Close',
    'nav.skip': 'Skip to content',

    'announce.text': 'Free delivery on orders over 1,500 LYD — to 22 Libyan cities',
    'announce.cta': 'Shop now',

    'search.label': 'Search products',
    'search.placeholder': 'Search phones, laptops, air conditioners…',
    'search.empty': 'No matching results',
    'search.viewAll': 'View all results',

    'a11y.cart': 'Shopping cart',
    'a11y.wishlist': 'Wishlist',
    'a11y.compare': 'Compare',
    'a11y.theme': 'Toggle theme',
    'a11y.lang': 'Change language',
    'a11y.prev': 'Previous',
    'a11y.next': 'Next',

    'hero.eyebrow': 'Genuine electronics, local warranty',
    'hero.title.a': 'The latest devices,',
    'hero.title.b': 'delivered across Libya',
    'hero.lede': 'From Tripoli to Kufra. Pay on delivery after you have checked the device yourself, backed by a 12 to 60 month warranty serviced in our own stores.',
    'hero.cta.primary': 'Browse the shop',
    'hero.cta.secondary': 'See the deals',
    'hero.reassure.1': 'Inspect before you pay',
    'hero.reassure.2': 'Warranty serviced in Libya',
    'hero.reassure.3': '14-day returns',
    'hero.stat.1': 'cities covered',
    'hero.stat.2': 'customers in 2025',
    'hero.stat.3': 'average rating',

    'trust.1.t': 'Pay on delivery',
    'trust.1.d': 'Open the box in front of the courier before a single dinar changes hands.',
    'trust.2.t': 'A warranty that works',
    'trust.2.d': 'Serviced in Tripoli, Benghazi and Misrata — nothing ships abroad.',
    'trust.3.t': 'Free over 1,500 LYD',
    'trust.3.d': '22 cities, with shipment tracking over WhatsApp.',
    'trust.4.t': '14-day returns',
    'trust.4.d': 'Changed your mind? Send it back as it came and get every dinar back.',

    'sec.categories.title': 'Shop by category',
    'sec.categories.lede': 'Six categories, more than 30 carefully chosen products.',
    'sec.featured.title': 'Best sellers this month',
    'sec.featured.lede': 'The devices Libyan shoppers buy more than any others.',
    'sec.deals.title': 'Limited offer',
    'sec.deals.lede': 'Offer ends in:',
    'sec.new.title': 'Just landed',
    'sec.new.lede': 'The newest stock from this season.',
    'sec.why.title': 'Why Barq?',
    'sec.testimonials.title': 'What our customers say',
    'sec.testimonials.lede': 'Real reviews from buyers across different cities.',
    'sec.faq.title': 'Questions everyone asks',
    'sec.faq.lede': 'Everything worth knowing before you order.',
    'sec.viewAll': 'View all',

    'cd.days': 'days',
    'cd.hours': 'hours',
    'cd.mins': 'mins',
    'cd.secs': 'secs',

    'cta.title': 'Hear about the deals first',
    'cta.lede': 'Subscribe for 5% off your first order, and a heads-up the moment new stock lands.',
    'cta.email': 'Email address',
    'cta.emailPlaceholder': 'name@example.com',
    'cta.submit': 'Subscribe',
    'cta.note': 'No spam. Unsubscribe whenever you like.',
    'cta.success': 'Subscribed! Discount code AHLAN is ready to use.',

    'product.addToCart': 'Add to cart',
    'product.added': 'Added to cart',
    'product.buyNow': 'Buy now',
    'product.outOfStock': 'Out of stock',
    'product.notify': 'Notify me',
    'product.inStock': 'In stock',
    'product.lowStock': 'Only {n} left',
    'product.reviews': '{n} reviews',
    'product.save': 'Save {amount}',
    'product.addWishlist': 'Add to wishlist',
    'product.removeWishlist': 'Remove from wishlist',
    'product.addCompare': 'Add to compare',
    'product.sku': 'SKU',
    'product.warranty': '{n}-month warranty',
    'product.highlights': 'Highlights',
    'product.specs': 'Specifications',
    'product.reviewsTab': 'Reviews',
    'product.related': 'You may also like',
    'product.recentlyViewed': 'Recently viewed',
    'product.gallery': 'Product images',
    'product.color': 'Colour',
    'product.viewImage': 'View image {n}',
    'product.quantity': 'Quantity',
    'product.increase': 'Increase quantity',
    'product.decrease': 'Decrease quantity',
    'product.delivery.t': 'Delivery to your city',
    'product.delivery.d': 'Pick your city to see the fee and timing',
    'product.warranty.t': '{n}-month local warranty',
    'product.warranty.d': 'Serviced in our own stores inside Libya',
    'product.returns.t': '14-day returns',
    'product.returns.d': 'Original condition, with packaging',
    'product.ratingOf': 'Rated {rating} out of 5',

    'badge.new': 'New',
    'badge.deal': 'Deal',
    'badge.bestseller': 'Best seller',

    'shop.title': 'All products',
    'shop.lede': 'Filter by category, brand and price to get to what you need fast.',
    'shop.filters': 'Filters',
    'shop.showFilters': 'Show filters',
    'shop.clear': 'Clear all',
    'shop.clearOne': 'Remove {name} filter',
    'shop.category': 'Category',
    'shop.brand': 'Brand',
    'shop.price': 'Price',
    'shop.availability': 'Availability',
    'shop.inStockOnly': 'In stock only',
    'shop.onSaleOnly': 'On sale only',
    'shop.min': 'Min',
    'shop.max': 'Max',
    'shop.sort': 'Sort by',
    'shop.sort.relevance': 'Most relevant',
    'shop.sort.priceAsc': 'Price: low to high',
    'shop.sort.priceDesc': 'Price: high to low',
    'shop.sort.rating': 'Top rated',
    'shop.sort.newest': 'Newest',
    'shop.results': '{n} products',
    'shop.noResults': 'No products match',
    'shop.noResultsLede': 'Try widening the price range or removing a filter.',
    'shop.resetFilters': 'Reset filters',
    'shop.loadMore': 'Show more ({n} remaining)',

    'cart.title': 'Shopping cart',
    'cart.empty': 'Your cart is empty',
    'cart.emptyLede': 'Add something and get started — delivery is free over 1,500 LYD.',
    'cart.continue': 'Continue shopping',
    'cart.remove': 'Remove',
    'cart.removed': 'Removed from cart',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Delivery',
    'cart.shippingFree': 'Free',
    'cart.shippingCalc': 'Calculated once you pick a city',
    'cart.discount': 'Discount',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.promo': 'Promo code',
    'cart.promoPlaceholder': 'Enter code',
    'cart.apply': 'Apply',
    'cart.promoOk': 'Code {code} applied',
    'cart.promoBad': 'That code is not valid',
    'cart.promoMin': 'This code needs a minimum of {amount}',
    'cart.freeShipHint': 'Add {amount} for free delivery',
    'cart.freeShipDone': 'You have free delivery',
    'cart.items': 'Items',
    'cart.qtyFor': 'Quantity for {name}',

    'checkout.title': 'Checkout',
    'checkout.step1': 'Delivery',
    'checkout.step2': 'Payment',
    'checkout.step3': 'Review',
    'checkout.back': 'Back',
    'checkout.next': 'Continue',
    'checkout.delivery': 'Delivery details',
    'checkout.payment': 'Payment method',
    'checkout.review': 'Review your order',
    'checkout.firstName': 'First name',
    'checkout.lastName': 'Last name',
    'checkout.phone': 'Phone number',
    'checkout.phoneHint': 'e.g. 0912345678 — used only to reach you about this delivery',
    'checkout.city': 'City',
    'checkout.cityPlaceholder': 'Choose your city',
    'checkout.address': 'Full address',
    'checkout.addressHint': 'District, nearest landmark, building number',
    'checkout.notes': 'Notes for the courier (optional)',
    'checkout.place': 'Confirm order',
    'checkout.placing': 'Confirming…',
    'checkout.prepayNote': '3% prepayment discount applied',
    'checkout.editCart': 'Edit cart',
    'checkout.deliverTo': 'Deliver to',
    'checkout.payWith': 'Pay with',
    'checkout.eta': 'Estimated delivery: {days}',
    'checkout.terms': 'By confirming you agree to the terms of sale and the returns policy.',
    'checkout.done.title': 'Order received',
    'checkout.done.lede': 'We will call you within two working hours to confirm. Your order number:',
    'checkout.done.demo': 'This is a demo store — no payment was taken and no order was sent.',
    'checkout.done.home': 'Back to home',
    'checkout.done.shop': 'Keep shopping',
    'checkout.emptyCart': 'Your cart is empty — add something first.',

    'form.required': 'This field is required',
    'form.phoneInvalid': 'Enter a valid Libyan number (09xxxxxxxx)',
    'form.emailInvalid': 'Enter a valid email address',
    'form.nameShort': 'That name is too short',
    'form.addressShort': 'Give a clearer address (at least 10 characters)',
    'form.fixErrors': 'Please check the fields marked in red',

    'compare.title': 'Compare products',
    'compare.lede': 'Put up to 4 products side by side.',
    'compare.empty': 'Nothing to compare yet',
    'compare.emptyLede': 'Tap the compare icon on any product to add it here.',
    'compare.browse': 'Browse products',
    'compare.remove': 'Remove from compare',
    'compare.clear': 'Clear compare',
    'compare.full': 'You can compare 4 products at most',
    'compare.added': 'Added to compare',
    'compare.best': 'Best',

    'about.title': 'About us',
    'about.lede': 'We started as one shop in Gargaresh. We now deliver to 22 Libyan cities.',
    'about.story.title': 'Our story',
    'about.story.p1': 'Barq opened in 2019 with a single showroom on Gargaresh Road in Tripoli. The problem was plain: a Libyan who wanted a decent device either travelled abroad, or bought from a Facebook page with no warranty, no invoice and no way to return it.',
    'about.story.p2': 'So we built the alternative. We import only through official channels, issue an invoice for every device, and run our own service centres so the warranty is something you can actually use inside Libya — not a promise on paper.',
    'about.story.p3': 'Today we cover 22 cities from Tripoli to Kufra, with three showrooms, one distribution centre, and more than 12,000 orders delivered in 2025 alone.',
    'about.values.title': 'What we hold to',
    'about.v1.t': 'Honest pricing',
    'about.v1.d': 'The price shown is the price paid. No fees appearing at checkout.',
    'about.v2.t': 'A usable warranty',
    'about.v2.d': 'Our service centres are in Libya. We never ask you to ship a device abroad.',
    'about.v3.t': 'Genuine stock only',
    'about.v3.d': 'Official import, matching serial number, and an invoice in your name.',
    'about.v4.t': 'Service in your language',
    'about.v4.d': 'A team answering in Arabic on WhatsApp within minutes. No bots.',
    'about.timeline.title': 'Milestones',
    'about.tl.2019': 'First showroom opens on Gargaresh Road, Tripoli.',
    'about.tl.2021': 'Delivery launches to Benghazi and Misrata; second service centre opens.',
    'about.tl.2023': 'Coverage reaches the Libyan south — Sebha, Ubari, Murzuq and Kufra.',
    'about.tl.2026': 'The online store launches, covering 22 cities.',
    'about.stores.title': 'Our showrooms',
    'about.cta.title': 'Question before you order?',
    'about.cta.lede': 'Our team replies on WhatsApp within minutes during working hours.',

    'contact.title': 'Contact us',
    'contact.lede': 'A question about a product, an order in flight, or a repair — pick whichever is fastest for you.',
    'contact.form.title': 'Send us a message',
    'contact.name': 'Full name',
    'contact.email': 'Email address',
    'contact.subject': 'Subject',
    'contact.subject.sales': 'Product question',
    'contact.subject.order': 'Existing order',
    'contact.subject.support': 'Service and warranty',
    'contact.subject.other': 'Something else',
    'contact.message': 'Your message',
    'contact.send': 'Send message',
    'contact.sent': 'Message received. We will reply during working hours.',
    'contact.sentDemo': 'This is a demo form — nothing was actually sent.',
    'contact.whatsapp': 'Message us on WhatsApp',
    'contact.call': 'Call us',
    'contact.hours': 'Opening hours',
    'contact.stores': 'Visit a showroom',
    'contact.track.title': 'Track your order',
    'contact.track.lede': 'Enter the order number from your confirmation SMS.',
    'contact.track.placeholder': 'BRQ-XXXXXX',
    'contact.track.btn': 'Track',
    'contact.track.found': 'Order {ref}: being prepared at the Tripoli warehouse. Expected delivery within {days}.',
    'contact.track.notFound': 'No order found with that number. Check it, or message us on WhatsApp.',
    'contact.map': 'Store location',
    'contact.mapNote': 'Tripoli showroom — Gargaresh Road',

    'footer.about': 'Barq Electronics — a Libyan store selling genuine devices with a local warranty and delivery to every city.',
    'footer.shop': 'Shop',
    'footer.help': 'Help',
    'footer.company': 'Company',
    'footer.rights': '© {year} Barq Electronics. All rights reserved.',
    'footer.demo': 'Demo site — products, prices and brands are fictional and for demonstration only.',
    'footer.payments': 'Payment methods',
    'footer.returns': 'Returns policy',
    'footer.warranty': 'Warranty',
    'footer.shipping': 'Shipping & delivery',
    'footer.faq': 'FAQ',
    'footer.track': 'Track your order',

    'nf.title': 'Page not found',
    'nf.lede': 'That link is wrong, or the page has moved.',
    'nf.home': 'Back to home',
    'nf.shop': 'Browse the shop',

    'theme.dark': 'Dark',
    'theme.light': 'Light',
  },
};

let current = DEFAULT_LANG;

export function getLang() { return current; }

export function readStoredLang() {
  /* An explicit ?lang= wins — those are the URLs the hreflang tags advertise. */
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
  } catch { /* no URL access in some embedded contexts */ }
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(v)) return v;
  } catch { /* private mode or blocked storage — fall through to the default */ }
  return DEFAULT_LANG;
}

export function setLang(lang, { persist = true } = {}) {
  current = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const html = document.documentElement;
  html.lang = current;
  html.dir = current === 'ar' ? 'rtl' : 'ltr';
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, current); } catch { /* non-fatal */ }
  }
  return current;
}

/** Translate a key. `vars` fills {placeholders}. Falls back to English, then the key. */
export function t(key, vars) {
  let s = DICT[current]?.[key] ?? DICT.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Pick the right side of an { ar, en } pair, or pass a plain string through. */
export const pick = (value) => (value == null ? '' : typeof value === 'string' ? value : value[current] ?? value.en ?? '');

/* Latin digits with thousands separators in both languages — a Libyan price
   tag reads "8,450 د.ل", not "٨٬٤٥٠". */
const nf = new Intl.NumberFormat('en-LY', { maximumFractionDigits: 0 });
export const formatNumber = (n) => nf.format(Math.round(n));
export const formatPrice = (n) => `${nf.format(Math.round(n))} ${current === 'ar' ? 'د.ل' : 'LYD'}`;

/**
 * Apply translations to a DOM subtree.
 *  data-i18n="key"            → textContent
 *  data-i18n-attr="attr:key"  → attribute (comma-separate for several)
 *  data-i18n-vars='{"n":3}'   → placeholder values
 */
export function applyTranslations(root = document) {
  /* Always available to any string, so the footer copyright never goes stale. */
  const defaults = { year: new Date().getFullYear() };
  for (const el of root.querySelectorAll('[data-i18n]')) {
    let vars = defaults;
    if (el.dataset.i18nVars) {
      try { vars = { ...defaults, ...JSON.parse(el.dataset.i18nVars) }; } catch { /* ignore bad JSON */ }
    }
    el.textContent = t(el.dataset.i18n, vars);
  }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pairStr of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pairStr.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}

/**
 * Swap bilingual static markup. Build-time content (FAQ, testimonials, store
 * details) ships as real HTML in Arabic for crawlers, carrying both languages
 * in data-ar / data-en so switching needs no re-fetch.
 */
export function applyBilingual(root = document) {
  for (const el of root.querySelectorAll('[data-ar][data-en]')) {
    el.textContent = current === 'ar' ? el.dataset.ar : el.dataset.en;
  }
  for (const el of root.querySelectorAll('[data-bi-attr]')) {
    for (const spec of el.dataset.biAttr.split(',')) {
      const [attr, arVal, enVal] = spec.split('|');
      if (attr) el.setAttribute(attr.trim(), current === 'ar' ? arVal : enVal);
    }
  }
}

/** Keys present in one language but not the other — surfaced by tools/validate-i18n.mjs. */
export function missingKeys() {
  const ar = Object.keys(DICT.ar), en = Object.keys(DICT.en);
  return {
    missingInAr: en.filter((k) => !DICT.ar[k]),
    missingInEn: ar.filter((k) => !DICT.en[k]),
    total: en.length,
  };
}
