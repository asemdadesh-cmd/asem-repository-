// ─────────────────────────────────────────────────────────────────────────────
//  EDIT THIS FILE TO MAKE THE GAME YOURS.
//  Everything personal lives here: names, photos, quiz, jokes, the letter.
//  Photos go in /photos — any missing photo shows a cute placeholder instead,
//  so the game always works while you're still collecting pictures.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  herName: 'Habibti',          // her name or nickname
  myName: 'Me',                // your name (signs the letter)
  startDate: '2024-01-01',     // the day it all started (YYYY-MM-DD) — powers the day counter

  // Title screen photo of the two of you.
  coverPhoto: 'photos/cover.jpg',

  // Optional background music (mp3 in /photos or /music). Leave '' for none.
  music: '',

  // ── 🎨 The Studio ─ she paints the canvas and reveals this photo ──────────
  paint: {
    photo: 'photos/paint.jpg',
    reveal: 'Okay Picasso, that\'s the best thing you\'ve ever painted… wait, no, that\'s just us. Still counts.',
  },

  // ── 🍳 The Kitchen ─ catch the ingredients, dodge the nonsense ───────────
  kitchen: {
    dish: 'her famous pasta',           // the dish she makes best
    target: 12,                         // ingredients needed to finish
    good: ['🍅', '🧄', '🧅', '🌶️', '🧀', '🍝', '🫑', '🥚', '🧈', '🌿'],
    bad: ['🧦', '🐌', '🪳', '📱', '🧽'],
    badLines: [
      'That was a sock. Into the pasta. Bold choice.',
      'The snail is not an ingredient, chef.',
      'Gordon Ramsay just felt a disturbance.',
      'Was that my phone?? Why is my phone in the pot??',
      'A sponge. Al dente, at least.',
    ],
    win: 'Michelin star unlocked ⭐ Honestly your cooking is the main reason I\'m still alive.',
  },

  // ── 💪 The Gym ─ every rep unlocks a compliment ──────────────────────────
  gym: {
    photo: 'photos/gym.jpg',            // shown when she hits the final rep
    reps: 10,
    compliments: [
      'Rep 1: strongest woman I know.',
      'Rep 2: also the prettiest. Not a coincidence.',
      'Rep 3: your laugh is my favourite sound.',
      'Rep 4: you make everything funnier.',
      'Rep 5: halfway! I\'m just your spotter. Mostly I\'m staring.',
      'Rep 6: you\'re talented, kind and dangerously cute.',
      'Rep 7: you make me want to be better.',
      'Rep 8: your paintings deserve a museum. So do you.',
      'Rep 9: I\'d still choose you on leg day.',
      'Rep 10: PR! Personal Record of how much I love you. 💗',
    ],
  },

  // ── 🧠 Memory Lane ─ match the pairs (6 photos) ──────────────────────────
  memory: [
    { photo: 'photos/memory1.jpg', caption: 'Hiding your face won\'t work. I already know it\'s cute.' },
    { photo: 'photos/paint.jpg', caption: 'This look should be illegal 😮‍💨' },
    { photo: 'photos/cover.jpg', caption: 'Best pillow in the world. Not taking questions.' },
    { photo: 'photos/memory4.jpg', caption: 'Outfit check: 10/10, as always' },
    { photo: 'photos/memory5.jpg', caption: 'Me, looking at you like that. Every time.' },
    { photo: 'photos/memory6.jpg', caption: 'My favourite hand to hold 🤍' },
  ],

  // ── ❓ The Quiz ─ "How well do you know us?" ─────────────────────────────
  // `answer` is the index of the correct option (0-based).
  quiz: [
    {
      q: 'Where did we first meet?',
      options: ['At a café', 'Through friends', 'Online', 'Destiny, obviously'],
      answer: 3,
    },
    {
      q: 'What\'s my favourite thing you cook?',
      options: ['Pasta', 'Everything', 'Whatever you\'re making right now', 'Yes'],
      answer: 1,
    },
    {
      q: 'Who is funnier?',
      options: ['You', 'Me', 'You, but I laugh first'],
      answer: 0,
    },
    {
      q: 'What do I think when you come back from the gym?',
      options: ['"Wow."', '"WOW."', '"Please don\'t hit me, I love you"', 'All of the above'],
      answer: 3,
    },
  ],
  rightLines: ['Correct! You know me too well 😌', 'Yes!! Big brain AND beautiful.', 'Nailed it. Obviously.'],
  wrongLines: ['Wrong… but I\'ll allow it because you\'re cute.', 'Hmm. We\'re discussing this at dinner.', 'Incorrect. Love you anyway.'],

  // ── 💌 Secret Room ─ unlocked after all games ────────────────────────────
  finale: {
    photo: 'photos/finale.jpg',
    video: 'photos/us.mp4',             // leave '' to skip
    videoPoster: 'photos/us-poster.jpg',  // still frame shown before it plays
    gallery: [                          // the slideshow at the end
      'photos/cover.jpg',
      'photos/memory6.jpg',
      'photos/paint.jpg',
      'photos/memory5.jpg',
      'photos/gym.jpg',
      'photos/memory4.jpg',
      'photos/memory1.jpg',
    ],
    letter: `I made this little world because the real one got so much better when you walked into it.

You paint like the colours owe you money. You cook like it's a love language — because for you, it is. You go to the gym and come back stronger, and somehow you already were the strongest person I know. And you make me laugh every single day, even when you're the one being ridiculous.

You're beautiful in a way photos never fully catch, but I keep trying anyway.

Thank you for being you. I love you — more than this game could ever say.`,
  },
};
