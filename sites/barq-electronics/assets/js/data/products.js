/* ==========================================================================
   Barq — Product catalogue
   Brands are deliberately fictional: a demo storefront that borrows real
   trademarks is a legal problem waiting to happen, and invented brands let the
   spec sheets stay internally consistent.
   Prices are Libyan Dinar (LYD) and reflect realistic Libyan retail for
   imported electronics.
   A spec/label value is either a plain string (identical in both languages,
   e.g. "256 GB") or an { ar, en } pair.
   ========================================================================== */

export const CATEGORIES = [
  { id: 'phones',      img: 'phone-onyx',  name: { ar: 'هواتف ذكية',    en: 'Smartphones' } },
  { id: 'computers',   img: 'laptop-pro',  name: { ar: 'حواسيب وأجهزة لوحية', en: 'Computers & Tablets' } },
  { id: 'tv-audio',    img: 'tv-oled',     name: { ar: 'تلفزيونات وصوتيات', en: 'TV & Audio' } },
  { id: 'gaming',      img: 'console',     name: { ar: 'ألعاب',          en: 'Gaming' } },
  { id: 'home',        img: 'fridge',      name: { ar: 'أجهزة منزلية',   en: 'Home Appliances' } },
  { id: 'accessories', img: 'powerbank',   name: { ar: 'ملحقات',         en: 'Accessories' } },
];

export const BRANDS = ['Nova', 'Orbix', 'Lumio', 'Volt', 'Kova', 'Zenith', 'Aeris', 'Nimbus', 'Helio', 'Qamar'];

const C = {
  onyx:   { key: 'onyx',   hex: '#22293a', name: { ar: 'أسود عقيق',  en: 'Onyx' } },
  silver: { key: 'silver', hex: '#b9c3d1', name: { ar: 'فضي',        en: 'Silver' } },
  blue:   { key: 'blue',   hex: '#2b5fa8', name: { ar: 'أزرق ليلي',  en: 'Midnight Blue' } },
  sand:   { key: 'sand',   hex: '#c2a57e', name: { ar: 'رملي',       en: 'Desert Sand' } },
  ivory:  { key: 'ivory',  hex: '#e4e9f0', name: { ar: 'عاجي',       en: 'Ivory' } },
  gold:   { key: 'gold',   hex: '#d8b77a', name: { ar: 'ذهبي',       en: 'Gold' } },
};

export const PRODUCTS = [
  /* ───────────── Phones ───────────── */
  {
    id: 'nova-x9-pro', sku: 'BRQ-PH-NX9', cat: 'phones', brand: 'Nova',
    name: { ar: 'نوفا X9 برو', en: 'Nova X9 Pro' },
    price: 8450, oldPrice: 9600, rating: 4.8, reviews: 214, stock: 12,
    img: 'phone-onyx', badges: ['bestseller'], featured: true, warranty: 24, year: 2026,
    colors: [{ ...C.onyx, img: 'phone-onyx' }, { ...C.silver, img: 'phone-silver' }, { ...C.blue, img: 'phone-blue' }],
    options: { label: { ar: 'السعة', en: 'Storage' }, values: [
      { key: '256', label: '256 GB', delta: 0 },
      { key: '512', label: '512 GB', delta: 900 },
      { key: '1tb', label: '1 TB', delta: 2100 },
    ] },
    highlights: {
      ar: ['شاشة AMOLED مقاس 6.8" بتردد 120Hz', 'كاميرا ثلاثية 200 ميجابكسل مع تثبيت بصري', 'شحن سريع 120 واط — 0 إلى 100% في 19 دقيقة', 'مقاومة الماء والغبار IP68'],
      en: ['6.8" AMOLED display at 120Hz', 'Triple 200MP camera with OIS', '120W fast charge — 0 to 100% in 19 minutes', 'IP68 water and dust resistance'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '6.8 بوصة AMOLED، 120Hz، 2600 شمعة', en: '6.8" AMOLED, 120Hz, 2600 nits' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Orbix A19 Bionic (3nm)'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '12 GB LPDDR5X'],
      [{ ar: 'الكاميرا', en: 'Camera' }, { ar: '200MP رئيسية + 50MP فائقة الاتساع + 12MP تقريب 5x', en: '200MP main + 50MP ultra-wide + 12MP 5x tele' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '5400 مللي أمبير، شحن 120 واط', en: '5400 mAh, 120W charging' }],
      [{ ar: 'الشبكة', en: 'Network' }, { ar: '5G / شريحتان', en: '5G / Dual SIM' }],
      [{ ar: 'نظام التشغيل', en: 'OS' }, 'NovaOS 15'],
    ],
  },
  {
    id: 'nova-x9', sku: 'BRQ-PH-NX9S', cat: 'phones', brand: 'Nova',
    name: { ar: 'نوفا X9', en: 'Nova X9' },
    price: 5900, oldPrice: null, rating: 4.6, reviews: 158, stock: 24,
    img: 'phone-blue', badges: [], featured: false, warranty: 24, year: 2026,
    colors: [{ ...C.blue, img: 'phone-blue' }, { ...C.onyx, img: 'phone-onyx' }],
    options: { label: { ar: 'السعة', en: 'Storage' }, values: [
      { key: '128', label: '128 GB', delta: 0 }, { key: '256', label: '256 GB', delta: 700 },
    ] },
    highlights: {
      ar: ['شاشة AMOLED مقاس 6.4" بتردد 120Hz', 'كاميرا مزدوجة 108 ميجابكسل', 'بطارية تدوم يومين كاملين', 'شحن سريع 67 واط'],
      en: ['6.4" AMOLED display at 120Hz', 'Dual 108MP camera', 'Two full days of battery', '67W fast charging'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '6.4 بوصة AMOLED، 120Hz', en: '6.4" AMOLED, 120Hz' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Orbix A17'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '8 GB'],
      [{ ar: 'الكاميرا', en: 'Camera' }, { ar: '108MP + 12MP فائقة الاتساع', en: '108MP + 12MP ultra-wide' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '5000 مللي أمبير، شحن 67 واط', en: '5000 mAh, 67W charging' }],
      [{ ar: 'الشبكة', en: 'Network' }, { ar: '5G / شريحتان', en: '5G / Dual SIM' }],
    ],
  },
  {
    id: 'qamar-lite-7', sku: 'BRQ-PH-QL7', cat: 'phones', brand: 'Qamar',
    name: { ar: 'قمر لايت 7', en: 'Qamar Lite 7' },
    price: 1890, oldPrice: 2300, rating: 4.4, reviews: 412, stock: 60,
    img: 'phone-compact', badges: ['deal'], featured: true, warranty: 12, year: 2025,
    colors: [{ ...C.onyx, img: 'phone-compact' }, { ...C.sand, img: 'phone-compact-sand' }],
    options: { label: { ar: 'السعة', en: 'Storage' }, values: [
      { key: '128', label: '128 GB', delta: 0 }, { key: '256', label: '256 GB', delta: 380 },
    ] },
    highlights: {
      ar: ['أفضل سعر في فئته', 'بطارية 6000 مللي أمبير', 'شاشة 6.5 بوصة بتردد 90Hz', 'منفذ سماعات 3.5 ملم'],
      en: ['Best value in its class', '6000 mAh battery', '6.5" display at 90Hz', '3.5mm headphone jack'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '6.5 بوصة IPS، 90Hz', en: '6.5" IPS, 90Hz' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Helio G99'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '6 GB'],
      [{ ar: 'الكاميرا', en: 'Camera' }, '50MP + 2MP'],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '6000 مللي أمبير، شحن 33 واط', en: '6000 mAh, 33W charging' }],
    ],
  },
  {
    id: 'orbix-edge-5', sku: 'BRQ-PH-OE5', cat: 'phones', brand: 'Orbix',
    name: { ar: 'أوربكس إيدج 5', en: 'Orbix Edge 5' },
    price: 3400, oldPrice: null, rating: 4.5, reviews: 96, stock: 3,
    img: 'phone-silver', badges: ['new'], featured: false, warranty: 18, year: 2026,
    colors: [{ ...C.silver, img: 'phone-silver' }, { ...C.blue, img: 'phone-blue' }],
    highlights: {
      ar: ['تصميم معدني بسماكة 7.2 ملم', 'شاشة منحنية 6.6 بوصة', 'شحن لاسلكي 30 واط'],
      en: ['7.2mm all-metal body', '6.6" curved display', '30W wireless charging'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '6.6 بوصة AMOLED منحنية', en: '6.6" curved AMOLED' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Orbix A15'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '8 GB'],
      [{ ar: 'الكاميرا', en: 'Camera' }, '64MP + 8MP'],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '4600 مللي أمبير', en: '4600 mAh' }],
    ],
  },

  /* ───────────── Computers ───────────── */
  {
    id: 'kova-studio-16', sku: 'BRQ-LP-KS16', cat: 'computers', brand: 'Kova',
    name: { ar: 'كوفا ستوديو 16', en: 'Kova Studio 16' },
    price: 14900, oldPrice: 16400, rating: 4.9, reviews: 87, stock: 6,
    img: 'laptop-pro', badges: ['bestseller'], featured: true, warranty: 24, year: 2026,
    colors: [{ ...C.onyx, img: 'laptop-pro' }, { ...C.silver, img: 'laptop-air' }],
    options: { label: { ar: 'الذاكرة والتخزين', en: 'Memory & Storage' }, values: [
      { key: '16-512', label: '16 GB / 512 GB', delta: 0 },
      { key: '32-1tb', label: '32 GB / 1 TB', delta: 3200 },
    ] },
    highlights: {
      ar: ['شاشة 16 بوصة Mini-LED بدقة 3K', 'معالج 12 نواة للتصميم والمونتاج', 'بطارية تدوم 18 ساعة', 'لوحة مفاتيح عربية وإنجليزية'],
      en: ['16" 3K Mini-LED display', '12-core processor built for design and editing', '18-hour battery life', 'Arabic + English keyboard'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '16 بوصة Mini-LED، 3K، 120Hz', en: '16" Mini-LED, 3K, 120Hz' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Kova M3 Pro (12 cores)'],
      [{ ar: 'كرت الشاشة', en: 'Graphics' }, { ar: 'مدمج 18 نواة', en: '18-core integrated' }],
      [{ ar: 'الذاكرة', en: 'RAM' }, '16 GB unified'],
      [{ ar: 'التخزين', en: 'Storage' }, '512 GB NVMe SSD'],
      [{ ar: 'المنافذ', en: 'Ports' }, { ar: '3× USB-C، HDMI، قارئ SD', en: '3× USB-C, HDMI, SD reader' }],
      [{ ar: 'الوزن', en: 'Weight' }, '1.9 kg'],
    ],
  },
  {
    id: 'kova-air-13', sku: 'BRQ-LP-KA13', cat: 'computers', brand: 'Kova',
    name: { ar: 'كوفا إير 13', en: 'Kova Air 13' },
    price: 7200, oldPrice: null, rating: 4.7, reviews: 143, stock: 15,
    img: 'laptop-air', badges: [], featured: true, warranty: 24, year: 2025,
    colors: [{ ...C.silver, img: 'laptop-air' }, { ...C.onyx, img: 'laptop-pro' }],
    highlights: {
      ar: ['وزن 1.1 كجم فقط', 'بدون مروحة — صامت تماماً', 'بطارية 20 ساعة'],
      en: ['Just 1.1 kg', 'Fanless — completely silent', '20-hour battery'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '13.4 بوصة IPS، 2.5K', en: '13.4" IPS, 2.5K' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Kova M3 (8 cores)'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '16 GB'],
      [{ ar: 'التخزين', en: 'Storage' }, '512 GB SSD'],
      [{ ar: 'الوزن', en: 'Weight' }, '1.1 kg'],
    ],
  },
  {
    id: 'lumio-tab-11', sku: 'BRQ-TB-L11', cat: 'computers', brand: 'Lumio',
    name: { ar: 'لوميو تاب 11', en: 'Lumio Tab 11' },
    price: 2900, oldPrice: 3350, rating: 4.5, reviews: 121, stock: 20,
    img: 'tablet', badges: ['deal'], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['شاشة 11 بوصة بتردد 120Hz', 'دعم القلم الرقمي', 'أربع سماعات ستيريو'],
      en: ['11" 120Hz display', 'Stylus support', 'Quad stereo speakers'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '11 بوصة IPS، 120Hz', en: '11" IPS, 120Hz' }],
      [{ ar: 'المعالج', en: 'Processor' }, 'Helio G99'],
      [{ ar: 'الذاكرة', en: 'RAM' }, '8 GB'],
      [{ ar: 'التخزين', en: 'Storage' }, '256 GB'],
      [{ ar: 'البطارية', en: 'Battery' }, '8000 mAh'],
    ],
  },
  {
    id: 'zenith-view-27', sku: 'BRQ-MN-Z27', cat: 'computers', brand: 'Zenith',
    name: { ar: 'زينيث فيو 27', en: 'Zenith View 27' },
    price: 2300, oldPrice: null, rating: 4.6, reviews: 74, stock: 11,
    img: 'monitor', badges: [], featured: false, warranty: 24, year: 2025,
    highlights: {
      ar: ['دقة 4K بحجم 27 بوصة', 'تغطية 99% من نطاق sRGB', 'منفذ USB-C بقدرة 90 واط'],
      en: ['27" 4K resolution', '99% sRGB coverage', '90W USB-C power delivery'],
    },
    specs: [
      [{ ar: 'الحجم', en: 'Size' }, '27"'],
      [{ ar: 'الدقة', en: 'Resolution' }, '3840 × 2160 (4K)'],
      [{ ar: 'التردد', en: 'Refresh rate' }, '60Hz'],
      [{ ar: 'المنافذ', en: 'Ports' }, 'USB-C 90W, 2× HDMI, DP'],
    ],
  },

  /* ───────────── TV & Audio ───────────── */
  {
    id: 'zenith-oled-55', sku: 'BRQ-TV-Z55', cat: 'tv-audio', brand: 'Zenith',
    name: { ar: 'زينيث OLED 55 بوصة', en: 'Zenith OLED 55"' },
    price: 8900, oldPrice: 10500, rating: 4.8, reviews: 63, stock: 5,
    img: 'tv-oled', badges: ['deal'], featured: true, warranty: 24, year: 2026,
    options: { label: { ar: 'الحجم', en: 'Size' }, values: [
      { key: '55', label: '55"', delta: 0 }, { key: '65', label: '65"', delta: 3400 },
    ] },
    highlights: {
      ar: ['شاشة OLED بدقة 4K وتردد 120Hz', 'دعم Dolby Vision و Atmos', 'تحكم صوتي بالعربية', 'تركيب مجاني داخل طرابلس وبنغازي'],
      en: ['4K OLED at 120Hz', 'Dolby Vision and Atmos', 'Arabic voice control', 'Free installation in Tripoli and Benghazi'],
    },
    specs: [
      [{ ar: 'نوع الشاشة', en: 'Panel' }, 'OLED evo'],
      [{ ar: 'الدقة', en: 'Resolution' }, '4K (3840 × 2160)'],
      [{ ar: 'التردد', en: 'Refresh rate' }, '120Hz'],
      [{ ar: 'الصوت', en: 'Audio' }, { ar: '40 واط، Dolby Atmos', en: '40W, Dolby Atmos' }],
      [{ ar: 'المنافذ', en: 'Ports' }, '4× HDMI 2.1, 2× USB'],
    ],
  },
  {
    id: 'zenith-qled-43', sku: 'BRQ-TV-Z43', cat: 'tv-audio', brand: 'Zenith',
    name: { ar: 'زينيث QLED 43 بوصة', en: 'Zenith QLED 43"' },
    price: 3200, oldPrice: null, rating: 4.4, reviews: 188, stock: 28,
    img: 'tv-qled', badges: [], featured: false, warranty: 24, year: 2025,
    highlights: {
      ar: ['ألوان QLED زاهية', 'نظام ذكي مع تطبيقات عربية', 'مثالي لغرف المعيشة المتوسطة'],
      en: ['Vivid QLED colour', 'Smart platform with Arabic apps', 'Ideal for mid-size living rooms'],
    },
    specs: [
      [{ ar: 'نوع الشاشة', en: 'Panel' }, 'QLED'],
      [{ ar: 'الدقة', en: 'Resolution' }, '4K'],
      [{ ar: 'التردد', en: 'Refresh rate' }, '60Hz'],
      [{ ar: 'الصوت', en: 'Audio' }, '20W'],
    ],
  },
  {
    id: 'aeris-studio-one', sku: 'BRQ-AU-AS1', cat: 'tv-audio', brand: 'Aeris',
    name: { ar: 'إيريس ستوديو ون', en: 'Aeris Studio One' },
    price: 1250, oldPrice: 1480, rating: 4.7, reviews: 302, stock: 33,
    img: 'headphones', badges: ['bestseller'], featured: true, warranty: 12, year: 2025,
    colors: [{ ...C.onyx, img: 'headphones' }, { ...C.ivory, img: 'headphones-ivory' }],
    highlights: {
      ar: ['عزل ضوضاء نشط من الفئة الأولى', 'بطارية 60 ساعة', 'اتصال بجهازين في نفس الوقت'],
      en: ['Class-leading active noise cancellation', '60-hour battery', 'Connect to two devices at once'],
    },
    specs: [
      [{ ar: 'النوع', en: 'Type' }, { ar: 'حول الأذن، لاسلكية', en: 'Over-ear, wireless' }],
      [{ ar: 'عزل الضوضاء', en: 'Noise cancelling' }, { ar: 'نشط هجين', en: 'Hybrid active' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '60 ساعة', en: '60 hours' }],
      [{ ar: 'الاتصال', en: 'Connectivity' }, 'Bluetooth 5.4, USB-C'],
    ],
  },
  {
    id: 'aeris-buds-pro', sku: 'BRQ-AU-ABP', cat: 'tv-audio', brand: 'Aeris',
    name: { ar: 'إيريس بودز برو', en: 'Aeris Buds Pro' },
    price: 890, oldPrice: null, rating: 4.5, reviews: 476, stock: 80,
    img: 'earbuds', badges: [], featured: true, warranty: 12, year: 2026,
    colors: [{ ...C.ivory, img: 'earbuds' }, { ...C.onyx, img: 'earbuds-black' }],
    highlights: {
      ar: ['عزل ضوضاء نشط', 'مقاومة العرق IPX5', 'شحن لاسلكي للعلبة'],
      en: ['Active noise cancellation', 'IPX5 sweat resistance', 'Wireless charging case'],
    },
    specs: [
      [{ ar: 'النوع', en: 'Type' }, { ar: 'داخل الأذن، لاسلكية', en: 'In-ear, true wireless' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '8 ساعات + 24 مع العلبة', en: '8 hours + 24 with case' }],
      [{ ar: 'المقاومة', en: 'Water resistance' }, 'IPX5'],
    ],
  },
  {
    id: 'aeris-bar-500', sku: 'BRQ-AU-AB5', cat: 'tv-audio', brand: 'Aeris',
    name: { ar: 'إيريس بار 500', en: 'Aeris Bar 500' },
    price: 1890, oldPrice: 2150, rating: 4.6, reviews: 91, stock: 14,
    img: 'soundbar', badges: ['deal'], featured: false, warranty: 18, year: 2025,
    highlights: {
      ar: ['صوت محيطي 5.1', 'مضخم صوت لاسلكي مرفق', 'وضع خاص للأفلام العربية والحوار'],
      en: ['5.1 surround sound', 'Wireless subwoofer included', 'Dedicated dialogue mode'],
    },
    specs: [
      [{ ar: 'القنوات', en: 'Channels' }, '5.1'],
      [{ ar: 'القدرة', en: 'Power' }, '480W'],
      [{ ar: 'الاتصال', en: 'Connectivity' }, 'HDMI eARC, Bluetooth, Optical'],
    ],
  },
  {
    id: 'aeris-orb', sku: 'BRQ-AU-AO', cat: 'tv-audio', brand: 'Aeris',
    name: { ar: 'إيريس أورب', en: 'Aeris Orb' },
    price: 690, oldPrice: null, rating: 4.3, reviews: 205, stock: 45,
    img: 'speaker', badges: [], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['صوت 360 درجة', 'مقاوم للماء IP67', 'بطارية 24 ساعة'],
      en: ['360° sound', 'IP67 waterproof', '24-hour battery'],
    },
    specs: [
      [{ ar: 'القدرة', en: 'Power' }, '30W'],
      [{ ar: 'المقاومة', en: 'Water resistance' }, 'IP67'],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '24 ساعة', en: '24 hours' }],
    ],
  },

  /* ───────────── Gaming ───────────── */
  {
    id: 'volt-station-x', sku: 'BRQ-GM-VSX', cat: 'gaming', brand: 'Volt',
    name: { ar: 'فولت ستيشن X', en: 'Volt Station X' },
    price: 3900, oldPrice: null, rating: 4.9, reviews: 156, stock: 4,
    img: 'console', badges: ['bestseller'], featured: true, warranty: 12, year: 2026,
    options: { label: { ar: 'النسخة', en: 'Edition' }, values: [
      { key: 'disc', label: { ar: 'مع قارئ أقراص', en: 'With disc drive' }, delta: 0 },
      { key: 'digital', label: { ar: 'رقمية', en: 'Digital' }, delta: -450 },
    ] },
    highlights: {
      ar: ['ألعاب 4K بمعدل 120 إطار', 'قرص SSD سريع بسعة 1 تيرابايت', 'يد تحكم لاسلكية مرفقة', 'متوافق مع الكهرباء الليبية 230 فولت'],
      en: ['4K gaming at 120fps', 'Fast 1 TB SSD', 'Wireless controller included', 'Works on Libyan 230V mains'],
    },
    specs: [
      [{ ar: 'المعالج', en: 'Processor' }, '8-core custom'],
      [{ ar: 'التخزين', en: 'Storage' }, '1 TB NVMe SSD'],
      [{ ar: 'الدقة', en: 'Resolution' }, { ar: 'حتى 4K بمعدل 120 إطار', en: 'Up to 4K at 120fps' }],
      [{ ar: 'المنافذ', en: 'Ports' }, 'HDMI 2.1, 3× USB'],
    ],
  },
  {
    id: 'volt-pad-pro', sku: 'BRQ-GM-VPP', cat: 'gaming', brand: 'Volt',
    name: { ar: 'يد تحكم فولت برو', en: 'Volt Pad Pro' },
    price: 420, oldPrice: 520, rating: 4.6, reviews: 288, stock: 52,
    img: 'gamepad', badges: ['deal'], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['أزرار خلفية قابلة للبرمجة', 'بطارية 40 ساعة', 'اهتزاز دقيق'],
      en: ['Programmable back paddles', '40-hour battery', 'Precision haptics'],
    },
    specs: [
      [{ ar: 'الاتصال', en: 'Connectivity' }, { ar: 'لاسلكي 2.4GHz / بلوتوث / USB-C', en: '2.4GHz wireless / Bluetooth / USB-C' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '40 ساعة', en: '40 hours' }],
    ],
  },
  {
    id: 'volt-keys-tkl', sku: 'BRQ-GM-VKT', cat: 'gaming', brand: 'Volt',
    name: { ar: 'لوحة مفاتيح فولت TKL', en: 'Volt Keys TKL' },
    price: 320, oldPrice: null, rating: 4.5, reviews: 134, stock: 38,
    img: 'keyboard', badges: [], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['مفاتيح ميكانيكية قابلة للتبديل', 'حروف عربية محفورة بالليزر', 'إضاءة RGB لكل مفتاح'],
      en: ['Hot-swappable mechanical switches', 'Laser-etched Arabic legends', 'Per-key RGB lighting'],
    },
    specs: [
      [{ ar: 'النوع', en: 'Type' }, { ar: 'ميكانيكية TKL', en: 'Mechanical TKL' }],
      [{ ar: 'المفاتيح', en: 'Switches' }, { ar: 'خطية حمراء', en: 'Red linear' }],
      [{ ar: 'التخطيط', en: 'Layout' }, { ar: 'عربي / إنجليزي', en: 'Arabic / English' }],
    ],
  },
  {
    id: 'volt-glide', sku: 'BRQ-GM-VG', cat: 'gaming', brand: 'Volt',
    name: { ar: 'فأرة فولت جلايد', en: 'Volt Glide Mouse' },
    price: 165, oldPrice: 210, rating: 4.4, reviews: 367, stock: 95,
    img: 'mouse', badges: ['deal'], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['حساسية 26000 نقطة لكل بوصة', 'وزن 58 جرام فقط', 'استجابة 1000Hz'],
      en: ['26,000 DPI sensor', 'Only 58 grams', '1000Hz polling rate'],
    },
    specs: [
      [{ ar: 'الحساسية', en: 'Sensor' }, '26,000 DPI'],
      [{ ar: 'الوزن', en: 'Weight' }, '58 g'],
      [{ ar: 'الاتصال', en: 'Connectivity' }, { ar: 'لاسلكي / سلكي', en: 'Wireless / wired' }],
    ],
  },

  /* ───────────── Home appliances ───────────── */
  {
    id: 'nimbus-cool-520', sku: 'BRQ-HM-NC5', cat: 'home', brand: 'Nimbus',
    name: { ar: 'ثلاجة نيمبوس كول 520', en: 'Nimbus Cool 520' },
    price: 6800, oldPrice: 7600, rating: 4.6, reviews: 58, stock: 7,
    img: 'fridge', badges: ['deal'], featured: true, warranty: 60, year: 2025,
    highlights: {
      ar: ['سعة 520 لتر بدون ثلج', 'ضمان 5 سنوات على الضاغط', 'يعمل باستقرار مع تذبذب الكهرباء', 'توصيل وتركيب مجاني'],
      en: ['520 L no-frost capacity', '5-year compressor warranty', 'Stable through mains fluctuation', 'Free delivery and installation'],
    },
    specs: [
      [{ ar: 'السعة', en: 'Capacity' }, '520 L'],
      [{ ar: 'النوع', en: 'Type' }, { ar: 'بابان، بدون ثلج', en: 'Two-door, no frost' }],
      [{ ar: 'كفاءة الطاقة', en: 'Energy rating' }, 'A++'],
      [{ ar: 'الضمان', en: 'Warranty' }, { ar: '5 سنوات على الضاغط', en: '5 years on compressor' }],
    ],
  },
  {
    id: 'nimbus-breeze-24', sku: 'BRQ-HM-NB24', cat: 'home', brand: 'Nimbus',
    name: { ar: 'مكيف نيمبوس بريز 24000', en: 'Nimbus Breeze 24,000 BTU' },
    price: 3600, oldPrice: null, rating: 4.5, reviews: 112, stock: 18,
    img: 'ac', badges: ['bestseller'], featured: true, warranty: 36, year: 2025,
    options: { label: { ar: 'القدرة', en: 'Capacity' }, values: [
      { key: '12k', label: '12,000 BTU', delta: -1100 },
      { key: '18k', label: '18,000 BTU', delta: -550 },
      { key: '24k', label: '24,000 BTU', delta: 0 },
    ] },
    highlights: {
      ar: ['إنفرتر موفر للطاقة حتى 60%', 'يبرد بكفاءة حتى 52 درجة مئوية', 'فلتر مضاد للغبار مناسب للجو الليبي', 'تشغيل هادئ 22 ديسيبل'],
      en: ['Inverter saves up to 60% energy', 'Cools efficiently up to 52°C', 'Anti-dust filter suited to Libyan air', 'Quiet 22 dB operation'],
    },
    specs: [
      [{ ar: 'القدرة', en: 'Capacity' }, '24,000 BTU'],
      [{ ar: 'النوع', en: 'Type' }, { ar: 'سبليت إنفرتر', en: 'Split inverter' }],
      [{ ar: 'كفاءة الطاقة', en: 'Energy rating' }, 'A+++'],
      [{ ar: 'الغاز', en: 'Refrigerant' }, 'R32'],
    ],
  },
  {
    id: 'nimbus-wash-9', sku: 'BRQ-HM-NW9', cat: 'home', brand: 'Nimbus',
    name: { ar: 'غسالة نيمبوس 9 كجم', en: 'Nimbus Wash 9 kg' },
    price: 4200, oldPrice: 4750, rating: 4.4, reviews: 76, stock: 9,
    img: 'washer', badges: ['deal'], featured: false, warranty: 36, year: 2025,
    highlights: {
      ar: ['سعة 9 كجم بمحرك إنفرتر', 'برنامج سريع 15 دقيقة', 'قفل حماية الأطفال'],
      en: ['9 kg with inverter motor', '15-minute quick wash', 'Child lock'],
    },
    specs: [
      [{ ar: 'السعة', en: 'Capacity' }, '9 kg'],
      [{ ar: 'سرعة العصر', en: 'Spin speed' }, '1400 rpm'],
      [{ ar: 'كفاءة الطاقة', en: 'Energy rating' }, 'A+++'],
    ],
  },
  {
    id: 'nimbus-wave-30', sku: 'BRQ-HM-NM30', cat: 'home', brand: 'Nimbus',
    name: { ar: 'مايكروويف نيمبوس 30 لتر', en: 'Nimbus Wave 30 L' },
    price: 1150, oldPrice: null, rating: 4.3, reviews: 143, stock: 26,
    img: 'microwave', badges: [], featured: false, warranty: 24, year: 2024,
    highlights: {
      ar: ['سعة 30 لتر مع شواية', 'قوائم عربية جاهزة', 'تنظيف سهل بالبخار'],
      en: ['30 L with grill', 'Preset Arabic menus', 'Easy steam clean'],
    },
    specs: [
      [{ ar: 'السعة', en: 'Capacity' }, '30 L'],
      [{ ar: 'القدرة', en: 'Power' }, '900W'],
      [{ ar: 'الشواية', en: 'Grill' }, { ar: 'نعم، 1100 واط', en: 'Yes, 1100W' }],
    ],
  },
  {
    id: 'lumio-sweep-r7', sku: 'BRQ-HM-LS7', cat: 'home', brand: 'Lumio',
    name: { ar: 'مكنسة لوميو الروبوتية R7', en: 'Lumio Sweep R7' },
    price: 2400, oldPrice: 2900, rating: 4.5, reviews: 97, stock: 13,
    img: 'vacuum', badges: ['new'], featured: true, warranty: 24, year: 2026,
    highlights: {
      ar: ['رسم خرائط ليزري للمنزل', 'شفط 6000 باسكال', 'تطبيق بواجهة عربية', 'يمسح ويكنس في آن واحد'],
      en: ['Laser home mapping', '6000 Pa suction', 'App with Arabic interface', 'Vacuums and mops at once'],
    },
    specs: [
      [{ ar: 'الشفط', en: 'Suction' }, '6000 Pa'],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '180 دقيقة', en: '180 minutes' }],
      [{ ar: 'الخرائط', en: 'Mapping' }, { ar: 'ليزر LiDAR', en: 'LiDAR' }],
    ],
  },
  {
    id: 'lumio-blend-900', sku: 'BRQ-HM-LB9', cat: 'home', brand: 'Lumio',
    name: { ar: 'خلاط لوميو 900 واط', en: 'Lumio Blend 900' },
    price: 540, oldPrice: null, rating: 4.2, reviews: 221, stock: 40,
    img: 'blender', badges: [], featured: false, warranty: 12, year: 2024,
    highlights: {
      ar: ['محرك 900 واط يكسر الثلج', 'إبريق زجاجي 1.5 لتر', 'ست سرعات'],
      en: ['900W motor crushes ice', '1.5 L glass jar', 'Six speeds'],
    },
    specs: [
      [{ ar: 'القدرة', en: 'Power' }, '900W'],
      [{ ar: 'السعة', en: 'Jar capacity' }, '1.5 L'],
      [{ ar: 'السرعات', en: 'Speeds' }, '6'],
    ],
  },

  /* ───────────── Accessories ───────────── */
  {
    id: 'volt-charge-20k', sku: 'BRQ-AC-VC20', cat: 'accessories', brand: 'Volt',
    name: { ar: 'باور بانك فولت 20000', en: 'Volt Charge 20,000' },
    price: 180, oldPrice: 240, rating: 4.6, reviews: 583, stock: 120,
    img: 'powerbank', badges: ['bestseller', 'deal'], featured: true, warranty: 12, year: 2025,
    highlights: {
      ar: ['سعة 20000 مللي أمبير', 'شحن سريع 65 واط لللابتوب', 'ثلاثة منافذ في نفس الوقت', 'ضروري مع انقطاع الكهرباء'],
      en: ['20,000 mAh capacity', '65W fast charge, laptop-capable', 'Three ports at once', 'Built for power cuts'],
    },
    specs: [
      [{ ar: 'السعة', en: 'Capacity' }, '20,000 mAh'],
      [{ ar: 'المخرجات', en: 'Output' }, '65W USB-C PD, 2× USB-A'],
      [{ ar: 'الوزن', en: 'Weight' }, '420 g'],
    ],
  },
  {
    id: 'nimbus-mesh-6', sku: 'BRQ-AC-NM6', cat: 'accessories', brand: 'Nimbus',
    name: { ar: 'راوتر نيمبوس ميش WiFi 6', en: 'Nimbus Mesh WiFi 6' },
    price: 350, oldPrice: null, rating: 4.4, reviews: 164, stock: 34,
    img: 'router', badges: [], featured: false, warranty: 24, year: 2025,
    highlights: {
      ar: ['تغطية حتى 200 متر مربع', 'يدعم أكثر من 60 جهاز', 'إعداد بسيط من التطبيق'],
      en: ['Covers up to 200 m²', 'Handles 60+ devices', 'Simple app setup'],
    },
    specs: [
      [{ ar: 'المعيار', en: 'Standard' }, 'WiFi 6 (AX3000)'],
      [{ ar: 'التغطية', en: 'Coverage' }, '200 m²'],
      [{ ar: 'المنافذ', en: 'Ports' }, '3× Gigabit LAN'],
    ],
  },
  {
    id: 'helio-watch-s3', sku: 'BRQ-AC-HW3', cat: 'accessories', brand: 'Helio',
    name: { ar: 'ساعة هيليو S3', en: 'Helio Watch S3' },
    price: 1450, oldPrice: 1700, rating: 4.5, reviews: 249, stock: 22,
    img: 'watch', badges: ['deal'], featured: true, warranty: 12, year: 2026,
    colors: [{ ...C.onyx, img: 'watch' }, { ...C.gold, img: 'watch-gold' }],
    highlights: {
      ar: ['قياس الأكسجين ونبض القلب', 'تذكير بأوقات الصلاة واتجاه القبلة', 'بطارية 14 يوم', 'مقاومة الماء 5 ATM'],
      en: ['Blood oxygen and heart rate', 'Prayer times and Qibla direction', '14-day battery', '5 ATM water resistance'],
    },
    specs: [
      [{ ar: 'الشاشة', en: 'Display' }, { ar: '1.8 بوصة AMOLED', en: '1.8" AMOLED' }],
      [{ ar: 'البطارية', en: 'Battery' }, { ar: '14 يوم', en: '14 days' }],
      [{ ar: 'المقاومة', en: 'Water resistance' }, '5 ATM'],
      [{ ar: 'المستشعرات', en: 'Sensors' }, { ar: 'نبض، أكسجين، نوم، GPS', en: 'HR, SpO2, sleep, GPS' }],
    ],
  },
  {
    id: 'orbix-lens-r6', sku: 'BRQ-AC-OR6', cat: 'accessories', brand: 'Orbix',
    name: { ar: 'كاميرا أوربكس R6', en: 'Orbix Lens R6' },
    price: 7200, oldPrice: null, rating: 4.8, reviews: 41, stock: 3,
    img: 'camera', badges: ['new'], featured: false, warranty: 24, year: 2026,
    highlights: {
      ar: ['مستشعر كامل الإطار 33 ميجابكسل', 'تصوير فيديو 4K بمعدل 60 إطار', 'تثبيت داخل الجسم 8 درجات'],
      en: ['33MP full-frame sensor', '4K 60fps video', '8-stop in-body stabilisation'],
    },
    specs: [
      [{ ar: 'المستشعر', en: 'Sensor' }, { ar: 'كامل الإطار 33 ميجابكسل', en: 'Full-frame 33MP' }],
      [{ ar: 'الفيديو', en: 'Video' }, '4K 60fps'],
      [{ ar: 'التثبيت', en: 'Stabilisation' }, { ar: '8 درجات داخل الجسم', en: '8-stop IBIS' }],
    ],
  },
  {
    id: 'orbix-sky-4', sku: 'BRQ-AC-OS4', cat: 'accessories', brand: 'Orbix',
    name: { ar: 'درون أوربكس سكاي 4', en: 'Orbix Sky 4' },
    price: 5400, oldPrice: 6100, rating: 4.7, reviews: 52, stock: 5,
    img: 'drone', badges: ['deal'], featured: false, warranty: 12, year: 2025,
    highlights: {
      ar: ['تصوير 4K بمعدل 60 إطار', 'زمن طيران 42 دقيقة', 'تجنب العوائق في كل الاتجاهات'],
      en: ['4K 60fps camera', '42-minute flight time', 'Omnidirectional obstacle avoidance'],
    },
    specs: [
      [{ ar: 'الكاميرا', en: 'Camera' }, '4K 60fps, 1" sensor'],
      [{ ar: 'زمن الطيران', en: 'Flight time' }, { ar: '42 دقيقة', en: '42 minutes' }],
      [{ ar: 'المدى', en: 'Range' }, '12 km'],
    ],
  },
  {
    id: 'lumio-beam-2', sku: 'BRQ-AC-LB2', cat: 'accessories', brand: 'Lumio',
    name: { ar: 'بروجكتر لوميو بيم 2', en: 'Lumio Beam 2' },
    price: 2750, oldPrice: null, rating: 4.3, reviews: 68, stock: 10,
    img: 'projector', badges: [], featured: false, warranty: 18, year: 2025,
    highlights: {
      ar: ['صورة حتى 150 بوصة', 'تركيز تلقائي وتصحيح الزوايا', 'نظام ذكي مدمج'],
      en: ['Up to 150" image', 'Autofocus and keystone correction', 'Built-in smart platform'],
    },
    specs: [
      [{ ar: 'الدقة', en: 'Resolution' }, '1080p'],
      [{ ar: 'السطوع', en: 'Brightness' }, '900 ANSI lumens'],
      [{ ar: 'الحجم', en: 'Image size' }, { ar: 'حتى 150 بوصة', en: 'Up to 150"' }],
    ],
  },
  {
    id: 'lumio-glow-e27', sku: 'BRQ-AC-LG27', cat: 'accessories', brand: 'Lumio',
    name: { ar: 'لمبة لوميو الذكية E27', en: 'Lumio Glow Smart Bulb E27' },
    price: 75, oldPrice: 95, rating: 4.2, reviews: 512, stock: 200,
    img: 'bulb', badges: ['deal'], featured: false, warranty: 12, year: 2024,
    highlights: {
      ar: ['16 مليون لون', 'تحكم بالتطبيق أو الصوت', 'توفير 85% من الطاقة'],
      en: ['16 million colours', 'App or voice control', '85% energy saving'],
    },
    specs: [
      [{ ar: 'القاعدة', en: 'Base' }, 'E27'],
      [{ ar: 'القدرة', en: 'Power' }, '9W (60W equivalent)'],
      [{ ar: 'الاتصال', en: 'Connectivity' }, 'WiFi 2.4GHz'],
    ],
  },
  {
    id: 'kova-print-m40', sku: 'BRQ-AC-KP40', cat: 'accessories', brand: 'Kova',
    name: { ar: 'طابعة كوفا M40', en: 'Kova Print M40' },
    price: 1480, oldPrice: null, rating: 4.1, reviews: 87, stock: 16,
    img: 'printer', badges: [], featured: false, warranty: 24, year: 2024,
    highlights: {
      ar: ['طباعة ليزر 40 صفحة في الدقيقة', 'طباعة من الهاتف مباشرة', 'تكلفة منخفضة لكل صفحة'],
      en: ['40 ppm laser printing', 'Print straight from your phone', 'Low cost per page'],
    },
    specs: [
      [{ ar: 'النوع', en: 'Type' }, { ar: 'ليزر أبيض وأسود', en: 'Monochrome laser' }],
      [{ ar: 'السرعة', en: 'Speed' }, '40 ppm'],
      [{ ar: 'الاتصال', en: 'Connectivity' }, 'WiFi, USB, Ethernet'],
    ],
  },
];

/* Derived lookups — computed once, used everywhere. */
export const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const countByCategory = (id) => PRODUCTS.filter((p) => p.cat === id).length;
