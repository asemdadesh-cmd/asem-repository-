// ─────────────────────────────────────────────────────────────────────────────
//  EDIT THIS FILE TO MAKE THE GAME YOURS.
//  Everything personal lives here: names, photos, quiz, jokes, the letter.
//  Photos go in /photos — any missing photo shows a cute placeholder instead,
//  so the game always works while you're still collecting pictures.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  herName: 'Shahuda',          // what the game calls her (شهودة)
  herNameAr: 'شهودة',
  myName: 'Me',                // your name — signs the letter and labels you in the 3D world
  // Exact day you met (YYYY-MM-DD) turns on a "N days of us" counter.
  // Unknown? Leave '' and `togetherText` is shown instead.
  startDate: '',
  togetherText: 'Since that first drive from uni 🚗💗',

  // Title screen photo of the two of you.
  coverPhoto: 'photos/cover.jpg',
  introLineAr: 'عالم صغير… كله ليك 💗',

  // Our song: PARTYNEXTDOOR — "IDK". Put your own copy of the mp3 at this path.
  // If the file isn't there, the music button simply stays hidden.
  music: 'photos/idk.mp3',
  musicTitle: 'IDK — PARTYNEXTDOOR',

  // ── 🙋‍♂️ You, standing in the 3D world. Says these when she walks up.
  // {hearts} becomes e.g. "2/5".
  npcLines: [
    'هلا شهودة 😍',
    'Talk Tik 😏',
    'Don\'t hit me 😭 …okay, maybe one.',
    'Remember our first drive from uni? 🚗🎶',
    'Still thinking about those cinnamon buns 🤤',
    'Psst… the secret cottage is at the end of Memory Lane 👀',
    'Hearts so far: {hearts}. يلا! 💪',
    'You look amazing today. And every day.',
  ],

  // ── 🎨 The Studio ─ she paints the canvas and reveals this photo ──────────
  paint: {
    photo: 'photos/paint.jpg',
    reveal: 'Okay Picasso, that\'s the best thing you\'ve ever painted… wait, no, that\'s just you. Still a masterpiece. 🖼️',
  },

  // ── 🍳 The Kitchen ─ catch the ingredients, dodge the nonsense ───────────
  kitchen: {
    dish: 'cinnamon buns',
    photo: 'photos/buns.jpg',           // shown when she finishes
    target: 12,
    good: ['🌾', '🧈', '🥚', '🥛', '🍯', '🍬'],
    bad: ['🧦', '🐌', '🪳', '📱', '🧽', '🧅'],
    badLines: [
      'A sock in the cinnamon buns?? Bold.',
      'The snail is not an ingredient, chef.',
      'Was that my phone?? Why is my phone in the dough??',
      'An onion. In cinnamon buns. I\'m calling the police.',
      'A sponge. Fluffy, at least.',
      'Talk Tik… and the buns are ruined 😭',
    ],
    win: 'Best cinnamon buns I\'ve ever had. Not even close. Please make them again 🥺',
  },

  // ── 💪 The Gym ─ every rep unlocks a compliment ──────────────────────────
  gym: {
    photo: 'photos/gym.jpg',            // shown when she hits the final rep
    reps: 10,
    compliments: [
      'Rep 1: strongest girl I know.',
      'Rep 2: also the prettiest. Not a coincidence.',
      'Rep 3: your laugh is my favourite sound.',
      'Rep 4: you make everything funnier.',
      'Rep 5: halfway! I\'m your spotter. Mostly I\'m staring.',
      'Rep 6: you paint, you bake, you lift. Is there anything you can\'t do?',
      'Rep 7: you make me want to be better.',
      'Rep 8: these arms are for hugging me. NOT hitting me. 😤',
      'Rep 9: okay fine, one tiny hit. You earned it.',
      'Rep 10: PR! Personal Record of how much I love you. نحبك 💗',
    ],
  },

  // ── 🧠 Memory Lane ─ match the pairs (6 photos) ──────────────────────────
  memory: [
    { photo: 'photos/memory5.jpg', caption: 'Our first drive from uni 🚗🎶 You got in my car, I played a song — and that was it.' },
    { photo: 'photos/cover.jpg', caption: 'Best pillow in the world. Not taking questions.' },
    { photo: 'photos/buns.jpg', caption: 'You made me cinnamon buns. I\'ve been yours ever since 🤤' },
    { photo: 'photos/memory6.jpg', caption: 'My favourite hand to hold 🤍 (even when it\'s trying to hit me)' },
    { photo: 'photos/memory1.jpg', caption: 'Hiding your face won\'t work. I already know it\'s cute 🙈' },
    { photo: 'photos/sunshine.jpg', caption: 'The sun looks good on you ☀️' },
  ],

  // ── ❓ The Quiz ─ "How well do you know us?" ─────────────────────────────
  // `answer` is the index of the correct option (0-based).
  quiz: [
    {
      q: 'Where did we first meet?',
      options: ['A café', 'The gym', 'University 🎓', 'In my dreams (also true)'],
      answer: 2,
    },
    {
      q: 'What did I do the first time you got in my car?',
      options: ['Drove super fast', 'Took you for a drive and played a song 🎶', 'Got lost', 'Talked the whole time'],
      answer: 1,
    },
    {
      q: 'Finish our inside joke: "Talk ___"',
      options: ['Tok', 'Tak', 'Tik', 'Tuk'],
      answer: 2,
    },
    {
      q: 'What did you bake for me?',
      options: ['Brownies', 'Cinnamon buns 🤤', 'Pizza', 'A cake shaped like me'],
      answer: 1,
    },
    {
      q: 'What do we both ALWAYS want to do to each other?',
      options: ['Hug', 'Hit each other (jokingly 😤)', 'Cook for each other', 'Ignore each other'],
      answer: 1,
    },
    {
      q: 'What\'s our song?',
      options: ['IDK — PARTYNEXTDOOR 🎵', 'Some random TikTok sound', 'Happy Birthday', 'The Talk Tik remix'],
      answer: 0,
    },
  ],
  rightLines: ['Correct! You know me too well 😌', 'Yes!! Big brain AND beautiful.', 'صح! Obviously.', 'Nailed it, Shahuda 💅'],
  wrongLines: ['Wrong… but I\'ll allow it because you\'re cute.', 'Hmm. We\'re discussing this later 😤', 'غلط 😭 Love you anyway.'],

  // ── 💌 Secret Room ─ unlocked after all games ────────────────────────────
  finale: {
    photo: 'photos/finale.jpg',
    video: 'photos/us.mp4',             // leave '' to skip
    videoPoster: 'photos/us-poster.jpg',  // still frame shown before it plays
    gallery: [                          // the slideshow at the end (and Memory Lane's frames)
      'photos/cover.jpg',
      'photos/memory5.jpg',
      'photos/sunshine.jpg',
      'photos/memory6.jpg',
      'photos/paint.jpg',
      'photos/zipline.jpg',
      'photos/buns.jpg',
      'photos/scarf.jpg',
      'photos/gym.jpg',
      'photos/barca.jpg',
      'photos/memory4.jpg',
      'photos/memory1.jpg',
    ],
    letter: `I made this little world because the real one got so much better the day you got in my car at uni. I played a song, you sat next to me, and somehow that drive never really ended.

You paint like the colours owe you money. You made me cinnamon buns and I've been yours ever since. You go to the gym and come back stronger — which is honestly a problem, because you always want to hit me 😤 (and I always want to hit you back).

You make me laugh every single day. Talk Tik.

You're beautiful in a way photos never fully catch, but I keep trying anyway.

Thank you for being you. I love you — more than this game could ever say.

نحبك يا شهودة 💗`,
  },
};
