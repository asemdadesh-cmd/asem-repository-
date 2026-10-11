/**
 * Every wedding detail lives here. Edit this file only — the page, the
 * link-preview tags and the calendar file are all generated from it.
 */
export const wedding = {
  bride: { first: 'ندى', rest: 'خالد ددش' },
  groom: { first: 'همام', rest: 'الحجاجي' },
  /** Seal monogram (bride first, groom second). */
  monogram: ['ن', 'ه'] as const,

  /** Libya time is UTC+2 all year (no daylight saving). */
  startsAt: '2026-12-01T21:00:00+02:00',
  /** Used only by the calendar file — the evening's expected length. */
  durationHours: 3,
  weekday: 'الثلاثاء',
  day: '1',
  month: 'ديسمبر',
  year: '2026',
  /** Umm al-Qura calculation; set to '' to hide if the local date differs. */
  hijri: '21 جمادى الآخرة 1448 هـ',
  time: 'الساعة التاسعة مساءً',

  /**
   * Optional small print under the card, e.g. 'الدعوة خاصة' or
   * 'نرجو عدم اصطحاب الأطفال'. Empty until the family confirms.
   */
  notes: [] as string[],

  venue: {
    name: 'صالة الأسطورة',
    area: 'المشتل',
    mapsUrl: 'https://maps.app.goo.gl/SftgsWfedHwVB2JK9?g_st=ac',
  },

  music: {
    enabled: true,
    /**
     * Optional recorded track (e.g. '/audio/music.mp3' placed in public/audio).
     * Empty = the built-in generated oud piece in maqam Bayati.
     */
    src: '',
  },

  /**
   * Photographs — no people, ever. Each is either an Unsplash photo id
   * (served from Unsplash's image CDN, free under the Unsplash License) or a
   * path to your own file in public/images, e.g. '/images/hall.webp'.
   * See public/images/README.md for prompts to generate custom ones.
   */
  photos: {
    // Satin is rendered locally (scripts/satin.mjs), so the backdrop never depends on a CDN.
    satin: { src: '/textures/satin.webp', by: '' },
    satinWide: { src: '/textures/satin-wide.webp', by: '' },
    eucalyptus: { src: '1611255552402-4f772d00621b', by: 'Diana Polekhina' }, // leaves on white
    table: { src: '1769230361493-f1f365a99878', by: 'Samuel Cruz' }, // round table, floral centrepiece
    hall: { src: '1781947486682-aafbb8427889', by: 'Chermiti Mohamed' }, // chandelier, arched windows
  },
} as const;

export type Wedding = typeof wedding;
