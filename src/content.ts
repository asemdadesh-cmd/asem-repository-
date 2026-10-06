// Her photos + drawings. Never committed: served from private storage via /api/photo/.

export interface Picture {
  id: string;
  file: string;
  title: string;
  caption: string;
  w: number;
  h: number;
  featured?: boolean;
}

export const PHOTOS: Picture[] = [
  { id: 'together', file: 'photo-together', title: 'عاصم × يسو', caption: 'عاصم 🇱🇾 × يسو 🇲🇦 — صحاب للأبد، والتخربيق للأبد 🤍', w: 1536, h: 1024, featured: true },
  { id: 'kaftan', file: 'photo-kaftan', title: 'لالة يسو', caption: 'القفطان المغربي 👑 — الأناقة الرسمية ديال الرئيسة', w: 1080, h: 1440 },
  { id: 'teddy', file: 'photo-teddy', title: 'الدبدوب', caption: 'الدبدوب العملاق 🧸 — عضو شرفي فالنادي (وكيضرب بالبوكيه)', w: 880, h: 1280 },
  { id: 'night', file: 'photo-night', title: 'ليلة ستايل', caption: 'ليلة ستايل 🖤✨ — حتى الأضواء كتحشم', w: 1080, h: 1139 },
  { id: 'garden', file: 'photo-garden', title: 'استراحة', caption: 'استراحة المحاربة 🌿 — بعد ما غلبات الكل فالمسبح', w: 960, h: 1280 },
  { id: 'sun', file: 'photo-sun', title: 'سلام يا الشمس', caption: 'يسو كتسلم على الشمس ☀️ — والشمس كتسلم عليها', w: 960, h: 1280 },
  { id: 'mirror', file: 'photo-mirror', title: 'سيلفي', caption: 'سيلفي الجردة 📸 — الشعر البوردو ديما حاضر', w: 1080, h: 1440 },
];

export const ARTWORKS: Picture[] = [
  { id: 'cat-watercolor', file: 'art-cat-watercolor', title: 'قطة الضباب', caption: 'ألوان مائية — بريشة يسو 🎨', w: 1080, h: 947 },
  { id: 'hug', file: 'art-hug', title: 'حضن الألوان', caption: 'أكريليك — بريشة يسو 🌈', w: 733, h: 1280 },
  { id: 'clay-cat', file: 'art-clay-cat', title: 'القط الكسول', caption: 'منحوتة صلصال — من يدين يسو 🐈 (هي اللي ألهمات مشيشة)', w: 761, h: 1280 },
];

export const assetUrl = (file: string, small = false) => `/api/photo/${file}${small ? '-sm' : ''}.jpg`;

export const CLUB_RULES = [
  '١. ممنوع الزعاف… إلا فالمزاح 😤',
  '٢. «بضربك😂» مسموحة 24/24',
  '٣. اللي خسر فالكورة كيخلص الأتاي 🍵',
  '٤. «قندس» ممنوعة… إلا إلا 🦫',
  '٥. الصحبة قبل كلشي 🤍',
];

export const QUICK_LINES = [
  'واش كاين؟ 👀',
  'يالله نلعبو ⚽',
  'تعال للمسبح 💦',
  'هههههههه 😂',
  'صافي صافي 🙄',
  'غادي نغلبك 😤',
  'شن تبي؟ 😏',
  'باهي 👌',
  'توا نوريك 😤',
  'سير تعلم 😌',
];
