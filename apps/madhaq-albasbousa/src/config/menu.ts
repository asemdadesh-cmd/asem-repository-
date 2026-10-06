// ─────────────────────────────────────────────────────────────
// THE MENU — the only file to edit when the owner sends real prices.
//
// • Everything is sold as a WHOLE tray / box / cake — never per piece.
// • Prices, sizes, serving estimates and photos below are DEMO values (V1).
// • To change a price: edit the number next to small / medium / large.
// • To change "how many people it serves": edit SERVES (applies everywhere)
//   or pass a custom `serves` for one product.
// • To use the owner's own photo: put it in /public/images/ and set
//   image: { src: '/images/basbousa.jpg', alt: '…' } (drop `credit`).
// ─────────────────────────────────────────────────────────────

import type { Category, Photo, Product, UnitType, Variant } from '../lib/types';

/** Default Arabic word for each way of selling. A product can override it with `unitLabel`. */
export const UNIT_LABELS: Record<UnitType, string> = {
  tray: 'طاجين',
  box: 'بوكس',
  cake: 'قالب',
};

/** Standard size names. */
export const SIZE_NAMES = { small: 'صغير', medium: 'وسط', large: 'كبير' } as const;
type SizeId = keyof typeof SIZE_NAMES;

/** Demo serving estimates, shared by every standard tray/cake. */
export const SERVES: Record<SizeId, string> = {
  small: 'يكفي تقريباً 4–6 أشخاص',
  medium: 'يكفي تقريباً 7–10 أشخاص',
  large: 'يكفي تقريباً 12–16 شخص',
};

/** Rough head-count each size covers — used by the "كم شخص عندك؟" helper. */
export const SERVES_UP_TO: Record<SizeId, number> = { small: 6, medium: 10, large: 16 };

type SizeSpec = number | { price: number; serves?: string; dimensions?: string; image?: Photo };

/** Builds the usual small / medium / large variants from prices (and optional per-size extras). */
function sizes(spec: Record<SizeId, SizeSpec>): Variant[] {
  return (Object.keys(SIZE_NAMES) as SizeId[]).map((id) => {
    const s = spec[id];
    const extra = typeof s === 'number' ? { price: s } : s;
    return { id, nameAr: SIZE_NAMES[id], serves: SERVES[id], ...extra };
  });
}

const unsplash = (photo: string, alt: string, name: string, username: string, photoId: string): Photo => ({
  src: `https://images.unsplash.com/${photo}`,
  alt,
  credit: { name, username, photoId },
});

// Demo photography (Unsplash) — full trays, boxes and whole cakes. Replace with the shop's own photos.
export const PHOTOS = {
  basbousa: unsplash('photo-1772469625117-412cb49042e6', 'طاجين بسبوسة كامل مزيّن بالمكسرات', 'Mohammad Fahim', 'dischef', 'oyVe1GRV7K8'),
  basbousaNutella: unsplash('photo-1511190714235-97e88477ba74', 'صينية كاملة مغطاة بكريمة الشوكولاتة', 'charlesdeluvio', 'charlesdeluvio', 'VCoElIDCRcg'),
  kunafa: unsplash('photo-1590429878071-1fabde685deb', 'صينية كنافة دائرية كاملة مزيّنة باللوز', 'kaouther djouada', '__kaouther_', 'WX3pTqLsQao'),
  kunafaNutella: unsplash('photo-1590429853545-48ecfa348c20', 'صينية كنافة دائرية كاملة من فوق', 'kaouther djouada', '__kaouther_', '6ttHZMcLHMc'),
  baklavaBox: unsplash('photo-1620292760785-94e105bdaa8f', 'بوكس بقلاوة ذهبية كامل', 'engin akyurt', 'enginakyurt', '19Jxxi8bO2Y'),
  baklavaTray: unsplash('photo-1598110750624-207050c4f28c', 'صينية بقلاوة كاملة بالفستق', 'Syed F Hashemi', 'sfhashemi', 'bGAPRnJITpQ'),
  lotus: unsplash('photo-1707592379056-f5c2a9973a5b', 'قالب تشيز كيك لوتس كامل', 'Sana Umer', 'sanaumer', 'JGN-nskfQz4'),
  chocolateCake: unsplash('photo-1640794334523-b299f14d28db', 'قالب كيكة شوكولاتة كامل مزيّن', 'Kadarius Seegars', 'kseegars', 'cYnun9rAEqY'),
  occasionTrays: unsplash('photo-1658413380634-e127bbaeeb7b', 'صواني بقلاوة وحلويات كاملة جاهزة للمناسبات', 'engin akyurt', 'enginakyurt', 'KYTCFLOuG60'),
} satisfies Record<string, Photo>;

export const CATEGORIES: Category[] = [
  { id: 'basbousa', nameAr: 'بسبوسة' },
  { id: 'kunafa', nameAr: 'كنافة' },
  { id: 'baklava', nameAr: 'بقلاوة' },
  { id: 'cakes', nameAr: 'كيك' },
  { id: 'occasions', nameAr: 'صواني المناسبات' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'basbousa-qishta',
    nameAr: 'بسبوسة بالقشطة',
    nameEn: 'Basbousa with cream',
    description: 'بسبوسة طرية محضّرة يومياً بطبقة غنية من القشطة، مسقية بالقطر ومزيّنة بالمكسرات.',
    category: 'basbousa',
    image: PHOTOS.basbousa,
    unitType: 'tray',
    badge: 'الأكثر طلباً',
    variants: sizes({ small: 30, medium: 45, large: 65 }),
  },
  {
    id: 'basbousa-nutella',
    nameAr: 'بسبوسة نوتيلا',
    nameEn: 'Nutella basbousa',
    description: 'بسبوستنا الذهبية مغطاة بطبقة سخية من النوتيلا، مقطّعة وجاهزة للتقديم.',
    category: 'basbousa',
    image: PHOTOS.basbousaNutella,
    unitType: 'tray',
    variants: sizes({ small: 35, medium: 50, large: 70 }),
  },
  {
    id: 'kunafa-qishta',
    nameAr: 'كنافة بالقشطة',
    nameEn: 'Kunafa with cream',
    description: 'كنافة مقرمشة بالسمن، محشية قشطة ومسقية بالقطر — تتقدّم سخونة.',
    category: 'kunafa',
    image: PHOTOS.kunafa,
    unitType: 'tray',
    unitLabel: 'صينية',
    variants: sizes({ small: 40, medium: 55, large: 75 }),
  },
  {
    id: 'kunafa-nutella',
    nameAr: 'كنافة نوتيلا',
    nameEn: 'Nutella kunafa',
    description: 'كنافة محمّصة محشية ومغطاة بالنوتيلا — المفضّلة عند الصغار والكبار.',
    category: 'kunafa',
    image: PHOTOS.kunafaNutella,
    unitType: 'tray',
    unitLabel: 'صينية',
    variants: sizes({ small: 45, medium: 60, large: 80 }),
  },
  {
    id: 'baklava-mix',
    nameAr: 'بقلاوة مشكلة',
    nameEn: 'Assorted baklava',
    description: 'تشكيلة بقلاوة بالفستق والجوز والكاجو، مرصوصة في بوكس جاهز للضيافة أو الهدية.',
    category: 'baklava',
    image: PHOTOS.baklavaBox,
    unitType: 'box',
    variants: sizes({
      small: { price: 35, dimensions: 'حوالي ½ كيلو' },
      medium: { price: 55, dimensions: 'حوالي 1 كيلو' },
      large: { price: 80, dimensions: 'حوالي 1½ كيلو' },
    }),
  },
  {
    id: 'baklava-tray',
    nameAr: 'صينية بقلاوة بالفستق',
    nameEn: 'Pistachio baklava tray',
    description: 'صينية بقلاوة كاملة بالسمن والفستق الحلبي، مقطّعة وجاهزة للعزومة.',
    category: 'baklava',
    image: PHOTOS.baklavaTray,
    unitType: 'tray',
    unitLabel: 'صينية',
    variants: sizes({ small: 60, medium: 90, large: 130 }),
  },
  {
    id: 'lotus-cheesecake',
    nameAr: 'تشيز كيك لوتس',
    nameEn: 'Lotus cheesecake',
    description: 'قاعدة بسكويت لوتس، كريمة جبن ناعمة، وصوص لوتس على الوجه.',
    category: 'cakes',
    image: PHOTOS.lotus,
    unitType: 'cake',
    variants: sizes({
      small: { price: 45, dimensions: 'قطر 18 سم' },
      medium: { price: 65, dimensions: 'قطر 22 سم' },
      large: { price: 85, dimensions: 'قطر 26 سم' },
    }),
  },
  {
    id: 'chocolate-cake',
    nameAr: 'كيكة شوكولاتة',
    nameEn: 'Chocolate cake',
    description: 'كيكة شوكولاتة طرية بطبقات كريمة الشوكولاتة — تنفع لعيد ميلاد أو لمّة.',
    category: 'cakes',
    image: PHOTOS.chocolateCake,
    unitType: 'cake',
    variants: sizes({
      small: { price: 40, dimensions: 'قطر 18 سم' },
      medium: { price: 60, dimensions: 'قطر 22 سم' },
      large: { price: 80, dimensions: 'قطر 26 سم' },
    }),
  },
  {
    id: 'occasion-mix',
    nameAr: 'صينية المناسبات المشكلة',
    nameEn: 'Mixed occasion tray',
    description: 'بسبوسة وكنافة وبقلاوة في صينية وحدة كبيرة — للعزائم والخطوبات والأعياد والجمعات الكبيرة.',
    category: 'occasions',
    image: PHOTOS.occasionTrays,
    unitType: 'tray',
    unitLabel: 'صينية',
    badge: 'للمناسبات',
    variants: [
      { id: 'medium', nameAr: 'وسط', price: 120, serves: 'يكفي تقريباً 15–20 شخص' },
      { id: 'large', nameAr: 'كبير', price: 180, serves: 'يكفي تقريباً 25–30 شخص' },
      { id: 'family', nameAr: 'عائلي', price: 250, serves: 'يكفي تقريباً 35–45 شخص' },
    ],
  },
];
