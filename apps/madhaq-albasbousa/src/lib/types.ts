/** How a product is sold. Never per piece — always a whole tray, box or cake. */
export type UnitType = 'tray' | 'box' | 'cake';

export type CategoryId = 'basbousa' | 'kunafa' | 'baklava' | 'cakes' | 'occasions';

export interface Photo {
  /** Local path (/images/x.jpg) or full https URL. Unsplash URLs get sized automatically. */
  src: string;
  alt: string;
  /** Photographer credit for stock photos; drop it once the owner's own photos are in. */
  credit?: { name: string; username: string; photoId: string };
}

export interface Variant {
  id: string;
  nameAr: string;
  price: number;
  /** e.g. "يكفي تقريباً 4–6 أشخاص" */
  serves: string;
  /** Optional, e.g. "30×20 سم" */
  dimensions?: string;
  /** Optional photo for this size only. */
  image?: Photo;
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  category: CategoryId;
  image: Photo;
  unitType: UnitType;
  /** Overrides the default word for the unit (e.g. "صينية" for kunafa instead of "طاجين"). */
  unitLabel?: string;
  variants: Variant[];
  /** Pre-selected size in the product sheet. Defaults to the middle size. */
  defaultVariantId?: string;
  /** Small ribbon on the card, e.g. "الأكثر طلباً". */
  badge?: string;
}

export interface Category {
  id: CategoryId;
  nameAr: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
}

export type Fulfilment = 'delivery' | 'pickup';

export interface CustomerDetails {
  name: string;
  phone: string;
  fulfilment: Fulfilment;
  area: string;
  address: string;
  when: string;
  date: string;
  notes: string;
}
