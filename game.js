/* ============================================================
   Math Genius – Game Logic
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const QUESTIONS_PER_ROUND = 20;
const TIME_PER_QUESTION   = 10;   // seconds (default; overridden by user settings)
const CIRCUMFERENCE       = 2 * Math.PI * 27; // r=27 → ≈169.6
const MAX_POINTS          = 10;
const MIN_POINTS          = 1;
const LIGHTNING_REF_SECS  = 5;    // reference seconds for max points in lightning mode
const TIMEOUT_ANSWER           = null; // sentinel value meaning no answer was given
const MAX_PLAYER_NAME_LENGTH   = 20;   // must match maxlength on #add-player-input in HTML
const NEWLY_UNLOCKED_TOAST_DELAY_MS = 400;

// ── Default user settings ─────────────────────────────────────
const DEFAULT_SETTINGS = {
  timerDuration:       TIME_PER_QUESTION, // seconds per question (5–30)
  maxNumber:           10,                // max operand for questions (2–12)
  allowDivision:       true,              // when false, division is replaced by multiplication
  lightningDuration:   60,               // seconds for entire lightning round (30–120)
  lightningPassCount:  20,               // correct answers needed to pass a lightning round (5–40)
};

// ── Characters ────────────────────────────────────────────────
const CHARACTERS = [
  {
    id: 'kiki',
    name: 'Kiki the Mad Scientist',
    emoji: '🔬',
    image: 'assets/images/kiki.png',
    description: 'A brilliant kangaroo scientist who loves wild experiments!',
  },
  {
    id: 'humphrey',
    name: 'Humphrey the Heffalump',
    emoji: '🐘',
    image: 'assets/images/humphrey.png',
    description: 'A friendly, strong heffalump who walks the neighborhood each morning with high-tech laser glasses!',
  },
  {
    id: 'fluffy',
    name: 'Fluffy',
    emoji: '🧸',
    image: 'assets/images/fluffy.png',
    description: 'A round, soft Tiger squish-mallow who hops down the street and accidentally bumps into everyone — but so gently everyone just giggles!',
  },
  {
    id: 'roo',
    name: 'Roo',
    emoji: '🦘',
    image: 'assets/images/roo.png',
    description: 'A kangaroo with a seemingly endless pouch and a special blanket called "Blanket" — perfect for lassoing things from a distance!',
  },
  {
    id: 'margret',
    name: 'Margret',
    emoji: '🐯',
    image: 'assets/images/margret.png',
    description: 'A tiger with a backyard swimming pool — mermaid friends visit through a magic portal that opens to any water large enough for them!',
  },
  {
    id: 'maggie',
    name: 'Maggie',
    emoji: '🥋',
    image: 'assets/images/maggie.png',
    description: 'A ninja/karate baby tiger who is abnormally strong for her size — karate kick a fence and it falls over, roundhouse kick a soccer ball and it goes crazy fast!',
  },
  {
    id: 'tigey_avinia',
    name: 'Tigey Avinia',
    emoji: '🐯',
    image: 'assets/images/tigey.png',
    description: 'A tiger who likes to pretend she knows French — she speaks in a French accent regardless. Très amusant! (Her French is completely made up.)',
  },
  {
    id: 'thumper',
    name: 'Thumper',
    emoji: '🐰',
    image: 'assets/images/thumper.png',
    description: 'A rabbit who lives in a hole near a tree — and the undisputed town trickster! When her pranks land she lets out a very distinctive kekekekeke!',
  },
  {
    id: 'tigey',
    name: 'Tigey',
    emoji: '🐯',
    image: 'assets/images/tigey.png',
    description: 'One of the neighborhood tiger friends and Tigey Avinia\'s sister. A warm and loyal friend to everyone on the street.',
  },
  {
    id: 'giri',
    name: 'Giri',
    emoji: '🦒',
    image: 'assets/images/giri.png',
    description: 'A giraffe chocolatier who runs the beloved chocolate shop at the end of the street — the highlight of Humphrey\'s morning walk!',
  },
  {
    id: 'vaporeon',
    name: 'Vaporeon',
    emoji: '💧',
    image: 'assets/images/vaporeon.png',
    description: 'A strong and kind Water Pokémon who can only say her own name — but shoots a powerful water cannon blast from her mouth! A very good friend of Margret and the Tigey\'s.',
  },
  {
    id: 'hermione',
    name: 'Hermione',
    emoji: '🦄',
    image: 'assets/images/IMG_8543.png',
    description: 'A magical unicorn who is quite pleasant to be around — and her magic always seems to arrive at just the right moment!',
  },
  {
    id: 'bermione',
    name: 'Bermione',
    emoji: '🦄',
    image: 'assets/images/IMG_8545.png',
    description: 'A reformed conqueror of Jupiter and Hermione\'s sister. She sometimes struggles with the temptation to become a villain again, but always does the right thing in the end — though she grumbles about it. Receives a magical daily sammich from a genie wish and takes very loud, proud bites.',
  },
  {
    id: 'lligen',
    name: 'Lligen',
    emoji: '🪨',
    image: null,
    description: 'A friendly rock giant from the volcano — small enough among her kind to visit parts of the neighborhood without causing too much disruption. She travels by leaping great distances, and her landings make the earth shake. She is endlessly fascinated by the tiny neighbourhood friends and their tiny neighbourhood things.',
  },
];

// ── Per-theme character order ─────────────────────────────────
// Each theme has its own ordered list of playable character IDs.
// Characters are shown and unlocked sequentially within that order.
const THEME_CHARACTERS = {
  // Chapter 1 – Friends: original street order
  1: ['kiki', 'humphrey', 'fluffy', 'roo', 'margret', 'maggie',
      'tigey_avinia', 'thumper', 'tigey', 'giri', 'vaporeon'],
  // Chapter 2 – The Neighbourhood: Giri out, Bermione in; minor shuffle
  2: ['kiki', 'humphrey', 'fluffy', 'roo', 'margret', 'thumper',
      'maggie', 'tigey_avinia', 'tigey', 'vaporeon', 'bermione'],
  // Villain Encounter – The Submarine: story-narrative order
  3: ['margret', 'tigey_avinia', 'vaporeon', 'humphrey', 'fluffy', 'bermione', 'roo'],
  // Chapter 3 – The Volcano: friends who visit + Lligen visiting the neighbourhood
  4: ['kiki', 'humphrey', 'maggie', 'fluffy', 'hermione', 'lligen'],
  // Villain Encounter – The Rock Monster: story-narrative order
  5: ['kiki', 'humphrey', 'maggie', 'fluffy', 'hermione'],
};

/** Returns the ordered array of character objects for the given theme. */
function getThemeCharacters(themeId) {
  const ids = THEME_CHARACTERS[themeId] || [];
  return ids.map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
}

// ── Story chapters ────────────────────────────────────────────
const CHAPTERS = [
  // ── Kiki ─────────────────────────────────────────────────────
  {
    id: 0,
    character: 'kiki',
    charIdx: 0,
    title: "Chapter 1: Shrink-a-tron Calibration",
    emoji: "🔬",
    story: "Kiki's Shrink-a-tron-5000 went haywire and shrank her entire toy collection to microscopic size! She needs to multiply the shrink factor by each toy's original size to restore them. Help Kiki solve 20 multiplication problems to rescue her toys!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 1,
    character: 'kiki',
    charIdx: 1,
    title: "Chapter 2: Gigant-a-tron Overflow",
    emoji: "🐟",
    story: "Uh oh! The Gigant-a-tron-3000 made Kiki's goldfish WAY too big — it's now splashing around the whole living room! Kiki needs division to calculate exactly how much Anti-Grow Formula to use. Help her solve 20 division problems!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 2,
    character: 'kiki',
    charIdx: 2,
    title: "Chapter 3: Rainbow Bubble Portal",
    emoji: "🫧",
    story: "Kiki discovered that mixing Shrink and Gigant formulas creates rainbow bubbles that can teleport objects! But the bubble formula needs precise mixed calculations to stay stable. Help Kiki solve 20 problems to open the portal!",
    mode: "both",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 3,
    character: 'kiki',
    charIdx: 3,
    title: "Chapter 4: Bermione's Missing Sammich",
    emoji: "🥪",
    story: "Kiki's Rainbow Bubble Portal accidentally zapped the sammich belonging to her neighbour Bermione — and Bermione is NOT happy about it. \"That was MY sammich!\" she fumes, crossing her arms. Kiki must use the portal's return calculations to bring the sammich back before Bermione gets any grumpier. Help Kiki solve 20 problems to rescue the sammich and restore the peace!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 4,
    character: 'kiki',
    charIdx: 4,
    title: "Chapter 5: The Grand Science Fair",
    emoji: "🏆",
    story: "It's the day of the BIG Science Fair! Kiki is presenting ALL her inventions — the Shrink-a-tron-5000, Gigant-a-tron-3000, and the Rainbow Bubble Portal. The judges need the final calculation worksheet. Help Kiki ace it and win the Golden Bunsen Burner Trophy!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Humphrey ─────────────────────────────────────────────────
  {
    id: 5,
    character: 'humphrey',
    charIdx: 0,
    title: "Chapter 1: Morning Walk Count",
    emoji: "🚶",
    story: "Humphrey starts every morning by walking down the street to visit his friends! He passes Roo, Lulu, Maggie and Margret, Tigey and Tigey Avinia — but to work out the best route he needs multiplication. Help Humphrey calculate how many steps he takes between each house and get his morning walk just right!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 6,
    character: 'humphrey',
    charIdx: 1,
    title: "Chapter 2: Laser Blast Budget",
    emoji: "🔭",
    story: "Humphrey's high-tech glasses from Kiki can fire exactly 3 powerful laser blasts a day — no more! After a busy week of adventures, Humphrey needs division to figure out how many blasts are left and how to share them wisely. Help Humphrey manage his laser budget before the glasses run dry!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 7,
    character: 'humphrey',
    charIdx: 2,
    title: "Chapter 3: Mom Heffalump's Recipe",
    emoji: "🍪",
    story: "Mom Heffalump is baking her famous giant chocolate cookies for the whole neighborhood! The recipe is written for one batch, but with so many friends to feed she needs to multiply every ingredient. Help Humphrey assist Mom Heffalump with the baking math before the first batch burns!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 8,
    character: 'humphrey',
    charIdx: 3,
    title: "Chapter 4: Hailey's Homework Help",
    emoji: "📚",
    story: "Humphrey's twin sister Hailey needs help with her math homework before their afternoon adventure. They've got multiplication AND division problems to solve — and Humphrey's laser glasses keep zooming in on the wrong page! Help Humphrey and Hailey power through the homework so the fun can begin!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 9,
    character: 'humphrey',
    charIdx: 4,
    title: "Chapter 5: The Grand Neighborhood Party",
    emoji: "🎉",
    story: "Humphrey is organising the biggest neighborhood party ever — with all his friends: Roo, Lulu, Margret, Maggie, Tigey, Tigey Avinia, Fluffy, Kiki, Hermione, and even Bermione (who showed up grumbling but secretly excited)! Help Humphrey calculate food, seats, and activities so everyone has the most amazing time!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Fluffy ───────────────────────────────────────────────────
  {
    id: 10,
    character: 'fluffy',
    charIdx: 0,
    title: "Chapter 1: Hop, Hop, Hooray!",
    emoji: "🌸",
    story: "Fluffy starts her day by hopping down the street, like she always does. Boing! Boing! Boing! But today she needs to calculate exactly how many hops it takes to reach each friend's house. Help Fluffy multiply her way through the morning — and watch out, she might accidentally bump into someone along the way!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 11,
    character: 'fluffy',
    charIdx: 1,
    title: "Chapter 2: The Accidental Bounce Parade",
    emoji: "😄",
    story: "Oops! Fluffy accidentally rolled into Kiki's lab and sent experiment bottles flying everywhere! Kiki needs division to re-sort all the bottles back onto the shelves. Luckily, because Fluffy is so soft and squishy, everyone just giggled. Help Fluffy and Kiki divide everything back into the right groups!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 12,
    character: 'fluffy',
    charIdx: 2,
    title: "Chapter 3: Squish-mallow Snack Share",
    emoji: "🍉",
    story: "Fluffy has a big bag of fruit snacks and wants to share them equally with all the neighborhood friends. She keeps losing count of how many friends there are — she bumped into a lamppost and got a little confused! Help Fluffy use multiplication to figure out exactly how many snacks to pack for everyone.",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 13,
    character: 'fluffy',
    charIdx: 3,
    title: "Chapter 4: The Bumper Giggle Game",
    emoji: "🎮",
    story: "Fluffy invented a brand-new game: bounce gently into a friend and make them giggle! (Fluffy is so soft and squishy it never hurts — it just tickles.) To keep score fairly she needs both multiplication and division. Help Fluffy track all the giggles and declare a winner!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 14,
    character: 'fluffy',
    charIdx: 4,
    title: "Chapter 5: Fluffy's Biggest Adventure",
    emoji: "🌟",
    story: "Fluffy is going on her biggest adventure yet — all the way to Giri's Chocolate Shop at the end of the street! She's so excited she keeps boing-ing off fences and accidentally bumping into signposts. Help Fluffy calculate distances, chocolate amounts, and make it to Giri's shop in one very soft, very giggly piece!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Roo ──────────────────────────────────────────────────────
  {
    id: 15,
    character: 'roo',
    charIdx: 0,
    title: "Chapter 1: Packing the Endless Pouch",
    emoji: "🎒",
    story: "Roo's pouch can hold a seemingly endless number of things — snacks, toys, her trusty Blanket, and backup supplies for the whole crew! Before heading out, she needs multiplication to figure out exactly how many items to pack. Help Roo fill her legendary pouch so every friend has what they need!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 16,
    character: 'roo',
    charIdx: 1,
    title: "Chapter 2: Blanket Lasso Training",
    emoji: "🤠",
    story: "Roo's special blanket — simply called \"Blanket\" — doubles as the best lasso in the neighborhood! To land it perfectly on a faraway target, Roo needs to divide the distance by her throwing strength. Help Roo practice her division skills so Blanket lands exactly on target every time!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 17,
    character: 'roo',
    charIdx: 2,
    title: "Chapter 3: Pouch Snack Supply",
    emoji: "🍎",
    story: "A big adventure day means a big snack day! Roo is packing backup food for the whole crew and needs multiplication to make sure there are enough snacks for everyone for every hour of the outing. Help Roo stock her pouch so no friend goes hungry — not even Bermione, who always wants an extra sammich!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 18,
    character: 'roo',
    charIdx: 3,
    title: "Chapter 4: The Big Jump Contest",
    emoji: "🏅",
    story: "Roo is competing in the Neighborhood Big Jump Contest! To calculate her best jump distances and see how she compares to the competition, she needs both multiplication and division. Help Roo leap to the top of the leaderboard and bring home the gold!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 19,
    character: 'roo',
    charIdx: 4,
    title: "Chapter 5: Roo's Rescue Mission",
    emoji: "🦸",
    story: "Bermione's magical daily sammich went too far when it appeared — it landed right in the deep end of Margret's swimming pool! Roo springs into action: pouch loaded, Blanket at the ready. She needs both multiplication and division to plan the perfect retrieval mission. Help Roo save the day (and Bermione's sammich)!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Margret ──────────────────────────────────────────────────
  {
    id: 20,
    character: 'margret',
    charIdx: 0,
    title: "Chapter 1: Pool Party Prep",
    emoji: "🏊",
    story: "Margret is getting her famous backyard swimming pool ready for a neighborhood get-together! She needs to calculate how many towels, pool floaties, and snacks to bring out for all her friends. Help Margret use multiplication to make sure everyone has exactly what they need for the best pool party ever!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 21,
    character: 'margret',
    charIdx: 1,
    title: "Chapter 2: Mermaid Visit!",
    emoji: "🧜",
    story: "Margret's mermaid friends are coming through their magical portal! The portal only connects to water large enough for the mermaids to fit, so Margret needs division to calculate how the pool space should be divided so every mermaid has plenty of room. Help Margret welcome her ocean friends to the neighborhood!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 22,
    character: 'margret',
    charIdx: 2,
    title: "Chapter 3: Portal Power Calculations",
    emoji: "🌀",
    story: "The mermaids are using their own magic to hold the portal open, but they need the numbers to be exactly right before they channel their power! Maggie the ninja baby keeps 'helping' by doing flips nearby, which is not helping. Help Margret use multiplication to calculate the precise figures the mermaids need so everyone crosses through safely!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 23,
    character: 'margret',
    charIdx: 3,
    title: "Chapter 4: The Big Swim Challenge",
    emoji: "🏆",
    story: "It's time for the Annual Backyard Swim Challenge! Margret is setting up races and relay teams for all the neighborhood friends. She needs both multiplication and division to build fair teams and calculate race distances. Help Margret make sure every swimmer — mermaid and land-friend alike — gets a fair shot at the trophy!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 24,
    character: 'margret',
    charIdx: 4,
    title: "Chapter 5: The Grand Pool Gala",
    emoji: "🎊",
    story: "It's the biggest event of the year — the Grand Pool Gala! The pool is packed with friends, mermaids have arrived through the portal, and even Bermione showed up (grumbling, but taking very loud bites of her sammich and secretly having a wonderful time). Giri brought chocolate treats from the shop. Help Margret calculate all the supplies and seating for the most magical evening the neighborhood has ever seen!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Maggie ───────────────────────────────────────────────────
  {
    id: 25,
    character: 'maggie',
    charIdx: 0,
    title: "Chapter 1: Fence Down!",
    emoji: "🥋",
    story: "Maggie was just warming up with a few ninja moves when — CRACK — her karate kick sent an entire fence panel flying! Now she needs multiplication to count the pieces and figure out how many are needed to fix it before Margret notices. Help Maggie work out the numbers before anyone sees!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 26,
    character: 'maggie',
    charIdx: 1,
    title: "Chapter 2: The Runaway Soccer Ball",
    emoji: "⚽",
    story: "Maggie roundhouse-kicked a soccer ball so hard it rocketed all the way down the street and bounced off Giri's chocolate shop window! She needs division to calculate how far it traveled and how many times it bounced so she can track down exactly where it ended up. Help Maggie solve the mystery of the very, very fast soccer ball!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 27,
    character: 'maggie',
    charIdx: 2,
    title: "Chapter 3: Ninja Training Day",
    emoji: "🌟",
    story: "Humphrey asked Maggie to teach him some ninja moves — bad idea! Every kick is sending things flying. Maggie needs multiplication to count the training moves, keep score, and tally up how many fences, flowerpots, and signposts are still standing. Help Maggie manage the ninja chaos!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 28,
    character: 'maggie',
    charIdx: 3,
    title: "Chapter 4: Super-Strength Mystery",
    emoji: "💥",
    story: "Everyone is amazed by Maggie's incredible strength — she is not sure how she does it either! Roo wants to run some tests, Kiki wants to measure the blast radius of her kicks, and Fluffy accidentally got in the way of a roundhouse kick and flew three houses down (she was fine — and giggled all the way). Help Maggie use multiplication and division to track her power stats!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 29,
    character: 'maggie',
    charIdx: 4,
    title: "Chapter 5: The Ultimate Ninja Course",
    emoji: "🏆",
    story: "The neighborhood has built an Ultimate Ninja Course for Maggie — complete with targets, fences to (safely!) kick, and super-speed soccer ball cannons. Maggie needs to calculate distances, timing, and scores to set the all-time neighborhood record. Help Maggie blaze through the course and prove she is the most surprisingly powerful tiny ninja in the street!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Tigey Avinia ─────────────────────────────────────────────
  {
    id: 30,
    character: 'tigey_avinia',
    charIdx: 0,
    title: "Chapter 1: Ooh La La, Math!",
    emoji: "🐯",
    story: "Tigey Avinia has decided today's math practice will be conducted entirely in French — her French. \"Ooh la la, we must multiply, non? C'est très mathematique!\" Nobody around her actually speaks French either, so everyone just nods along. Help Tigey Avinia work through the multiplication problems. Magnifique... probably!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 31,
    character: 'tigey_avinia',
    charIdx: 1,
    title: "Chapter 2: Zut Alors, Division!",
    emoji: "🥐",
    story: "\"Zut alors!\" cries Tigey Avinia — there are snacks to divide and she cannot figure out the numbers. She keeps announcing the answers in her best fake French accent before she has actually solved anything. Help Tigey Avinia get through the division problems so everyone can finally eat. (Her French is still completely made up.)",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 32,
    character: 'tigey_avinia',
    charIdx: 2,
    title: "Chapter 3: La Recette Mystérieuse",
    emoji: "👨‍🍳",
    story: "Tigey Avinia has written out a recipe — entirely in fake French. \"First, you take ze ingrediants and you multiply zem, oui?\" The other friends are not sure what any of it means but it smells amazing. Help Tigey Avinia multiply the ingredients so there is enough for the whole neighborhood. Très délicieux!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 33,
    character: 'tigey_avinia',
    charIdx: 3,
    title: "Chapter 4: Le Grand Trivia",
    emoji: "🎤",
    story: "It's Neighborhood Trivia Night and Tigey Avinia is convinced that answering every question in a French accent gives bonus points. (It does not.) Help her calculate scores using multiplication and division so she can claim victory — with flair. \"Et voilà, I am ze winner, non?\"",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 34,
    character: 'tigey_avinia',
    charIdx: 4,
    title: "Chapter 5: La Fête Fantastique",
    emoji: "🎉",
    story: "Tigey Avinia is throwing a French-themed party for the whole neighborhood — the decorations, the food, the music, all très français! (None of it is actually French, but everyone agrees it is very festive.) Help Tigey Avinia calculate food portions, decoration counts, and seating for the most fantastically fake-French party the street has ever seen!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Thumper ──────────────────────────────────────────────────
  {
    id: 35,
    character: 'thumper',
    charIdx: 0,
    title: "Chapter 1: Trap Setup — Kekekekeke!",
    emoji: "🐰",
    story: "Thumper has been busy near her hole by the tree, laying out her most elaborate prank yet! She needs multiplication to count exactly how many traps she has set up around the neighborhood before anyone comes walking by. Help Thumper get the numbers right — kekekekeke, this is going to be SO good!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 36,
    character: 'thumper',
    charIdx: 1,
    title: "Chapter 2: Humphrey Takes the Bait",
    emoji: "😂",
    story: "Humphrey walked right into Thumper's trap — bucket of confetti, spring-loaded rubber duck, the works! \"Kekekekeke!\" Now Thumper needs division to sort her prank supply stash back into groups so she can set up the next round. Help Thumper organise her trickster toolkit. (Humphrey is fine — just a bit confetti-covered.)",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 37,
    character: 'thumper',
    charIdx: 2,
    title: "Chapter 3: The Underground Tunnel Network",
    emoji: "🕳️",
    story: "Thumper's hole by the tree connects to a whole underground tunnel network — perfect for popping up in unexpected places and surprising (pranking) people! She needs multiplication to map out new tunnel segments. Help Thumper extend her network. Kekekekeke — no one will ever see her coming!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 38,
    character: 'thumper',
    charIdx: 3,
    title: "Chapter 4: Prank Championship Day",
    emoji: "🏅",
    story: "Thumper has declared it the First Annual Neighborhood Prank Championship! She needs both multiplication and division to plan the timing, count the participants, and make sure every prank runs like clockwork. Even Bermione reluctantly agreed to participate — and then grumbled when she got pranked. Kekekekeke!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 39,
    character: 'thumper',
    charIdx: 4,
    title: "Chapter 5: The Ultimate Prank Plot",
    emoji: "🎭",
    story: "The whole neighborhood has declared a \"Thumper-Proof Day\" — everyone is on high alert. But Thumper has been planning something truly epic from deep in her tunnel network. She needs multiplication and division to calculate the most perfectly timed, most elaborate prank the neighborhood has ever seen. Help Thumper pull off the ultimate trick. Kekekekeke — they'll never suspect a thing!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Tigey ────────────────────────────────────────────────────
  {
    id: 40,
    character: 'tigey',
    charIdx: 0,
    title: "Chapter 1: Morning on the Street",
    emoji: "🐯",
    story: "Tigey is heading out to visit all her friends on the street today! She needs multiplication to figure out how many steps it takes to reach each house and how many treats to bring along. Help Tigey calculate her morning plans so everyone gets a visit!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 41,
    character: 'tigey',
    charIdx: 1,
    title: "Chapter 2: Sharing Snacks Fairly",
    emoji: "🍎",
    story: "Tigey has a big basket of snacks to share with her friends — but there are so many friends and so many snacks she needs division to make sure everyone gets exactly the same amount. Help Tigey divide the snacks fairly so no one goes hungry!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 42,
    character: 'tigey',
    charIdx: 2,
    title: "Chapter 3: Baking Day with Tigey Avinia",
    emoji: "🍪",
    story: "Tigey and her sister Tigey Avinia are baking together! Tigey Avinia keeps announcing ingredient amounts in fake French, so Tigey has to do all the real multiplication herself to scale up the recipe for the whole neighborhood. Help Tigey get the numbers right before the oven gets too hot!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 43,
    character: 'tigey',
    charIdx: 3,
    title: "Chapter 4: Neighborhood Tea Party",
    emoji: "🫖",
    story: "Tigey is hosting a neighborhood tea party and needs both multiplication and division to calculate cups, biscuits, and seating for all her friends. Tigey Avinia has already declared the party \"très magnifique\" even though it hasn't started yet. Help Tigey get everything ready!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 44,
    character: 'tigey',
    charIdx: 4,
    title: "Chapter 5: The Grand Street Celebration",
    emoji: "🎉",
    story: "The whole street is throwing a grand celebration and Tigey is helping organise it! From Giri's chocolate treats at the dessert table to Vaporeon's water cannon keeping everyone cool, there is a lot to calculate. Help Tigey use multiplication and division to make sure the biggest party the street has ever seen goes perfectly!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Giri ─────────────────────────────────────────────────────
  {
    id: 45,
    character: 'giri',
    charIdx: 0,
    title: "Chapter 1: Stocking the Chocolate Shop",
    emoji: "🍫",
    story: "Giri's chocolate shop is running low! He needs multiplication to work out how many chocolate bars, truffles, and fudge squares to order before the morning rush. The whole neighborhood depends on Giri's shop — help him get the order numbers just right!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 46,
    character: 'giri',
    charIdx: 1,
    title: "Chapter 2: Treat Boxes for Everyone",
    emoji: "🎁",
    story: "Giri is putting together treat boxes for every friend on the street. He needs division to figure out how many chocolates go in each box so that every box has exactly the same amount. Help Giri divide the chocolates evenly so everyone gets the same delicious surprise!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 47,
    character: 'giri',
    charIdx: 2,
    title: "Chapter 3: The New Chocolate Recipe",
    emoji: "🧁",
    story: "Giri has invented a brand-new chocolate recipe and wants to make enough for the entire neighborhood! He needs multiplication to scale up every ingredient in the recipe. Even Bermione stopped by early to taste-test — and she gave a very enthusiastic \"Mmm!\" between bites. Help Giri multiply the recipe!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 48,
    character: 'giri',
    charIdx: 3,
    title: "Chapter 4: Busy Market Day",
    emoji: "🛒",
    story: "It's the busiest day at the chocolate shop yet! Friends are lined up all the way down the street. Giri needs both multiplication and division to track sales, restock shelves, and calculate change. Help Giri keep up with the rush so no one leaves without their chocolate fix!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 49,
    character: 'giri',
    charIdx: 4,
    title: "Chapter 5: The Grand Chocolate Festival",
    emoji: "🏆",
    story: "Giri is hosting the first-ever Grand Neighborhood Chocolate Festival! There are chocolate fountains, tasting stations, and gift bags for every guest. Fluffy accidentally bumped into a chocolate fountain (she is fine — and delicious), and Maggie roundhouse-kicked a truffle tower across the street. Help Giri calculate everything needed to make the festival a sweet success!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },
  // ── Vaporeon ─────────────────────────────────────────────────
  {
    id: 50,
    character: 'vaporeon',
    charIdx: 0,
    title: "Chapter 1: Water Cannon Practice",
    emoji: "💧",
    story: "Vaporeon! Vaporeon is out practicing her water cannon blast this morning — she can shoot an incredibly powerful jet of water from her mouth! She needs multiplication to calculate how many practice shots she can do before she needs a rest. Help Vaporeon train and track her water cannon power!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 51,
    character: 'vaporeon',
    charIdx: 1,
    title: "Chapter 2: Cooling Down the Neighborhood",
    emoji: "🌊",
    story: "It's a hot day and Vaporeon is using her water cannon to cool everyone down! She needs division to figure out how many water bursts each friend needs so everyone stays perfectly comfortable. Vaporeon! Help Vaporeon share the cool water fairly across the whole street!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 52,
    character: 'vaporeon',
    charIdx: 2,
    title: "Chapter 3: Pool Day with Margret",
    emoji: "🏊",
    story: "Vaporeon and Margret are setting up the ultimate pool day! Vaporeon uses her water cannon to fill the pool faster than ever — Vaporeon! — but she needs multiplication to calculate how many blasts it will take. Help Vaporeon and Margret get the pool perfectly ready for all their friends!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 53,
    character: 'vaporeon',
    charIdx: 3,
    title: "Chapter 4: Water Games Championship",
    emoji: "🎮",
    story: "Vaporeon is hosting the Neighborhood Water Games! She needs both multiplication and division to set up the relay races, water balloon counts, and team scores. Tigey and Tigey Avinia both signed up — Tigey Avinia announced her team name in fake French. Vaporeon! Help Vaporeon calculate scores for a fair and splashing championship!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 54,
    character: 'vaporeon',
    charIdx: 4,
    title: "Chapter 5: Vaporeon's Big Splash Finale",
    emoji: "🌟",
    story: "The whole neighborhood has gathered for Vaporeon's greatest performance yet — the Big Splash Finale! She's going to launch the most spectacular water cannon display anyone has ever seen. Margret, Tigey, Giri (who brought chocolate-dipped everything), and all the friends are watching. Vaporeon! Help Vaporeon calculate the perfect finale using multiplication and division — it's going to be amazing!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ════════════════════════════════════════════════════════════
  // CHAPTER 2: THE NEIGHBOURHOOD
  // Stories set in the neighbourhood locations described in
  // LOCATIONS.md. charIdx 5–9 for each character.
  // ════════════════════════════════════════════════════════════

  // ── Kiki ─────────────────────────────────────────────────────
  {
    id: 55,
    character: 'kiki',
    charIdx: 5,
    title: "Chapter 1: Restock the Ice Cream Hill",
    emoji: "🍨",
    story: "The Ice Cream Sledding Hill is running out of ice cream — kids are arriving with their sleds but there's barely enough to slide on! Kiki needs multiplication to calculate how many gallons of each flavour to pump up to the hill so it stays topped up all day. Help Kiki solve 20 multiplication problems to save sledding day!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 56,
    character: 'kiki',
    charIdx: 6,
    title: "Chapter 2: Cheese Tree Forest Harvest",
    emoji: "🧀",
    story: "The Cheese Trees are dropping their branches and it's harvest time! Kiki needs division to figure out how many cheese branches to share with each family and how much to sell at the supermarket to fund her next experiment. Vaporeon is watering the trees — Vaporeon! Help Kiki divide the harvest fairly across the neighbourhood!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 57,
    character: 'kiki',
    charIdx: 7,
    title: "Chapter 3: Hot Chocolate Spring Morning",
    emoji: "☕",
    story: "The Hot Chocolate Spring is busier than ever — half the neighbourhood has turned up with mugs, thermoses, and even buckets! Kiki needs multiplication to calculate how many servings the spring can provide. Bermione is nearby taking loud bites of her sammich between sips. Help Kiki manage the morning hot chocolate rush!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 58,
    character: 'kiki',
    charIdx: 8,
    title: "Chapter 4: The Donut River Dilemma",
    emoji: "🍩",
    story: "The Donut River is flowing too fast today — and Lego Humphrey, a rogue Lego experiment that escaped from Kiki's lab, is riding the donuts and reshaping itself into a donut-blocking dam just to cause chaos! Kiki needs both multiplication and division to calculate the river's speed and figure out how to recapture Lego Humphrey before anyone gets carried all the way to the volcano. Help Kiki tame the donut current and stop the rogue brick creature!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
    lightning: true,
  },
  {
    id: 59,
    character: 'kiki',
    charIdx: 9,
    title: "Chapter 5: The Underground Laboratory",
    emoji: "🔭",
    story: "Kiki is testing all 10 basement levels of her laboratory today — and Humphrey, Roo, and Fluffy insisted on coming along for the elevator ride! Each level has a different experiment. Kiki needs both multiplication and division to record data from every floor before the escalator breaks down again. Help Kiki catalogue all her underground experiments!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Humphrey ─────────────────────────────────────────────────
  {
    id: 60,
    character: 'humphrey',
    charIdx: 5,
    title: "Chapter 1: The Ice Cream Hill Detour",
    emoji: "🛷",
    story: "On his morning walk, Humphrey spotted the Ice Cream Sledding Hill — and the whole street was there! The sled queue is so long that Humphrey needs multiplication to figure out how many turns each friend gets and how many scoops were eaten. Maggie shot a snowball so fast it bounced off three fences. Help Humphrey manage the hill schedule!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 61,
    character: 'humphrey',
    charIdx: 6,
    title: "Chapter 2: Through the Lake",
    emoji: "🏖️",
    story: "It's a hot afternoon and Humphrey is running through the lake along the bottom with just his trunk above the water to breathe! He and Hailey are planning a sandcastle fort the size of a real house. Humphrey needs division to calculate how many buckets of sand they need and how long it will take. Help Humphrey plan the greatest sandcastle the neighbourhood has ever seen!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 62,
    character: 'humphrey',
    charIdx: 7,
    title: "Chapter 3: Giri's Chocolate Shop Sprint",
    emoji: "🍫",
    story: "It's the end of Humphrey's morning walk and Giri's Chocolate Shop is just ahead! Today Giri has a new batch of his famous chocolate treats, and Humphrey needs multiplication to help calculate how many of each treat to pack for the whole neighbourhood. Even Bermione showed up early — for the chocolate, obviously. Help Humphrey and Giri sort out the orders!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 63,
    character: 'humphrey',
    charIdx: 8,
    title: "Chapter 4: Donut River Adventure",
    emoji: "🍩",
    story: "On their afternoon adventure, Humphrey and Hailey discovered the Donut River flowing faster than usual — and Bowser's enormous airship was hovering overhead, scooping donuts up with a giant claw! Hailey jumped on a giant donut before Humphrey could stop her. Humphrey needs multiplication and division to calculate the river's speed, outwit Bowser's donut heist, and reunite with Hailey before the donuts reach the volcanic prairie. Help Humphrey navigate the donut current and foil Bowser's plan!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
    lightning: true,
  },
  {
    id: 64,
    character: 'humphrey',
    charIdx: 9,
    title: "Chapter 5: Neighbourhood Grand Tour",
    emoji: "🗺️",
    story: "Humphrey is giving new neighbour Lilli (Giri's niece — a kid giraffe who runs the sandwich shop in Kiki's lab) a grand tour of the neighbourhood! They visit the Ice Cream Hill, the Cheese Tree Forest, the Hot Chocolate Spring, and Margret's pool — all in one afternoon. Help Humphrey calculate distances and timings to fit everything in!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Fluffy ───────────────────────────────────────────────────
  {
    id: 65,
    character: 'fluffy',
    charIdx: 5,
    title: "Chapter 1: Sled-Bump Bonanza!",
    emoji: "🛷",
    story: "Fluffy is at the Ice Cream Sledding Hill — Boing! Boing! Boing! She needs multiplication to count the sleds, the flavours of ice cream, and how many bumps she can do before the hill needs restocking. She accidentally bounced into the sled line and sent five sleds flying — everyone just laughed and got covered in ice cream. Help Fluffy calculate the sled count!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 66,
    character: 'fluffy',
    charIdx: 6,
    title: "Chapter 2: Cheese Tree Bumps",
    emoji: "🧀",
    story: "Fluffy hopped into the Cheese Tree Forest and bumped into a cheese stick tree — and a cascade of cheese branches rained down! Kiki needs division to sort all the fallen branches into equal bundles for each neighbour. Fluffy keeps trying to help but keeps accidentally bumping more branches loose. Help Fluffy and Kiki divide up all that delicious cheese!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 67,
    character: 'fluffy',
    charIdx: 7,
    title: "Chapter 3: Bounce Bonanza at Margret's Pool",
    emoji: "🏊",
    story: "Fluffy has discovered that Margret's pool inflatables make the perfect bounce course — from the giant flamingo to the rubber ring to the pool noodle bridge and back! She needs multiplication to work out how many bounce sequences she can fit into each visit and how many friends can join without capsizing the flamingo. Margret is supervising very closely. Help Fluffy multiply the pool bounces!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 68,
    character: 'fluffy',
    charIdx: 8,
    title: "Chapter 4: Donut River Ride",
    emoji: "🍩",
    story: "Fluffy jumped onto a donut in the Donut River and immediately went zooming downstream — Boing! BOING! She is soft and bouncy enough to ride without getting hurt, but she is a very long way from home. Humphrey is using multiplication and division to calculate how fast she is going and how to intercept her before she reaches the prairie. Help rescue a very giggly Fluffy!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 69,
    character: 'fluffy',
    charIdx: 9,
    title: "Chapter 5: The Neighbourhood Great Day Out",
    emoji: "🌟",
    story: "Fluffy is having the best day ever — she bounced through the Cheese Forest, slid down the Ice Cream Hill, and scooped hot chocolate at the spring! Now she is helping Margret set up chairs for a neighbourhood gathering and needs multiplication and division to count the chairs, snacks, and how many times she has accidentally bumped into something today. Help Fluffy wrap up the most wonderfully bumpy day!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Roo ──────────────────────────────────────────────────────
  {
    id: 70,
    character: 'roo',
    charIdx: 5,
    title: "Chapter 1: Supplies for the Hot Chocolate Spring",
    emoji: "☕",
    story: "Roo is packing her legendary pouch with everything the friends need for a morning at the Hot Chocolate Spring — mugs, sugar, marshmallows, and Blanket (just in case). She needs multiplication to figure out how many supplies to bring for the whole group. Bermione showed up uninvited but Roo had packed extra just in case (she always does). Help Roo calculate the hot chocolate supplies!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 71,
    character: 'roo',
    charIdx: 6,
    title: "Chapter 2: Sandcastle Fort at the Lake",
    emoji: "🏖️",
    story: "Roo and Humphrey are building an enormous sandcastle fort at the lake — as big as a real house! Roo needs division to calculate how to divide the sand between the different towers and walls. She uses Blanket as a measuring rope to mark out each section. Help Roo design and build the ultimate neighbourhood sandcastle!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 72,
    character: 'roo',
    charIdx: 7,
    title: "Chapter 3: Cheese Tree Harvest Help",
    emoji: "🧀",
    story: "The Cheese Tree Forest branches are falling and Roo is using Blanket as a basket to carry them back to share with the neighbourhood! She needs multiplication to count how many branches fit per trip and how many journeys she needs to make. Fluffy is bouncing around in the trees above her, making branches fall faster. Help Roo collect the cheese harvest!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 73,
    character: 'roo',
    charIdx: 8,
    title: "Chapter 4: Donut River Rescue",
    emoji: "🍩",
    story: "A huge batch of runaway donuts is flowing down the Donut River way too fast — and Kiki's favourite equipment is sitting right in the river's path! Roo springs into action: she lassos the equipment with Blanket and pulls it clear. She needs multiplication and division to calculate how many donuts to redirect and how fast she needs to move. Help Roo save Kiki's gear!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 74,
    character: 'roo',
    charIdx: 9,
    title: "Chapter 5: Peggy the Pegasus Patrol",
    emoji: "🦄",
    story: "Peggy the Pegasus is patrolling the neighbourhood today and has asked Roo to help count all the friends at each location — the Hot Chocolate Spring, the Ice Cream Hill, the lake, and Margret's pool. Roo needs multiplication and division to calculate patrol routes and response times. Help Roo and Peggy keep the whole neighbourhood safe!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Margret ──────────────────────────────────────────────────
  {
    id: 75,
    character: 'margret',
    charIdx: 5,
    title: "Chapter 1: Pool Meets Hot Chocolate",
    emoji: "☕",
    story: "Margret is connecting her backyard pool to a supply line from the Hot Chocolate Spring for a special Hot Chocolate Pool Party! She needs multiplication to calculate how many gallons flow through the pipe and how long it will take to fill the pool. Fluffy has already fallen in — she is fine and very chocolatey now. Help Margret calculate the fill rate!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 76,
    character: 'margret',
    charIdx: 6,
    title: "Chapter 2: Mermaid Lake Day",
    emoji: "🌊",
    story: "Margret's mermaid friends are visiting through the magical portal — this time they want to explore the neighbourhood lake! Margret needs division to calculate how to divide the lake space so mermaids and land friends can enjoy it at the same time. Humphrey chose this moment to do his underwater run. Help Margret organise the lake day!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 77,
    character: 'margret',
    charIdx: 7,
    title: "Chapter 3: Ice Cream Hill Pool Party",
    emoji: "🍨",
    story: "Margret got an ice cream delivery from the Ice Cream Sledding Hill — now the pool is filled with ice cream for the afternoon! She needs multiplication to calculate how many scoops fit in the pool, how many friends can swim, and how much warm water to add so nobody freezes. Vaporeon is keeping it stirred with gentle blasts. Help Margret run the world's most delicious pool party!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 78,
    character: 'margret',
    charIdx: 8,
    title: "Chapter 4: Cheese Tree Decorations",
    emoji: "🧀",
    story: "Margret is decorating the pool area with fallen Cheese Tree branches for the Grand Pool Gala — cheesy AND beautiful! She needs multiplication and division to figure out how many branches to place, how to divide them evenly around the fence, and how many extras Kiki quietly took for her lab. Help Margret create the cheesiest pool décor the neighbourhood has ever seen!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 79,
    character: 'margret',
    charIdx: 9,
    title: "Chapter 5: Donut River Boat Party",
    emoji: "🍩",
    story: "Margret spotted that the giant donuts in the Donut River are big enough to sit on — so she organised a Donut River Boat Party! She needs multiplication and division to calculate how many friends can ride at once, how long each trip lasts before reaching the prairie, and how to split into fair teams. Bermione refused to get on a donut but sat on the bank eating her sammich very loudly. Help Margret plan the most delicious boat party!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Maggie ───────────────────────────────────────────────────
  {
    id: 80,
    character: 'maggie',
    charIdx: 5,
    title: "Chapter 1: Donut Kick!",
    emoji: "🍩",
    story: "Maggie roundhouse-kicked a donut clean out of the Donut River — it flew through the air and landed three streets over! Now she needs multiplication to count how many donuts were displaced, how far each traveled, and how many apologies she needs to deliver. The donuts were fine. Several neighbours got a free breakfast. Help Maggie calculate the donut damage!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 81,
    character: 'maggie',
    charIdx: 6,
    title: "Chapter 2: The Ice Cream Hill Speed Record",
    emoji: "🛷",
    story: "Maggie karate-kicked herself onto a sled at the Ice Cream Sledding Hill and set the all-time speed record — then rocketed off the end of the hill and into the Cheese Tree Forest! She needs division to calculate how far she went, how many cheese branches she knocked down, and how much of the hill needs to be repacked. Help Maggie figure out the stickiest math problem ever!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 82,
    character: 'maggie',
    charIdx: 7,
    title: "Chapter 3: Cheese Tree Kickathon",
    emoji: "🧀",
    story: "Maggie has decided the Cheese Tree Forest is the perfect ninja training ground! Every kick sends a cheese stick branch flying — and Kiki is frantically collecting them all. Maggie needs multiplication to count how many kicks she did, how many branches flew, and how many ended up in Kiki's cart vs in people's gardens. Help Maggie track her cheese stick kickathon performance!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 83,
    character: 'maggie',
    charIdx: 8,
    title: "Chapter 4: Protecting the Pine Tree Forest",
    emoji: "🌲",
    story: "Lego Humphrey — a rogue Lego experiment escaped from Kiki's lab — is tunnelling around Mrs. Spruce's Pine Tree Forest, reshaping itself into a battering ram to knock trees over! Mrs. Spruce (who is alive and very worried) called on Maggie to stop it. The tricky part: if Maggie kicks it apart, it just reassembles itself. Maggie needs multiplication and division to calculate patrol routes and the precise kick force to scatter the pieces far enough to buy time. Help Maggie defend the pine forest from the indestructible brick menace!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
    lightning: true,
  },
  {
    id: 84,
    character: 'maggie',
    charIdx: 9,
    title: "Chapter 5: Peggy Calls for Backup",
    emoji: "🦄",
    story: "Peggy the Pegasus spotted trouble near the Donut River — it is overflowing and sending donuts into Roo's yard! Peggy called on Maggie, who arrived with an enthusiastic flying kick that accidentally redirected three donut flows at once. Maggie needs multiplication and division to restore the river's normal path before the whole street floods with pastry. Help Maggie save the neighbourhood from a donut disaster!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Tigey Avinia ─────────────────────────────────────────────
  {
    id: 85,
    character: 'tigey_avinia',
    charIdx: 5,
    title: "Chapter 1: Le Café du Chocolat Chaud",
    emoji: "☕",
    story: "Tigey Avinia has set up a pretend French café next to the Hot Chocolate Spring! 'Bienvenue! Ze hot chocolate, it is magnifique, non?' She needs multiplication to count the cups served and tally the totally made-up Francs she is charging. (The currency is not real. Neither is the accent.) Help Tigey Avinia run Le Café du Chocolat Chaud!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 86,
    character: 'tigey_avinia',
    charIdx: 6,
    title: "Chapter 2: Ze Fromage Fantastique",
    emoji: "🧀",
    story: "Tigey Avinia has declared the Cheese Tree Forest a 'national treasure of France' — a France that exists only in her imagination. She is leading tours and charging visitors in entirely made-up French Francs. She needs division to split the 'revenue' equally among the tour group. Help Tigey Avinia run the most enthusiastically fake-French cheese forest tour!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 87,
    character: 'tigey_avinia',
    charIdx: 7,
    title: "Chapter 3: La Piste de Ski",
    emoji: "🛷",
    story: "Tigey Avinia has renamed the Ice Cream Sledding Hill 'La Grande Piste de Ski' and is insisting everyone use proper 'French ski technique'. ('You must lean, like zis! Ooh la la!') She needs multiplication to count the runs, calculate the ice cream consumed, and track everyone's 'French ski scores'. Help Tigey Avinia organise the most fantastically fake-French sledding competition!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 88,
    character: 'tigey_avinia',
    charIdx: 8,
    title: "Chapter 4: La Rivière des Beignets",
    emoji: "🍩",
    story: "Tigey Avinia has discovered the Donut River and is convinced it is a 'classic French patisserie river'. 'Ah oui, in France we have zis everywhere, non?' She wants to organise a Donut River cruise and needs multiplication and division to calculate how many donut-boats the group needs and how long the trip takes. Help Tigey Avinia host the most classically fake-French donut cruise!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 89,
    character: 'tigey_avinia',
    charIdx: 9,
    title: "Chapter 5: La Grande Carte du Quartier",
    emoji: "🗺️",
    story: "Tigey Avinia is drawing a grand map of 'her neighbourhood in France' — the Hot Chocolate Spring, the Cheese Tree Forest, La Grande Piste de Ski, La Rivière des Beignets, and her totally imaginary French café. She needs multiplication and division to calculate distances and label everything in 'French'. Help Tigey Avinia complete her magnifique cartographic masterpiece!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Thumper ──────────────────────────────────────────────────
  {
    id: 90,
    character: 'thumper',
    charIdx: 5,
    title: "Chapter 1: Tunnel Network Expansion",
    emoji: "🕳️",
    story: "Thumper is digging new tunnel branches — one running under the Hot Chocolate Spring (perfect for popping up and scaring people!) and another under the Cheese Tree Forest. She needs multiplication to calculate how long each tunnel will take to dig and how many materials she needs. Kekekekeke — nobody will ever see her coming through their morning hot chocolate!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 91,
    character: 'thumper',
    charIdx: 6,
    title: "Chapter 2: The Ice Cream Hill Prank",
    emoji: "🛷",
    story: "Thumper has rigged a prank on the Ice Cream Sledding Hill — a tripwire that sends a load of whipped cream flying at whoever reaches the top! She needs division to split her prank supplies evenly across three different trip wires so every sled rider gets a surprise. Kekekekeke! Help Thumper calculate the perfect prank distribution!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 92,
    character: 'thumper',
    charIdx: 7,
    title: "Chapter 3: Cheese Tree Camouflage",
    emoji: "🧀",
    story: "Thumper discovered that sitting still among the Cheese Tree Forest branches makes her almost perfectly camouflaged — she smells like cheese and blends right in! She needs multiplication to count how many branches to collect and build her ultimate hiding spot. Roo actually sat on her by mistake. Kekekekeke! Help Thumper build the perfect cheese camouflage!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 93,
    character: 'thumper',
    charIdx: 8,
    title: "Chapter 4: Donut River Relay Prank",
    emoji: "🍩",
    story: "Thumper has set up a chain of prank activators along the Donut River — when a donut bumps a tripwire, a bucket of confetti drops on whoever is standing nearby. She needs both multiplication and division to calculate the timing and spacing. Humphrey was the first victim. KEKEKEKEKE! Help Thumper perfect the relay prank timing!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 94,
    character: 'thumper',
    charIdx: 9,
    title: "Chapter 5: The Ultimate Neighbourhood Prank",
    emoji: "🎭",
    story: "Thumper's tunnels now run under the Ice Cream Hill, the Cheese Forest, and the Donut River. She can pop up ANYWHERE. The plan: a perfect simultaneous prank at every location at the same moment. But then — BOOM — Bowser's airship appears overhead, blotting out the sun and announcing his plan to conquer the town. Thumper decides the prank ALSO hits Bowser's crew as they descend the landing ramp. She needs multiplication and division to calculate the timing. KEKEKEKEKE! Help Thumper pull off the most legendary prank — and neighbourhood defence — in history!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
    lightning: true,
  },

  // ── Tigey ────────────────────────────────────────────────────
  {
    id: 95,
    character: 'tigey',
    charIdx: 5,
    title: "Chapter 1: Neighbourhood Walk with Tigey",
    emoji: "🌸",
    story: "Tigey is setting out on a long walk of the neighbourhood today — past the Hot Chocolate Spring, through the Cheese Tree Forest, and all the way to Giri's Chocolate Shop! She needs multiplication to calculate how many steps between each stop and how many friends she will meet along the way. Help Tigey plan the perfect neighbourhood morning walk!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 96,
    character: 'tigey',
    charIdx: 6,
    title: "Chapter 2: Hot Chocolate Spring Sharing",
    emoji: "☕",
    story: "Tigey has brought a big batch of mugs to the Hot Chocolate Spring so everyone can share a morning cup together! She needs division to make sure every friend gets exactly the same serving — Bermione wants double, but Tigey is being fair. Help Tigey divide the hot chocolate so everyone gets an equal and delicious share!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 97,
    character: 'tigey',
    charIdx: 7,
    title: "Chapter 3: Ice Cream Sledding Day",
    emoji: "🛷",
    story: "Tigey and Tigey Avinia are at the Ice Cream Sledding Hill together — Tigey Avinia keeps calling it 'La Piste de Ski' and pretending to speak French, while Tigey focuses on actually sledding. Tigey needs multiplication to count the sled runs, calculate ice cream consumed, and keep the scoreboard. Help Tigey run the real numbers on sledding day!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 98,
    character: 'tigey',
    charIdx: 8,
    title: "Chapter 4: Sandcastle Fort at the Lake",
    emoji: "🏖️",
    story: "Tigey and Vaporeon are building a sandcastle fort at the lake! Vaporeon uses her water cannon to shape the walls — Vaporeon! — while Tigey does the mathematical planning. She needs multiplication and division to calculate how much sand goes in each section and how many towers the fort needs. Help Tigey design the greatest sandcastle fort the neighbourhood has ever seen!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 99,
    character: 'tigey',
    charIdx: 9,
    title: "Chapter 5: Tigey's Neighbourhood Street Festival",
    emoji: "🎪",
    story: "Tigey is organising the neighbourhood's first-ever Street Festival — with game stalls, snack tables, and a grand parade down the main street! She needs multiplication and division to allocate space for each stall, calculate how many treats to prepare for every attendee, and arrange the parade lineup. Everyone has signed up and Bermione has claimed three stall spots (one is definitely just for her sammich). Help Tigey plan the most spectacular street festival the neighbourhood has ever seen!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Bermione ──────────────────────────────────────────────────
  {
    id: 100,
    character: 'bermione',
    charIdx: 5,
    title: "Chapter 1: Bermione and the Hot Chocolate Spring",
    emoji: "☕",
    story: "Bermione has discovered that the Hot Chocolate Spring is the perfect place to enjoy her daily sammich — extra warm, extra cosy, extra delicious. She needs multiplication to calculate exactly how many mugs of hot chocolate she can have alongside each magnificent sammich bite. Help Bermione calculate her perfect morning at the spring!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 101,
    character: 'bermione',
    charIdx: 6,
    title: "Chapter 2: Bermione and the Lake Sandcastle Showdown",
    emoji: "🏖️",
    story: "Bermione has arrived at The Lake and declared herself the official organiser of the neighbourhood's first-ever sandcastle competition. She needs division to split the shoreline into equal building plots so every competitor gets a fair section — and hers is absolutely not in the prime spot (she measured very carefully). Help Bermione divide up the shoreline and crown a sandcastle champion!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 102,
    character: 'bermione',
    charIdx: 7,
    title: "Chapter 3: The Ice Cream Hill Expedition",
    emoji: "🛷",
    story: "Bermione has decided to sled the Ice Cream Hill — partly because Hermione said it would be fun, and partly because she spotted that the sled landing puts you right next to where her sammich tends to appear each morning. She needs multiplication to calculate the timing and make sure every run is as efficient as possible. Help Bermione plan the perfect sledding expedition!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 103,
    character: 'bermione',
    charIdx: 8,
    title: "Chapter 4: The Donut River Floatilla",
    emoji: "🍩",
    story: "Bermione has commandeered a giant donut from the Donut River as a floating sammich-eating platform — and everyone agrees it is actually genius. She needs multiplication and division to calculate how long she can float, how many friends can join, and how to navigate back to shore. Hermione is paddling alongside on her own donut, offering encouragement. Help Bermione run the most magnificent donut floatilla!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 104,
    character: 'bermione',
    charIdx: 9,
    title: "Chapter 5: The Grand Neighbourhood Welcome",
    emoji: "🏆",
    story: "Hermione talked Bermione into hosting a Grand Neighbourhood Welcome for all the street's residents — a celebration of community, friendship, and one or two spectacular sammich moments. Bermione grumbled through every planning meeting but secretly put in enormous effort. She needs multiplication and division to organise every detail. Help Bermione (and her hidden heart of gold) pull off the greatest neighbourhood welcome ever!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Vaporeon ─────────────────────────────────────────────────
  {
    id: 105,
    character: 'vaporeon',
    charIdx: 5,
    title: "Chapter 1: Lake Water Cannon Workout",
    emoji: "🌊",
    story: "Vaporeon is training her water cannon at the lake this morning — Vaporeon! She practices shooting at targets across the water, with Humphrey helpfully providing things to aim at from the other bank. She needs multiplication to calculate how many blast sequences to complete and how much water she uses per workout. Help Vaporeon train for peak water cannon performance!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 106,
    character: 'vaporeon',
    charIdx: 6,
    title: "Chapter 2: Donut River Direction",
    emoji: "🍩",
    story: "The Donut River is flowing too close to Mrs. Spruce's Pine Tree Forest and the trees are getting soggy! Vaporeon offers to redirect the flow using her water cannon — Vaporeon! — but she needs division to calculate how many blasts are needed at each redirection point. Help Vaporeon calculate her water cannon plan to save Mrs. Spruce's trees!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 107,
    character: 'vaporeon',
    charIdx: 7,
    title: "Chapter 3: Hot Chocolate Spring Temperature",
    emoji: "☕",
    story: "Kiki's Hot Chocolate Spring is running a bit cool today and Vaporeon is the only one who can help — she can fire precise warm water blasts to keep the temperature just right! She needs multiplication to calculate exactly how many water bursts are needed. Bermione is watching from the side, holding her mug, very opinionated. Help Vaporeon heat up the hot chocolate spring!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 108,
    character: 'vaporeon',
    charIdx: 8,
    title: "Chapter 4: Neighbourhood Water Festival",
    emoji: "🎉",
    story: "It's the hottest day of the year and Vaporeon has organised a full Neighbourhood Water Festival — water balloons at the Ice Cream Hill, cool mist at the Cheese Tree Forest, and a water cannon show at the lake! She needs multiplication and division to plan the water usage across all locations and make sure nobody runs out of cool water. Help Vaporeon coordinate the ultimate water festival!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 109,
    character: 'vaporeon',
    charIdx: 9,
    title: "Chapter 5: The Grand Water Finale",
    emoji: "🌟",
    story: "Vaporeon is performing her legendary Grand Water Finale at the lake — the most spectacular water cannon display the neighbourhood has ever seen, with blasts timed to music! Margret has brought her mermaid friends through the portal to watch, and Bermione set up a sammich station at the water's edge (and ate most of it herself). Vaporeon! Help Vaporeon calculate the perfect timing and water quantities for the most magnificent show in neighbourhood history!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Villain Encounter: The Submarine ─────────────────────────
  // These chapters sit between Theme 2 Chapter 2 (charIdx 6) and
  // Chapter 3 (charIdx 7) for each of the seven characters involved.
  // charIdx 10 keeps them out of the regular 5–9 range while remaining
  // safely addressable as array indices (the progress array is padded to
  // maxCharIdx + 1 for each character).
  {
    id: 110,
    character: 'margret',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: Bubbles at the Lake",
    emoji: "🫧",
    story: "While building the most magnificent sandcastle the lake has ever seen, Humphrey tugs on Margret's arm — \"Look at the water!\" he gasps. The lake is bubbling! Big clusters of bubbles are rising up from somewhere deep below the surface. Something is definitely going on down there. Help Humphrey and Margret use multiplication to count the bubble clusters and work out exactly how many are rising up from the mysterious depths below!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 111,
    character: 'tigey_avinia',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: Into the Deep",
    emoji: "🌊",
    story: "\"Zut alors — zat is no ordinary bubble, mon ami!\" exclaims Tigey Avinia, peering at the water very seriously in her very best fake French accent. \"Something is under ze water — I can feel eet in my whiskers!\" Vaporeon and the mermaids dive immediately beneath the surface to investigate. The murky, bubbly water makes navigation très difficile! Help them use multiplication and division to navigate through the cloudy underwater currents and track down the source of the bubbles.",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 112,
    character: 'vaporeon',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: The Submarine Surfaces!",
    emoji: "🐢",
    story: "VAPOREON! Vaporeon and the mermaids rocket back out of the water! \"LOOK OUT — IT'S BOWSER!\" they shout — and just then, with a deafening BOOM, a giant turtle-shaped submarine explodes up from below the surface! \"MUA HA HA HA HA!\" Bowser's voice booms from his loudspeaker. \"THEY NEVER SAW ME COMING FROM UNDER SEA!\" The submarine churns towards shore and its hatch pops open, beginning to unload trooper forces! Help Vaporeon use multiplication to count the trooper groups moving towards the beach before they get too close!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 113,
    character: 'humphrey',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: Frisbee Strike",
    emoji: "🥏",
    story: "Humphrey sets his jaw with the most determined look a Heffalump has ever worn. He reaches into his bag and pulls out his treasured Captain America frisbee — a tool he has used many times in battle. He winds up, drawing on every last drop of his legendary Heffalump strength, and LAUNCHES it full force toward the submarine! Help Humphrey use multiplication to calculate the frisbee's trajectory and power so he can aim the perfect strike at just the right moment!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 114,
    character: 'fluffy',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: Roll!",
    emoji: "🛡️",
    story: "The frisbee hits the submarine with a cheerful little *ping* and bounces harmlessly off into the lake. Then — CRASH! Two enormous Bowser arms burst from the sides of the submarine and begin smashing the beautiful sandcastles everyone worked so hard on! \"ROLL!\" screams Fluffy, and every friend dives and tumbles out of the way! Help Fluffy use multiplication and division to calculate the fastest escape routes and make sure every friend gets clear before the next enormous smash!",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 115,
    character: 'bermione',
    charIdx: 10,
    villainEncounter: true,
    title: "Villain Encounter: Sand in My Sammich",
    emoji: "🪄",
    story: "A big glob of sand lands SPLAT right on Bermione — right on top of her sammich. Bermione stares at it. She picks it up. She looks at the submarine. She sets down the remains of her sammich very, very slowly. \"Sand,\" she says quietly. \"In. My. SAMMICH.\" Her horn begins to glow an ominous green and she lowers into a magical crouch, whispering her ancient unicorn spell. Help Bermione use division to channel her spell power precisely — the magic must be exactly right, or this could get very, very large.",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 116,
    character: 'roo',
    charIdx: 10,
    villainEncounter: true,
    lightning: true,
    title: "Villain Encounter: The Pouch Protocol",
    emoji: "🧸",
    story: "Bermione's horn flares brilliant green and the spell LAUNCHES the entire submarine up, up, and away over the horizon! \"NOT AGAIN!\" echoes Bowser's voice as they disappear into the sky. But Bermione is now trembling with pent-up magical energy — her eyes are glowing, her horn is sparking, and she looks about five seconds from blasting the Ice Cream Hill into orbit! Roo springs into action, diving into her pouch for calming supplies and her most trusty cosy blanket! LIGHTNING ROUND — help Roo rapidly distribute emergency snacks and cosy wraps to calm Bermione before her magic goes haywire!",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },

  // ── Chapter 3: The Volcano ─────────────────────────────────────
  // charIdx 11–15 marks these chapters as theme 4 (The Volcano).
  // The volcano is home to two main rock giants: Giganta (the village leader)
  // and Lligen (smaller, more suited to neighbourhood visits). The volcano-visit
  // chapters feature Giganta as the host; Lligen gets her own chapters as a
  // playable character visiting the neighbourhood (IDs 142–146 below).
  // ── Kiki ──────────────────────────────────────────────────────
  {
    id: 117,
    character: 'kiki',
    charIdx: 11,
    title: "Chapter 1: Heat Suit Assembly",
    emoji: "🦺",
    story: "Kiki has been planning the Volcano Expedition for weeks and today is finally the day! She pulls out her blueprints for the Heat-Resist-o-Suit 2000 — a special suit that can withstand the scorching volcanic temperature. But she needs to make enough for everyone joining the trip: Humphrey, Maggie, Fluffy, and Hermione! Help Kiki calculate the exact number of heat-suit components she needs so the whole crew stays safe on the hottest adventure yet!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 118,
    character: 'kiki',
    charIdx: 12,
    title: "Chapter 2: Donut River Drift",
    emoji: "🍩",
    story: "Kiki's chosen mode of transport to the volcano is the Donut River — she straps her Iron Man suit's rocket boots to a giant donut and everyone surfs downstream! The tricky part is calculating how long the ride will take given the river's speed and the distance to the volcano base. And keeping Fluffy from accidentally bouncing off her donut into someone else's. Help Kiki calculate the timings so the whole crew arrives at the volcano together!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 119,
    character: 'kiki',
    charIdx: 13,
    title: "Chapter 3: Giganta's Greeting",
    emoji: "🏔️",
    story: "The friends arrive at the base of the volcano — and with a ground-shaking THOOM, Giganta leaps from the volcano's summit and lands right in front of them! \"HELLO TINY FRIENDS!\" she booms, peering down at the group. Kiki activates her Iron Man suit and zooms up to eye level. \"HELLO GIGANTA! SCIENCE VISIT!\" she announces. Giganta wants to see the Heat-Resist-o-Suits in action first — help Kiki run the calculations to prove the suits work before everyone heads inside!",
    mode: "both",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 120,
    character: 'kiki',
    charIdx: 14,
    title: "Chapter 4: The Volcano Village",
    emoji: "🌋",
    story: "Inside the volcano, Kiki is practically vibrating with excitement! The village is incredible — giant rock houses, rivers of lava, and rock giants everywhere eating enormous boulders like snacks. Giganta gives Kiki a special tour of the village's food stores: mountains of rocks, heaps of boulders, and a fresh supply of donuts from the river. Kiki wants to record EVERYTHING in her science notebook. Help Kiki do the calculations to document all the geological wonders of the volcano village!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 121,
    character: 'kiki',
    charIdx: 15,
    title: "Chapter 5: Iron Man Suit at Maximum",
    emoji: "🦾",
    story: "The volcano's heat is extraordinary — even Kiki's Iron Man suit is reading temperatures it has never encountered before! Kiki needs to calibrate the suit's cooling systems, calculate the remaining power reserves, and figure out how long everyone's heat suits will last at this temperature. Plus Giganta wants to show her something special at the very top: a new lava formation that Kiki just HAS to study. Help Kiki push the suit to its limits and make the most of this once-in-a-lifetime science trip!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Humphrey ──────────────────────────────────────────────────
  {
    id: 122,
    character: 'humphrey',
    charIdx: 11,
    title: "Chapter 1: The Volcanic Prairie",
    emoji: "🌾",
    story: "Humphrey extends his morning walk all the way out onto the vast grassy prairie that stretches toward the volcano — past the end of the street, past Giri's chocolate shop, and out into the wide open prairie beyond. The prairie is huge and the volcano looks distant but magnificent on the horizon. Help Humphrey use multiplication to figure out how many steps it takes to cross the different sections of the volcanic prairie!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 123,
    character: 'humphrey',
    charIdx: 12,
    title: "Chapter 2: HELLO HEFFALUMP!",
    emoji: "🐘",
    story: "Without any warning, the ground begins to shake — THOOM! THOOM! THOOM! — and Lligen comes bounding over the horizon in an enormous arc, landing just ahead of Humphrey on the prairie with a CRASH that sends him stumbling! \"HELLO HEFFALUMP!\" she booms, crouching down to get a better look. Humphrey adjusts his laser glasses, which have been knocked slightly sideways. \"Hello!\" he says, doing his best to look calm. Help Humphrey use division to work out how far Lligen leaps with each jump!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 124,
    character: 'humphrey',
    charIdx: 13,
    title: "Chapter 3: Racing the Donut Current",
    emoji: "💨",
    story: "The donut river runs alongside the prairie path to the volcano, and Hailey — who has tagged along on the adventure today — has jumped onto a donut before Humphrey could stop her! \"HAILEY!\" yells Humphrey, breaking into a full Heffalump sprint. Heffalumps are incredibly fast, but the current is strong today. Help Humphrey calculate his running speed against the donut current speed so he can intercept Hailey before the donut river carries her all the way to the volcano base!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 125,
    character: 'humphrey',
    charIdx: 14,
    title: "Chapter 4: Giant Donut Feast",
    emoji: "🍩",
    story: "At the volcano base, the rock giants are having their favourite mealtime — they reach into the donut river and scoop out enormous fistfuls of donuts! Giganta explains that donuts are part of their well-balanced diet of rocks. Humphrey watches in amazement as dozens of giants devour hundreds of donuts. He counts the groups of giants and the donuts each one eats, and his laser glasses are working overtime trying to zoom in accurately. Help Humphrey calculate the total donut count from this extraordinary feast!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 126,
    character: 'humphrey',
    charIdx: 15,
    title: "Chapter 5: The Summit View",
    emoji: "🌄",
    story: "Giganta offers to carry Humphrey up to the volcano's summit for the most spectacular view in the region — you can see the entire neighborhood from up there, including the Ice Cream Hill, the Cheese Tree Forest, and even Mom Heffalump's house! Humphrey peers through his laser glasses at the tiny streets far below. From up here, distances are enormous. Help Humphrey use multiplication and division to calculate the distances between the volcano and all the familiar landmarks of home!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Maggie ────────────────────────────────────────────────────
  {
    id: 127,
    character: 'maggie',
    charIdx: 11,
    title: "Chapter 1: Karate Trek",
    emoji: "🥋",
    story: "Maggie is EXTREMELY excited about visiting the volcano. She has spent the whole morning karate-kicking fence posts in preparation. Humphrey has her on his shoulder for the walk across the volcanic prairie, which she greatly enjoys — she can karate-chop passing shrubs from up there. When they reach the first stretch of rocky volcanic terrain, Maggie leaps down to test her moves against actual volcanic rocks. Help Maggie calculate the force of each karate strike on the different rocks!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 128,
    character: 'maggie',
    charIdx: 12,
    title: "Chapter 2: Rock Chop Challenge",
    emoji: "🪨",
    story: "Maggie has found a field of loose volcanic boulders and she is absolutely in her element. She chops! She kicks! She roundhouse-kicks a boulder so hard it shatters into perfect even pieces! One of the rock giants nearby watches with enormous eyes — they have never seen anything like it. \"TINY TIGER STRONG!\" the giant observes. Maggie grins and asks Kiki to measure and divide each boulder by how many kicks it takes to break it. Help Maggie log her rock-chopping records!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 129,
    character: 'maggie',
    charIdx: 13,
    title: "Chapter 3: Tiny Tiger, Big Giant",
    emoji: "👀",
    story: "Giganta crouches down to try and see Maggie, but Maggie is just SO small that she keeps losing her. \"WHERE IS TINY TIGER?\" booms Giganta, and Maggie karate-chops Giganta's little toe to signal her location. \"OH! THERE TINY TIGER!\" Giganta is thrilled and gently sets down an enormous hand so Maggie can stand on it and be seen properly. Standing on a giant's palm, Maggie performs her best kata routine for the whole volcano village. Help Maggie calculate her performance score!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 130,
    character: 'maggie',
    charIdx: 14,
    title: "Chapter 4: Accidental Rockslide",
    emoji: "💥",
    story: "Maggie is showing off a new roundhouse kick to the assembled rock giants when she misjudges slightly — and her kick sends a boulder flying directly into a carefully stacked pile of rocks that turns out to be a giant's lunch! The boulders scatter everywhere! The giant doesn't mind at all (Maggie feels terrible), but now everything needs to be restacked in equal groups. Help Maggie do the math to reorganise the boulder piles so the giant's lunch is restored to its original arrangement!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 131,
    character: 'maggie',
    charIdx: 15,
    title: "Chapter 5: Ninja Finale",
    emoji: "🌋",
    story: "Word has spread through the entire volcano village: Tiny Tiger is performing! Every rock giant has gathered on the slopes of the volcano to watch Maggie's grand finale performance. She leaps, she spins, she karate-chops! For her final move, she roundhouse-kicks a volcanic rock that shatters into the air — and the fragments form a perfect arc! The giants roar in approval and shake the earth with their applause. Help Maggie calculate her championship score from the greatest ninja performance the volcano has ever seen!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Fluffy ────────────────────────────────────────────────────
  {
    id: 132,
    character: 'fluffy',
    charIdx: 11,
    title: "Chapter 1: Boing! Toward the Volcano",
    emoji: "🌸",
    story: "Fluffy starts the morning by hopping down the street, like she always does. Boing! Boing! Boing! But today she keeps going — past Giri's chocolate shop, onto the volcanic prairie, and all the way toward the distant volcano! Her heat suit from Kiki is strapped on (slightly crookedly), and Fluffy is absolutely delighted by the wide open space to boing through. Help Fluffy multiply her hops to calculate how many it takes to cover each section of the prairie on the way to the volcano!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 133,
    character: 'fluffy',
    charIdx: 12,
    title: "Chapter 2: The Heat Suit Shuffle",
    emoji: "🦺",
    story: "Kiki's Heat-Resist-o-Suit 2000 was designed for most body shapes, but it wasn't specifically designed for a round, soft squish-mallow shape. Fluffy's suit has fallen half-off three times, spun around twice, and ended up completely backwards once. Kiki has to keep pausing to refit it. Meanwhile, Fluffy has no idea and keeps bouncing cheerfully. Help Kiki divide the remaining adjustment steps across the suit's different sections so Fluffy is properly heat-protected before they reach the volcanic terrain!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 134,
    character: 'fluffy',
    charIdx: 13,
    title: "Chapter 3: Bouncing Off Boulders",
    emoji: "🪨",
    story: "The volcanic rocky terrain is a brand new kind of obstacle for Fluffy, and she is fascinated. Boing! She bounces off one boulder. Boing! She bounces off another! Because she is so soft and squishy, the boulders don't hurt at all — and after each bounce she just giggles and comes back for more. The rock giants can't stop watching. Kiki needs to calculate the angles and distances of each bounce to build a map of Fluffy's path. Help Kiki record all of Fluffy's delightful boulder bounces!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 135,
    character: 'fluffy',
    charIdx: 14,
    title: "Chapter 4: The World's Softest Seat",
    emoji: "🧸",
    story: "A young rock giant approaches Fluffy very carefully, reaches out one enormous finger, and gives her the gentlest possible poke. Fluffy sinks in a little and bounces back. The giant's eyes go wide with wonder. \"SOFT,\" the giant breathes, completely amazed. Within minutes, every small rock giant in the village has gathered and they are ALL trying to give Fluffy the softest, most careful poke possible. Help Fluffy count the pokes and multiply them across all the young giants who want a turn!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 136,
    character: 'fluffy',
    charIdx: 15,
    title: "Chapter 5: The Warm Nap",
    emoji: "😴",
    story: "After an extremely full day of boing-ing, boulder-bouncing, and being poked by fascinated rock giants, Fluffy has found the perfect spot: a warm, flat, smooth rock shelf just outside the volcano's entrance where the heat is just right for a cozy nap. The rock giants are very careful not to make too much noise nearby. Even Maggie has stopped karate-kicking rocks for a moment. Help count up the perfect nap score — how many multiplication and division problems can be solved before Fluffy drifts completely, softly, boing-ily off to sleep?",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Hermione ─────────────────────────────────────────────────
  {
    id: 137,
    character: 'hermione',
    charIdx: 11,
    title: "Chapter 1: Flying to the Volcano",
    emoji: "🦄",
    story: "While the others surf the Donut River and trek across the prairie, Hermione casts a flight spell and soars ahead of the group. The view from above is breathtaking — the donut river glittering in the sun below, the volcanic prairie stretching out in every direction, and the volcano growing larger ahead. Hermione scouts the best landing spot and the safest path for the others to follow. Help Hermione calculate the distances and heights as she maps out the perfect approach to the volcano!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 138,
    character: 'hermione',
    charIdx: 12,
    title: "Chapter 2: Cooling Spell Calibration",
    emoji: "❄️",
    story: "Even with Kiki's heat suits, the volcano is extremely warm, and Hermione wants to help. She has been preparing a series of cooling spells that can lower the ambient temperature in a small area. But magic spells must be calibrated precisely — too little magic and it won't help; too much and she might accidentally freeze something. Help Hermione divide her magical energy correctly across each cooling spell so everyone stays comfortable at just the right temperature!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 139,
    character: 'hermione',
    charIdx: 13,
    title: "Chapter 3: Volcanic Magic",
    emoji: "🌋",
    story: "Hermione's magic behaves differently near the volcano. The intense heat and the ancient energy of the volcanic rock amplifies her spells in unexpected ways! A small light spell becomes a dazzling aurora. A gentle levitation spell sends a boulder spinning ten times higher than intended. The rock giants are absolutely awestruck — they have never seen unicorn magic before! Help Hermione calculate how much to scale back each spell to account for the volcanic amplification and keep things from getting too spectacular!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 140,
    character: 'hermione',
    charIdx: 14,
    title: "Chapter 4: The Giants' Wonder",
    emoji: "✨",
    story: "Giganta has called every rock giant in the volcano village to witness Hermione's magic show. They crowd around in a great circle — each one enormous, each one staring with wide, wonder-filled eyes. Hermione performs spell after spell: floating lights, spinning crystals, shimmering colour cascades across the volcanic sky. After each spell, the giants rumble with deep, thundering approval that shakes the ground. Help Hermione calculate the magical energy required to multiply her dazzling display for the biggest audience she has ever performed for!",
    mode: "both",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 141,
    character: 'hermione',
    charIdx: 15,
    title: "Chapter 5: The Grand Volcanic Spell",
    emoji: "🪄",
    story: "For her grand finale, Hermione draws on the amplified volcanic magic to cast the most spectacular spell of her life. A shimmering curtain of light rises from the volcano's mouth and fans across the sky in every colour imaginable, visible from all the way back in the neighbourhood! Kiki is recording everything with her science equipment. Giganta is crying enormous rock-giant tears of joy. Even Maggie has stopped mid-karate-chop to stare. Help Hermione calculate the final magical burst that brings the grand volcanic spell to its most brilliant and unforgettable peak!",
    mode: "both",
    unlockAt: 3,
    passPct: 80,
  },

  // ── Lligen ────────────────────────────────────────────────────
  {
    id: 142,
    character: 'lligen',
    charIdx: 11,
    title: "Chapter 1: The Great Leap",
    emoji: "🪨",
    story: "Lligen has heard so much about the neighbourhood from Kiki's visits and from the donut river that she wants to see it for herself! She crouches at the volcano's summit, springs with all her might — and FLIES through the air in an enormous arc, the whole world stretching out below her — and lands with a tremendous THOOM on the grassy edge of the neighbourhood. The ground shakes for a full five seconds. Every friend comes running to see what happened. Help Lligen calculate the distance of her legendary leap from the volcano all the way to the neighbourhood!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 143,
    character: 'lligen',
    charIdx: 12,
    title: "Chapter 2: Over the Fence",
    emoji: "🐯",
    story: "Lligen makes her way carefully — very carefully — down the street. She is trying very hard not to step on anything important. She finds Margret's house and peers over the backyard fence with great curiosity. Margret waves up at her from the pool. \"Hello Lligen! Welcome to the neighbourhood!\" Margret is the most welcoming host imaginable. Lligen is fascinated by the pool and Margret explains how it works. Help Lligen calculate the amount of water in Margret's pool using multiplication and division so she can understand the tiny neighbourhood waterways!",
    mode: "divide",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 144,
    character: 'lligen',
    charIdx: 13,
    title: "Chapter 3: The Tiger Sisters",
    emoji: "🐯",
    story: "Next door, two tigers come out to meet Lligen together: Tigey and Tigey Avinia, arms linked as they look up at her. \"Bonjour, 'uge ami!\" calls Tigey Avinia in her very best fake French accent. \"We are the tiger seestairs. Zat is me, and zis is also me — no no, she is my seestair. Même maison!\" Tigey waves warmly. \"She means we're sisters and we live together,\" Tigey explains cheerfully. Lligen greets them both as one — \"HELLO TIGER SISTERS!\" — to their great delight. Help Lligen figure out how to share the stone gifts she brought for the sisters!",
    mode: "multiply",
    unlockAt: 1,
    passPct: 80,
  },
  {
    id: 145,
    character: 'lligen',
    charIdx: 14,
    title: "Chapter 4: Roo's Giant Snack Pack",
    emoji: "🥕",
    story: "Roo has heroically decided to pack snacks for Lligen from her endless pouch — which requires some very creative mathematics, since Lligen is about forty times bigger than everyone else. Roo pulls out bags of snacks, multiplies every portion, and re-sorts everything into appropriately massive piles. Lligen watches the whole process with great fascination, crouching down to peer at the tiny pouch that somehow produces so many things. Help Roo multiply the snack quantities to the right giant-sized amounts so Lligen is properly fed!",
    mode: "multiply",
    unlockAt: 2,
    passPct: 80,
  },
  {
    id: 146,
    character: 'lligen',
    charIdx: 15,
    title: "Chapter 5: Thumper's Big Trap",
    emoji: "🐰",
    story: "Thumper has spent the entire morning constructing the most enormous trap she has ever built — a rope, three buckets, a net, and a very large pile of leaves — convinced she can fool even a rock giant. When Lligen comes strolling down the street, Thumper holds her breath. Lligen steps right over the entire contraption without noticing (she's simply too tall). Thumper stares. Lligen looks around, completely unaware anything was there. Then Thumper bursts out: \"kekekekeke!\" It's the funniest thing that's ever happened. Help Thumper calculate the exact measurements of the trap she built so she can tell the story properly later!",
    mode: "divide",
    unlockAt: 3,
    passPct: 80,
  },
  {
    id: 147,
    character: 'lligen',
    charIdx: 16,
    title: "Chapter 6: Giri's Chocolate Rocks",
    emoji: "🍫",
    story: "Giri has been preparing something very special ever since he heard Lligen was coming to the neighbourhood. He arrives at the lakeshore carrying an enormous crate: chocolate-covered rocks made to giant size — the most prized delicacy from the volcano village, crafted especially for Lligen. Lligen's eyes go very wide. \"ROCKS-CHOCOLAT!\" she rumbles with great reverence. Giri beams. Help Giri calculate the number of giant chocolate rocks he made and how many are in each portion so Lligen can savour every one!",
    mode: "multiply",
    unlockAt: 4,
    passPct: 80,
  },
  {
    id: 148,
    character: 'lligen',
    charIdx: 17,
    title: "Chapter 7: Hello Small Water Friends!",
    emoji: "🧜",
    story: "Lligen wades into the lake and settles down comfortably — it's the one spot in the neighbourhood where she actually fits. She is happily nibbling her chocolate rocks when the water begins to shimmer with a familiar glow — a shimmer that Anna and Annabell know well. The mermaids rise through the surface of the lake in a swirl of magic, blinking in surprise at the enormous rock giant sitting in their lake. They stare at Lligen. Lligen stares at them. \"HELLO SMALL WATER FRIENDS!\" she booms. Anna and Annabell dissolve into laughter and swim over immediately. Help Lligen, Anna, and Annabell calculate how to share the remaining chocolate rocks — there is plenty for everyone!",
    mode: "both",
    unlockAt: 5,
    passPct: 80,
  },

  // ── Villain Encounter: The Rock Monster ───────────────────────
  // charIdx 18 keeps these chapters distinct from the volcano range (11–17)
  // and from the Submarine villain encounter (charIdx 10).
  // Theme assignment: ch.villainEncounter && ch.charIdx !== 10 → theme 5.
  {
    id: 149,
    character: 'kiki',
    charIdx: 18,
    villainEncounter: true,
    title: "Villain Encounter: Something in the Mountain",
    emoji: "🕳️",
    story: "While studying the Rock Giant City with Giganta, Kiki spots an unusually shaped hole cut into the side of the mountain — too small for Giganta to have noticed, but just the right size for curious friends. They follow a long dark tunnel and discover a vast underground cave packed with machinery! The lava is powering a factory that assembles enormous LEGO bricks made of solid rock — and before anyone can react, the bricks start snapping together into a colossal LEGO Humphrey! Kiki's suit sensors are going wild. Help Kiki use multiplication to calculate the machinery output and count exactly how many rock-LEGO bricks have been assembled!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 150,
    character: 'humphrey',
    charIdx: 18,
    villainEncounter: true,
    title: "Villain Encounter: Maximum Laser Capacity",
    emoji: "🔫",
    story: "Kiki's Iron Man suit and Humphrey's laser glasses immediately fire their most powerful beams at Lego Rock Humphrey — but every blast bounces off harmlessly! Lego Humphrey had always found their combined laser power overwhelming in his original plastic form, so he had made sure his rock upgrade could withstand it. Humphrey adjusts his glasses and squints determinedly. Help Humphrey use multiplication to calculate the total laser blasts fired and figure out just how many times they are going to need to try something different!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 151,
    character: 'maggie',
    charIdx: 18,
    villainEncounter: true,
    title: "Villain Encounter: Boulder Strike",
    emoji: "🪨",
    story: "Maggie grabs the biggest boulder she can find and launches it at the monster with a powerful kick — it bounces off harmlessly. Lego Rock Humphrey takes one enormous step out of the lava pool, shaking the cave floor, and begins advancing towards them. Maggie plants her feet and starts calculating: what is this thing made of, and where might the weak spots be? Help Maggie use multiplication and division to analyse the monster's movements and find every angle that might actually make a difference!",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 152,
    character: 'fluffy',
    charIdx: 18,
    villainEncounter: true,
    title: "Villain Encounter: Distraction Bounce",
    emoji: "🧸",
    story: "Lego Rock Humphrey swings at Fluffy — but Fluffy just bounces out of the way with a cheerful BOING! Fluffy rolls left, right, and off the cave walls, drawing the monster's attention away from everyone else and buying precious moments. Every second counts while Hermione quietly charges her spell! Help Fluffy use multiplication and division to calculate the fastest escape routes and keep bouncing and rolling just out of reach!",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },
  {
    id: 153,
    character: 'hermione',
    charIdx: 18,
    villainEncounter: true,
    lightning: true,
    title: "Villain Encounter: Volcano Ice Beam",
    emoji: "❄️",
    story: "The moment they had entered the cave, Hermione had quietly begun casting — and Lego Rock Humphrey had been so focused on the others that he never noticed. Now, amplified by the extraordinary power of the volcano itself, Hermione releases an incredibly powerful ice beam! The lava between the monster's rock LEGO bricks freezes instantly, hardens to solid rock, and locks every brick in place — Lego Humphrey is defeated! LIGHTNING ROUND — help Hermione channel the final surge of ice magic to freeze every last crack solid before Lego Humphrey can break free!",
    mode: "both",
    unlockAt: 0,
    passPct: 80,
  },
];

// Tag every chapter with its story theme.
// Submarine villain-encounter chapters (charIdx 10) → theme 3.
// Rock Monster villain-encounter chapters (charIdx 18) → theme 5.
// For all other chapters: charIdx 0–4 → theme 1, charIdx 5–9 → theme 2,
// charIdx 11–17 → theme 4 (The Volcano).
function assignChapterTheme(ch) {
  if (ch.villainEncounter) return ch.charIdx === 10 ? 3 : 5;
  if (ch.charIdx <= 4)     return 1;
  if (ch.charIdx <= 9)     return 2;
  return 4;
}
CHAPTERS.forEach(ch => { ch.theme = assignChapterTheme(ch); });

// ── Story themes ──────────────────────────────────────────────
const STORY_THEMES = [
  {
    id: 1,
    title: 'Chapter 1: Friends',
    emoji: '👫',
    description: 'Play alongside your neighbourhood friends in their everyday adventures!',
  },
  {
    id: 2,
    title: 'Chapter 2: The Neighbourhood',
    emoji: '🏘️',
    description: 'Explore the magical neighbourhood — the Ice Cream Hill, the Cheese Tree Forest, the Hot Chocolate Spring, the Donut River, and more!',
  },
  {
    id: 3,
    title: 'Villain Encounter: The Submarine',
    emoji: '⚔️',
    description: 'A mysterious submarine has surfaced at the lake! Join the friends as they face Bowser and his trooper forces in this special villain encounter.',
  },
  {
    id: 4,
    title: 'Chapter 3: The Volcano',
    emoji: '🌋',
    description: 'A visit to the volcano! Join Kiki, Humphrey, Maggie, Fluffy, and Hermione as they trek to meet the rock giants — and follow Lligen, the friendly rock giant, as she makes her first visit to the neighbourhood.',
  },
  {
    id: 5,
    title: 'Villain Encounter: The Rock Monster',
    emoji: '🪨',
    description: 'Deep inside the volcano, a secret underground factory has been building something terrible — a giant LEGO Humphrey made entirely of rock! Join Kiki, Humphrey, Maggie, Fluffy, and Hermione as they face the Rock Monster.',
  },
];

// ── State ─────────────────────────────────────────────────────
let state = {
  playerName:           '',
  mode:                 'both',     // 'multiply' | 'divide' | 'both'
  questions:            [],
  index:                0,
  score:                0,
  streak:               0,
  history:              [],         // {question, correct, given, ms}
  timeLeft:             TIME_PER_QUESTION,
  timerID:              null,
  tickStart:            null,
  answered:             false,
  storyMode:            false,      // true when playing from a story chapter
  chapterId:            null,       // which chapter is being played
  selectedCharacter:    null,       // character id chosen on the character screen
  selectedTheme:        null,       // story theme id chosen on the theme screen (1 or 2)
  newlyUnlockedChapter: null,       // chapter id unlocked after last completion
  newlyUnlockedCharacter: null,     // character id unlocked after last completion
  settings:             { ...DEFAULT_SETTINGS }, // active user's settings
  devMode:              false,      // local-only testing flag — never synced to cloud
  // Lightning round state
  lightningMode:        false,      // true when playing a lightning round
  lightningTimeLeft:    0,          // remaining seconds in the full-round countdown
  lightningTimerID:     null,       // setInterval ID for full-round timer
  lightningTickStart:   null,       // timestamp when round timer started
  lightningCount:       0,          // total questions attempted this lightning round
  lightningCorrect:     0,          // correct answers this lightning round
  lightningQuestionStart: 0,        // timestamp when the current question appeared
};

// ── LocalStorage helpers ──────────────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem('mathgenius_users') || '[]');
}
// Write users to localStorage only, without triggering a cloud save.
// Use this instead of saveUsers() in situations where the startup cloud sync
// may still be in-flight and we don't want to overwrite newer cloud data with
// a stale local snapshot.  The cloud is updated by the next call to saveUsers()
// from a meaningful user action (level completion, settings save, etc.).
function saveUsersLocally(users) {
  try {
    localStorage.setItem('mathgenius_users', JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to write users to localStorage —', e);
  }
}
function saveUsers(users) {
  localStorage.setItem('mathgenius_users', JSON.stringify(users));
  if (typeof PlayFabManager !== 'undefined' && PlayFabManager.isLoggedIn) {
    try {
      PlayFabManager.saveUsersToCloud(users);
    } catch (e) {
      console.warn('PlayFab: saveUsersToCloud threw synchronously —', e);
    }
  }
}
function getCurrentUser() {
  return localStorage.getItem('mathgenius_currentUser') || null;
}
function setCurrentUser(name) {
  localStorage.setItem('mathgenius_currentUser', name);
}

// ── Dev mode helpers (local-only — never synced to cloud) ─────
const DEV_MODE_KEY_PREFIX = 'mathgenius_devmode_';
const DEV_MODE_ALLOWED_USER = 'Brandon'; // only this player can enable dev mode

function getDevMode(userName) {
  if (!userName) return false;
  return localStorage.getItem(DEV_MODE_KEY_PREFIX + userName) === 'true';
}

function setDevMode(userName, enabled) {
  if (!userName) return;
  if (enabled) {
    localStorage.setItem(DEV_MODE_KEY_PREFIX + userName, 'true');
  } else {
    localStorage.removeItem(DEV_MODE_KEY_PREFIX + userName);
  }
}

// ── User settings helpers ─────────────────────────────────────
function getUserSettings(userName) {
  if (!userName) return { ...DEFAULT_SETTINGS };
  const users = getUsers();
  const user = users.find(u => u.name === userName);
  if (!user || !user.settings) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...user.settings };
}

function saveUserSettings(userName, settings) {
  if (!userName) return;
  const users = getUsers();
  const user = users.find(u => u.name === userName);
  if (!user) return;
  user.settings = settings;
  saveUsers(users);
}

// ── User progress helpers ─────────────────────────────────────
function getUserProgress(userName) {
  const users = getUsers();
  const user = users.find(u => u.name === userName);
  if (!user) return null;
  user.storyProgress = user.storyProgress || {};
  // Ensure all-time lightning best fields exist
  user.bestLightningCorrect = user.bestLightningCorrect || 0;
  user.bestLightningScore   = user.bestLightningScore   || 0;
  CHARACTERS.forEach(char => {
    user.storyProgress[char.id] = user.storyProgress[char.id] || { chapters: [] };
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    // Pad the progress array to (maxCharIdx + 1) so that progress[charIdx] is
    // always a valid index even when charIdx values are non-contiguous (e.g.
    // villain-encounter chapters at charIdx 10, or Bermione whose chapters
    // start at charIdx 5 with no preceding Theme 1 chapters).
    const neededLen = charChapters.length > 0
      ? Math.max(...charChapters.map(c => c.charIdx)) + 1
      : 0;
    while (user.storyProgress[char.id].chapters.length < neededLen) {
      user.storyProgress[char.id].chapters.push({
        completed: false, stars: 0, bestScore: null, bestPct: null,
      });
    }
  });
  return user;
}

function saveUserProgress(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.name === user.name);
  if (idx >= 0) users[idx] = user;
  saveUsers(users);
}

function isChapterUnlocked(ch, progress) {
  if (state.devMode) return true;
  // Only consider chapters in the same theme when checking for a preceding
  // chapter. This prevents Theme-2 chapters (charIdx 5–9) from accidentally
  // gating Theme-3 Villain Encounter chapters (charIdx 10), and naturally
  // handles first-chapter-of-theme auto-unlocking (e.g. Bermione's first
  // Theme-2 chapter at charIdx 5, or each VE chapter at charIdx 10 which
  // has no preceding charIdx-9 chapter within theme 3).
  const hasPrecedingChapter = CHAPTERS.some(
    c => c.character === ch.character && c.charIdx === ch.charIdx - 1 && c.theme === ch.theme
  );
  if (!hasPrecedingChapter) return true;
  const charProgress = progress[ch.character];
  if (!charProgress) return false;
  const prev = charProgress.chapters[ch.charIdx - 1];
  return !!(prev && prev.completed);
}

/** Returns true when all chapters of the character before charId in the
 *  theme-specific order are completed, so characters unlock independently
 *  per theme. */
function isCharacterUnlocked(charId, progress, themeId) {
  if (state.devMode) return true;
  const themeChars = getThemeCharacters(themeId);
  const charIndex = themeChars.findIndex(c => c.id === charId);
  if (charIndex <= 0) return true;
  const prevChar = themeChars[charIndex - 1];
  const prevProgress = progress[prevChar.id];
  if (!prevProgress) return false;
  const prevChapters = CHAPTERS.filter(ch => ch.character === prevChar.id && ch.theme === themeId);
  return prevChapters.length > 0 &&
    prevChapters.every(ch => prevProgress.chapters[ch.charIdx] && prevProgress.chapters[ch.charIdx].completed);
}

/**
 * Returns true when the given chapter (theme) is accessible globally.
 * Theme 1 is always unlocked.
 * Any subsequent theme requires ALL chapters of the preceding theme to be
 * complete across all characters in that theme.
 */
function isGlobalChapterUnlocked(themeId, progress) {
  if (state.devMode) return true;
  if (themeId === 1) return true;
  const prevThemeChapters = CHAPTERS.filter(ch => ch.theme === themeId - 1);
  return prevThemeChapters.length > 0 && prevThemeChapters.every(ch => {
    const cp = progress[ch.character];
    return cp && cp.chapters[ch.charIdx] && cp.chapters[ch.charIdx].completed;
  });
}

// ── Helpers ───────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Generate a single question object.
 * Multiplication: a × b = ? (a,b ∈ 0..maxNumber)
 * Division:       a ÷ b = ? where a = b×q, b ≠ 0, q ∈ 0..maxNumber
 */
function generateQuestion(mode) {
  let type, a, b, answer, display;

  const maxNum = state.settings.maxNumber;
  const allowDiv = state.settings.allowDivision;

  if (mode === 'both') {
    type = (allowDiv && Math.random() < 0.5) ? 'divide' : 'multiply';
  } else if (mode === 'divide' && !allowDiv) {
    type = 'multiply';
  } else {
    type = mode;
  }

  if (type === 'multiply') {
    a = rand(0, maxNum);
    b = rand(0, maxNum);
    answer = a * b;
    display = `${a} × ${b}`;
  } else {
    // divisor b in 1..maxNum, quotient in 0..maxNum
    b = rand(1, maxNum);
    const q = rand(0, maxNum);
    a = b * q;
    answer = q;
    display = `${a} ÷ ${b}`;
  }

  // Generate 3 wrong answers that are distinct and ≥ 0
  const wrongs = new Set();
  while (wrongs.size < 3) {
    let w = answer + rand(-5, 5);
    if (w < 0 || w === answer) w = answer + rand(1, 5);
    if (w !== answer) wrongs.add(w);
  }

  const options = shuffle([answer, ...wrongs]);

  return { type, display, answer, options };
}

/** Build a full round of `QUESTIONS_PER_ROUND` questions. */
function buildRound(mode) {
  const pool = [];
  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    pool.push(generateQuestion(mode));
  }
  return pool;
}

// ── DOM helpers ───────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function showToast(text, isWrong = false) {
  const t = $('#feedback-toast');
  t.textContent = text;
  t.classList.toggle('wrong', isWrong);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 900);
}

// Shows a cloud-sync status message at the bottom of the screen.
// Error toasts stay for 5 s so users have time to read them;
// success toasts clear after 3 s.
let _cloudToastTimerId = null;
function showCloudToast(text, isError = false) {
  const t = $('#cloud-toast');
  if (!t) return;
  t.textContent = text;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(_cloudToastTimerId);
  _cloudToastTimerId = setTimeout(() => t.classList.remove('show'), isError ? 5000 : 3000);
}


function startTimer() {
  const duration = state.settings.timerDuration;
  state.timeLeft = duration;
  state.tickStart = Date.now();
  updateTimerUI();

  clearInterval(state.timerID);
  state.timerID = setInterval(() => {
    state.timeLeft = Math.max(
      0,
      duration - (Date.now() - state.tickStart) / 1000
    );
    updateTimerUI();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerID);
      if (!state.answered) {
        handleTimeout();
      }
    }
  }, 80);
}

function stopTimer() {
  clearInterval(state.timerID);
  state.timerID = null;
}

// ── Lightning round timer ─────────────────────────────────────
function startLightningTimer() {
  const duration = state.settings.lightningDuration;
  state.lightningTimeLeft = duration;
  state.lightningTickStart = Date.now();
  updateTimerUI();

  clearInterval(state.lightningTimerID);
  state.lightningTimerID = setInterval(() => {
    state.lightningTimeLeft = Math.max(
      0,
      duration - (Date.now() - state.lightningTickStart) / 1000
    );
    updateTimerUI();

    // Update progress bar to reflect time elapsed
    const elapsed = duration - state.lightningTimeLeft;
    $('#progress-bar').style.width = `${(elapsed / duration) * 100}%`;

    if (state.lightningTimeLeft <= 0) {
      clearInterval(state.lightningTimerID);
      state.lightningTimerID = null;
      // The resultsShown guard in showResults() prevents double invocation
      // (e.g. if the player just answered and nextQuestion() is also pending).
      showResults();
    }
  }, 80);
}

function stopLightningTimer() {
  clearInterval(state.lightningTimerID);
  state.lightningTimerID = null;
}

function updateTimerUI() {
  const ring  = $('#timer-ring');
  const numEl = $('#timer-num');
  const fg    = $('#ring-fg');

  let timeLeft, duration;
  if (state.lightningMode) {
    timeLeft = state.lightningTimeLeft;
    duration = state.settings.lightningDuration;
  } else {
    timeLeft = state.timeLeft;
    duration = state.settings.timerDuration;
  }

  const frac  = duration > 0 ? timeLeft / duration : 0;
  const offset = CIRCUMFERENCE * (1 - frac);

  fg.style.strokeDashoffset = offset;
  numEl.textContent = Math.ceil(timeLeft);
  ring.classList.toggle('urgent', timeLeft <= (state.lightningMode ? 10 : 3));
  ring.classList.toggle('lightning-timer', state.lightningMode);
}

// ── Login screen ──────────────────────────────────────────────
function renderLoginScreen() {
  const grid = $('#user-grid');
  grid.textContent = '';

  const users = getUsers();

  users.forEach(u => {
    const card = document.createElement('button');
    card.className = 'user-card';
    card.setAttribute('type', 'button');

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = u.name.charAt(0).toUpperCase();

    const nameEl = document.createElement('div');
    nameEl.className = 'user-name';
    nameEl.textContent = u.name;

    const dateEl = document.createElement('div');
    dateEl.className = 'user-date';
    dateEl.textContent = u.lastPlayed ? formatDate(u.lastPlayed) : 'New player';

    card.append(avatar, nameEl, dateEl);
    card.addEventListener('click', () => loginUser(u.name));
    grid.appendChild(card);
  });

  const emptyMsg = $('#user-grid-empty');
  emptyMsg.style.display = users.length === 0 ? 'block' : 'none';

  renderCloudLoginStatus();
}

function renderCloudLoginStatus() {
  const statusEl = $('#cloud-login-status');
  const btnEl    = $('#cloud-login-btn');
  const hintEl   = $('#cloud-login-hint');
  if (!statusEl || !btnEl) return;

  const loggedIn = typeof PlayFabManager !== 'undefined' && PlayFabManager.isLoggedIn;
  if (loggedIn) {
    const name = PlayFabManager.displayName || PlayFabManager.playFabId || 'your account';
    statusEl.textContent = '✅ Synced — ' + name;
    statusEl.classList.add('cloud-login-status--connected');
    btnEl.textContent = 'Sign out';
    btnEl.classList.add('btn-cloud-logout');
    btnEl.classList.remove('btn-cloud-login');
    if (hintEl) hintEl.textContent = 'All players on this device are backed up to the cloud.';
  } else {
    statusEl.textContent = '☁️ Save progress online';
    statusEl.classList.remove('cloud-login-status--connected');
    btnEl.textContent = 'Sign in with Google';
    btnEl.classList.remove('btn-cloud-logout');
    btnEl.classList.add('btn-cloud-login');
    if (hintEl) hintEl.textContent = 'Optional — syncs all players across devices';
  }
}

function loginUser(name) {
  setCurrentUser(name);
  const users = getUsers();
  const user = users.find(u => u.name === name);
  if (user) {
    user.lastPlayed = Date.now();
    // Use saveUsersLocally instead of saveUsers — the startup cloud sync may
    // still be in-flight, and calling saveUsers() here would push whatever is
    // currently in localStorage to the cloud, permanently overwriting any
    // newer progress from another device before it can be merged in.
    // The cloud is updated by the next meaningful action (level completion,
    // settings save, etc.), by which time the sync will have completed and
    // localStorage will hold the fully-merged best-of-all-devices data.
    saveUsersLocally(users);
  }
  state.settings = getUserSettings(name);
  state.devMode = name === DEV_MODE_ALLOWED_USER ? getDevMode(name) : false;
  state.selectedCharacter = null;
  state.selectedTheme = null;
  state.newlyUnlockedCharacter = null;
  renderChapterScreen();
  showScreen('#chapter-screen');
}

function addPlayer(rawName) {
  const name = rawName.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  if (!name) return;

  const users = getUsers();
  if (users.find(u => u.name === name)) {
    // User already exists — just log in
    loginUser(name);
    return;
  }

  users.push({ name, created: Date.now(), lastPlayed: Date.now() });
  // Use saveUsersLocally — same reasoning as loginUser above.
  // The new profile will be included in the next saveUsers() call triggered
  // by the user completing a level or saving settings.
  saveUsersLocally(users);
  loginUser(name);
}

// ── Chapter select screen (global) ───────────────────────────
function renderChapterScreen() {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  const progress = user ? user.storyProgress : {};

  // Show dev mode badge next to username when active
  const usernameEl = $('#chapter-screen-username');
  usernameEl.textContent = userName || '';
  const existingBadge = usernameEl.parentElement.querySelector('.dev-mode-badge');
  if (existingBadge) existingBadge.remove();
  if (state.devMode) {
    const badge = document.createElement('span');
    badge.className = 'dev-mode-badge';
    badge.textContent = '🧪 Dev Mode';
    usernameEl.insertAdjacentElement('afterend', badge);
  }

  const list = $('#chapter-list');
  list.textContent = '';

  STORY_THEMES.forEach(theme => {
    const unlocked = isGlobalChapterUnlocked(theme.id, progress);

    // Overall progress for this theme across all characters
    const allThemeChapters = CHAPTERS.filter(ch => ch.theme === theme.id);
    const completedCount = allThemeChapters.filter(ch => {
      const cp = progress[ch.character];
      return cp && cp.chapters[ch.charIdx] && cp.chapters[ch.charIdx].completed;
    }).length;
    const allDone = allThemeChapters.length > 0 && completedCount === allThemeChapters.length;

    const card = document.createElement('button');
    card.className = 'theme-card';
    card.classList.add(unlocked ? 'unlocked' : 'locked');
    if (allDone) card.classList.add('completed');
    card.setAttribute('type', 'button');
    card.disabled = !unlocked;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'theme-card-emoji';
    emojiEl.textContent = unlocked ? theme.emoji : '🔒';

    const body = document.createElement('div');
    body.className = 'theme-card-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'theme-card-title';
    titleEl.textContent = theme.title;

    const descEl = document.createElement('div');
    descEl.className = 'theme-card-desc';
    if (unlocked) {
      descEl.textContent = theme.description;
    } else {
      // Theme 1 is always unlocked, so this branch is only reached for theme 2+.
      // prevTheme is used to display a helpful unlock hint; the fallback 'Locked'
      // covers any future themes that have no predecessor defined.
      const prevTheme = STORY_THEMES.find(t => t.id === theme.id - 1);
      descEl.textContent = prevTheme
        ? `Complete "${prevTheme.title}" to unlock!`
        : 'Locked';
    }

    const progressEl = document.createElement('div');
    progressEl.className = 'theme-card-progress';
    if (!unlocked) {
      progressEl.textContent = '🔒 Locked';
    } else if (allDone) {
      progressEl.textContent = `✅ All ${allThemeChapters.length} ${allThemeChapters.length === 1 ? 'story' : 'stories'} complete!`;
    } else {
      progressEl.textContent = `${completedCount} / ${allThemeChapters.length} ${allThemeChapters.length === 1 ? 'story' : 'stories'} complete`;
    }

    body.append(titleEl, descEl, progressEl);
    card.append(emojiEl, body);

    if (unlocked) {
      card.addEventListener('click', () => selectChapter(theme.id));
    }

    list.appendChild(card);
  });
}

function selectChapter(themeId) {
  state.selectedTheme = themeId;
  state.selectedCharacter = null;
  renderCharacterScreen(null);
  showScreen('#character-screen');
}

// ── Character select screen ───────────────────────────────────
function renderCharacterScreen(newlyUnlockedCharacterId) {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  const progress = user ? user.storyProgress : {};
  const themeId = state.selectedTheme;
  const theme = STORY_THEMES.find(t => t.id === themeId);

  // Ensure progress slots exist for all characters
  CHARACTERS.forEach(char => {
    progress[char.id] = progress[char.id] || { chapters: [] };
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    const neededLen = charChapters.length > 0
      ? Math.max(...charChapters.map(c => c.charIdx)) + 1
      : 0;
    while (progress[char.id].chapters.length < neededLen) {
      progress[char.id].chapters.push({ completed: false, stars: 0, bestScore: null, bestPct: null });
    }
  });

  $('#char-screen-username').textContent = userName || '';

  // Update chapter header
  const chapterIconEl = $('#char-screen-chapter-icon');
  const chapterTitleEl = $('#char-screen-chapter-title');
  if (theme) {
    chapterIconEl.textContent = theme.emoji;
    chapterTitleEl.textContent = theme.title;
  }

  const grid = $('#character-grid');
  grid.textContent = '';

  const themeChars = getThemeCharacters(themeId);
  themeChars.forEach((char, charIndex) => {
    const unlocked = isCharacterUnlocked(char.id, progress, themeId);
    const charProgress = progress[char.id];
    // Count progress for the selected chapter only
    const charThemeChapters = CHAPTERS.filter(ch => ch.character === char.id && ch.theme === themeId);
    const completedCount = charThemeChapters.filter(ch =>
      charProgress.chapters[ch.charIdx] && charProgress.chapters[ch.charIdx].completed
    ).length;
    const allDone = charThemeChapters.length > 0 && completedCount === charThemeChapters.length;

    const card = document.createElement('button');
    card.className = 'character-card';
    card.classList.toggle('unlocked', unlocked);
    card.classList.toggle('locked', !unlocked);
    if (allDone) card.classList.add('completed');
    if (char.id === newlyUnlockedCharacterId) card.classList.add('newly-unlocked');
    card.setAttribute('type', 'button');
    card.disabled = !unlocked;

    // Image or emoji
    const imgWrap = document.createElement('div');
    imgWrap.className = 'character-card-img-wrap';
    if (char.image) {
      const img = document.createElement('img');
      img.src = char.image;
      img.alt = char.name;
      img.className = 'character-card-img';
      imgWrap.appendChild(img);
    } else {
      const emo = document.createElement('span');
      emo.className = 'character-card-emoji';
      emo.textContent = unlocked ? char.emoji : '🔒';
      imgWrap.appendChild(emo);
    }

    const body = document.createElement('div');
    body.className = 'character-card-body';

    const nameEl = document.createElement('div');
    nameEl.className = 'character-card-name';
    nameEl.textContent = char.name;

    const descEl = document.createElement('div');
    descEl.className = 'character-card-desc';
    descEl.textContent = unlocked
      ? char.description
      : charIndex > 0
        ? `Complete ${themeChars[charIndex - 1].name}'s stories to unlock!`
        : 'Locked';

    const progressEl = document.createElement('div');
    progressEl.className = 'character-card-progress';
    if (!unlocked) {
      progressEl.textContent = '🔒 Locked';
    } else if (allDone) {
      progressEl.textContent = '✅ All stories complete!';
    } else {
      const n = charThemeChapters.length;
      progressEl.textContent = `${completedCount} / ${n} ${n === 1 ? 'story' : 'stories'} complete`;
    }

    body.append(nameEl, descEl, progressEl);
    card.append(imgWrap, body);

    if (unlocked) {
      card.addEventListener('click', () => selectCharacter(char.id));
    }

    grid.appendChild(card);
  });

  if (newlyUnlockedCharacterId) {
    const char = CHARACTERS.find(c => c.id === newlyUnlockedCharacterId);
    setTimeout(() => {
      if (char) showToast(`🎉 ${char.emoji} ${char.name} unlocked!`);
    }, NEWLY_UNLOCKED_TOAST_DELAY_MS);
  }
}

function selectCharacter(charId) {
  state.selectedCharacter = charId;
  renderStoryScreen(null);
  showScreen('#story-screen');
}

// ── Settings screen ───────────────────────────────────────────
function renderSettingsScreen() {
  const userName = getCurrentUser();
  $('#settings-username').textContent = userName || '';

  const s = state.settings;
  const timerInput  = $('#timer-duration-input');
  const timerVal    = $('#timer-duration-val');
  const maxNumInput = $('#max-number-input');
  const maxNumVal   = $('#max-number-val');
  const divToggle   = $('#allow-division-input');
  const lightningDurInput  = $('#lightning-duration-input');
  const lightningDurVal    = $('#lightning-duration-val');
  const lightningPassInput = $('#lightning-pass-input');
  const lightningPassVal   = $('#lightning-pass-val');

  timerInput.value  = s.timerDuration;
  timerVal.textContent = `${s.timerDuration}s`;

  maxNumInput.value = s.maxNumber;
  maxNumVal.textContent = s.maxNumber;

  divToggle.checked = s.allowDivision;

  if (lightningDurInput) {
    lightningDurInput.value = s.lightningDuration;
    lightningDurVal.textContent = `${s.lightningDuration}s`;
  }
  if (lightningPassInput) {
    lightningPassInput.value = s.lightningPassCount;
    lightningPassVal.textContent = s.lightningPassCount;
  }

  // Show all-time lightning best score
  const bestEl = $('#lightning-best-score');
  if (bestEl) {
    const user = getUserProgress(userName);
    const best = user ? (user.bestLightningCorrect || 0) : 0;
    bestEl.textContent = best > 0 ? `🏆 All-time best: ${best} correct` : 'No lightning rounds played yet';
  }

  // Dev mode toggle (local-only, never synced) — only visible for DEV_MODE_ALLOWED_USER
  const devCard = $('.dev-mode-card');
  if (devCard) {
    devCard.style.display = userName === DEV_MODE_ALLOWED_USER ? '' : 'none';
  }
  const devToggle = $('#dev-mode-input');
  if (devToggle) {
    devToggle.checked = state.devMode;
  }
}


function renderStoryScreen(newlyUnlockedChapter) {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  const charId = state.selectedCharacter;
  const char = CHARACTERS.find(c => c.id === charId);
  const theme = STORY_THEMES.find(t => t.id === state.selectedTheme);

  // Show "Character name — Theme title"
  const titleParts = [char ? char.name : '', theme ? theme.title : ''].filter(Boolean);
  $('#story-character-title').textContent = titleParts.join(' — ');

  // ── Character hero image / emoji at top of screen
  const heroEl = $('#story-char-hero');
  heroEl.textContent = '';
  if (char) {
    if (char.image) {
      const heroImg = document.createElement('img');
      heroImg.src = char.image;
      heroImg.alt = char.name;
      heroImg.className = 'story-char-hero-img';
      heroEl.appendChild(heroImg);
    } else {
      const heroEmoji = document.createElement('span');
      heroEmoji.className = 'story-char-hero-emoji';
      heroEmoji.textContent = char.emoji;
      heroEl.appendChild(heroEmoji);
    }
  }

  const list = $('#chapters-list');
  list.textContent = '';

  const progress = user ? user.storyProgress : {};

  // Ensure progress for this character is initialized
  if (char) {
    progress[char.id] = progress[char.id] || { chapters: [] };
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    const neededLen = charChapters.length > 0
      ? Math.max(...charChapters.map(c => c.charIdx)) + 1
      : 0;
    while (progress[char.id].chapters.length < neededLen) {
      progress[char.id].chapters.push({ completed: false, stars: 0, bestScore: null, bestPct: null });
    }
  }

  // Filter chapters to the selected character AND selected theme
  const charChapters = char
    ? CHAPTERS.filter(ch => ch.character === char.id && ch.theme === state.selectedTheme)
    : [];
  const charProgress = char ? (progress[char.id] || { chapters: [] }) : { chapters: [] };

  charChapters.forEach(ch => {
    const unlocked = isChapterUnlocked(ch, progress);
    const chProgress = charProgress.chapters[ch.charIdx] || {};

    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.classList.add(unlocked ? 'unlocked' : 'locked');
    if (chProgress.completed) card.classList.add('completed');
    if (ch.id === newlyUnlockedChapter) card.classList.add('newly-unlocked');
    if (ch.lightning) card.classList.add('lightning-chapter');
    if (ch.villainEncounter) card.classList.add('villain-encounter-chapter');

    // ── Header row
    const header = document.createElement('div');
    header.className = 'chapter-header';

    const emojiEl = document.createElement('span');
    emojiEl.className = 'chapter-emoji';
    emojiEl.textContent = ch.emoji;

    const titleEl = document.createElement('div');
    titleEl.className = 'chapter-title';
    titleEl.textContent = ch.title;
    if (ch.villainEncounter) {
      const veBadge = document.createElement('span');
      veBadge.className = 'chapter-villain-badge';
      veBadge.textContent = '⚔️ Villain Encounter';
      titleEl.appendChild(veBadge);
    }
    if (ch.lightning) {
      const lightningBadge = document.createElement('span');
      lightningBadge.className = 'chapter-lightning-badge';
      lightningBadge.textContent = '⚡ Lightning';
      titleEl.appendChild(lightningBadge);
    }

    const badgeEl = document.createElement('div');
    badgeEl.className = 'chapter-status-badge';
    if (!unlocked) {
      badgeEl.textContent = '🔒';
    } else if (chProgress.completed) {
      badgeEl.textContent = '✅';
    }

    header.append(emojiEl, titleEl, badgeEl);

    // ── Stars / lock row
    const starsEl = document.createElement('div');
    starsEl.className = 'chapter-stars';
    if (!unlocked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'chapter-locked-note';
      lockNote.textContent = 'Complete the previous chapter to unlock';
      starsEl.appendChild(lockNote);
    } else {
      const earned = chProgress.stars || 0;
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.textContent = i < earned ? '⭐' : '☆';
        starsEl.appendChild(s);
      }
      if (ch.lightning) {
        // Show lightning best score instead of percentage
        if (chProgress.lightningBestCorrect > 0) {
          const bestEl = document.createElement('span');
          bestEl.className = 'chapter-best-pct';
          bestEl.textContent = `⚡ Best: ${chProgress.lightningBestCorrect} correct`;
          starsEl.appendChild(bestEl);
        }
      } else if (chProgress.bestPct !== null) {
        const bestEl = document.createElement('span');
        bestEl.className = 'chapter-best-pct';
        bestEl.textContent = `Best: ${chProgress.bestPct}%`;
        starsEl.appendChild(bestEl);
      }
    }

    card.append(header, starsEl);

    if (unlocked) {
      const storyEl = document.createElement('p');
      storyEl.className = 'chapter-story';
      storyEl.textContent = ch.story;
      card.insertBefore(storyEl, starsEl);

      // Lightning round description blurb
      if (ch.lightning) {
        const lightningDesc = document.createElement('p');
        lightningDesc.className = 'chapter-lightning-desc';
        lightningDesc.textContent = `⚡ Lightning Round! Answer as many questions as you can in ${state.settings.lightningDuration} seconds. Get ${state.settings.lightningPassCount} correct to pass!`;
        card.insertBefore(lightningDesc, starsEl);
      }

      const playBtn = document.createElement('button');
      playBtn.className = `btn btn-primary chapter-play-btn${ch.lightning ? ' lightning-play-btn' : ''}${ch.villainEncounter && !ch.lightning ? ' villain-play-btn' : ''}`;
      playBtn.setAttribute('type', 'button');
      playBtn.textContent = chProgress.completed
        ? (ch.lightning ? '⚡ Play Again' : '🔄 Play Again')
        : (ch.lightning ? '⚡ Start Lightning Round' : ch.villainEncounter ? '⚔️ Start Villain Encounter' : '▶ Play');
      playBtn.addEventListener('click', () => startChapter(ch.id));
      card.appendChild(playBtn);
    }

    list.appendChild(card);
  });

  if (newlyUnlockedChapter !== null) {
    // Chapter id equals its index in CHAPTERS, so direct access is O(1)
    const ch = CHAPTERS[newlyUnlockedChapter];
    if (ch) {
      // Show 1-based story number within its theme
      const themeIdx = CHAPTERS.filter(c => c.character === ch.character && c.theme === ch.theme)
        .findIndex(c => c.id === ch.id);
      setTimeout(() => showToast(`🎉 ${ch.emoji} Story ${themeIdx + 1} unlocked!`), NEWLY_UNLOCKED_TOAST_DELAY_MS);
    }
  }
}

function startChapter(chapterId) {
  const ch = CHAPTERS[chapterId];
  state.storyMode   = true;
  state.chapterId   = chapterId;
  state.lightningMode = !!ch.lightning;

  // Set player name and mode in the DOM so startGame() can read them,
  // then launch directly into the game without showing the start screen.
  $('#name-input').value = getCurrentUser() || '';
  $$('.mode-btn').forEach(b => b.classList.remove('selected'));
  const modeBtn = $(`.mode-btn[data-mode="${ch.mode}"]`);
  if (modeBtn) modeBtn.classList.add('selected');

  startGame();
}

// ── Story completion ──────────────────────────────────────────
function handleStoryCompletion(pct) {
  const ch = CHAPTERS[state.chapterId];
  const passed = pct >= ch.passPct;
  const stars  = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;

  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  if (!user) return { passed, newlyUnlockedChapter: null };

  const charProgress = user.storyProgress[ch.character];
  const chProgress   = charProgress.chapters[ch.charIdx];
  const wasCompleted = chProgress.completed;

  if (passed) {
    chProgress.completed = true;
    chProgress.stars     = Math.max(chProgress.stars || 0, stars);
    chProgress.bestScore = Math.max(chProgress.bestScore || 0, state.score);
    chProgress.bestPct   = Math.max(chProgress.bestPct || 0, pct);
    user.lastPlayed = Date.now();
    saveUserProgress(user);
  }

  // Detect if completing this chapter unlocks the next one for the first time
  let newlyUnlockedChapter = null;
  let newlyUnlockedCharacter = null;
  if (passed && !wasCompleted) {
    const nextChapter = CHAPTERS.find(
      c => c.character === ch.character && c.charIdx === ch.charIdx + 1 && c.theme === ch.theme
    );
    if (nextChapter) {
      newlyUnlockedChapter = nextChapter.id;
    } else {
      // This was the last chapter — check if the next character is now unlocked
      const themeChars = getThemeCharacters(ch.theme);
      const currentCharIdx = themeChars.findIndex(c => c.id === ch.character);
      if (currentCharIdx >= 0 && currentCharIdx + 1 < themeChars.length) {
        newlyUnlockedCharacter = themeChars[currentCharIdx + 1].id;
      }
    }
  }

  return { passed, newlyUnlockedChapter, newlyUnlockedCharacter };
}

// ── Lightning round completion ────────────────────────────────
function handleLightningCompletion(correct) {
  const ch     = CHAPTERS[state.chapterId];
  const needed = state.settings.lightningPassCount;
  const passed = correct >= needed;

  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  if (!user) return { newlyUnlockedChapter: null, newlyUnlockedCharacter: null };

  const charProgress = user.storyProgress[ch.character];
  const chProgress   = charProgress.chapters[ch.charIdx];
  const wasCompleted = chProgress.completed;

  // Update per-chapter lightning best
  chProgress.lightningBestCorrect = Math.max(chProgress.lightningBestCorrect || 0, correct);
  chProgress.lightningBestScore   = Math.max(chProgress.lightningBestScore   || 0, state.score);

  // Update all-time user best
  user.bestLightningCorrect = Math.max(user.bestLightningCorrect || 0, correct);
  user.bestLightningScore   = Math.max(user.bestLightningScore   || 0, state.score);

  if (passed) {
    chProgress.completed = true;
    chProgress.stars     = Math.max(chProgress.stars || 0, lightningStars(correct, needed));
    chProgress.bestScore = Math.max(chProgress.bestScore || 0, state.score);
    user.lastPlayed = Date.now();
  }

  saveUserProgress(user);

  // Detect newly unlocked chapter / character
  let newlyUnlockedChapter   = null;
  let newlyUnlockedCharacter = null;
  if (passed && !wasCompleted) {
    const nextChapter = CHAPTERS.find(
      c => c.character === ch.character && c.charIdx === ch.charIdx + 1 && c.theme === ch.theme
    );
    if (nextChapter) {
      newlyUnlockedChapter = nextChapter.id;
    } else {
      const themeChars     = getThemeCharacters(ch.theme);
      const currentCharIdx = themeChars.findIndex(c => c.id === ch.character);
      if (currentCharIdx >= 0 && currentCharIdx + 1 < themeChars.length) {
        newlyUnlockedCharacter = themeChars[currentCharIdx + 1].id;
      }
    }
  }

  return { newlyUnlockedChapter, newlyUnlockedCharacter };
}

// ── Game flow ─────────────────────────────────────────────────
function startGame() {
  const nameInput = $('#name-input').value.trim();
  state.playerName = nameInput || 'Player';
  state.mode       = getSelectedMode();
  state.index      = 0;
  state.score      = 0;
  state.streak     = 0;
  state.history    = [];
  state.resultsShown = false;

  // Lightning mode is only valid within story mode; reset for free play
  if (!state.storyMode) {
    state.lightningMode = false;
  }

  if (state.lightningMode) {
    // Lightning round: generate questions on the fly; start with one
    state.lightningCount    = 0;
    state.lightningCorrect  = 0;
    state.lightningTimeLeft = state.settings.lightningDuration;
    state.questions = [generateQuestion(state.mode)];
  } else {
    state.questions = buildRound(state.mode);
  }

  showScreen('#game-screen');

  // Show/hide lightning HUD banner
  const lightningBanner = $('#lightning-hud-banner');
  if (lightningBanner) {
    lightningBanner.style.display = state.lightningMode ? 'flex' : 'none';
  }

  if (state.lightningMode) {
    startLightningTimer();
  }

  loadQuestion();
}

function getSelectedMode() {
  const btn = $('.mode-btn.selected');
  return btn ? btn.dataset.mode : 'both';
}

function loadQuestion() {
  const q = state.questions[state.index];
  state.answered = false;
  state.lightningQuestionStart = Date.now();

  // HUD
  $('#hud-score').textContent  = state.score;
  $('#hud-streak').textContent = state.streak === 0 ? '—' : `🔥${state.streak}`;

  if (state.lightningMode) {
    $('#hud-q').textContent = `✓ ${state.lightningCorrect}`;
    const hudLabel = $('#hud-q-lbl');
    if (hudLabel) hudLabel.textContent = 'Correct';
  } else {
    $('#hud-q').textContent = `${state.index + 1}/${QUESTIONS_PER_ROUND}`;
    const hudLabel = $('#hud-q-lbl');
    if (hudLabel) hudLabel.textContent = 'Question';
  }

  // Progress bar
  if (state.lightningMode) {
    // Progress bar tracks time elapsed (updated by lightning timer interval)
    const elapsed = state.settings.lightningDuration - state.lightningTimeLeft;
    $('#progress-bar').style.width = `${(elapsed / state.settings.lightningDuration) * 100}%`;
  } else {
    const pct = (state.index / QUESTIONS_PER_ROUND) * 100;
    $('#progress-bar').style.width = `${pct}%`;
  }

  // Question
  $('#question-type-badge').textContent = q.type === 'multiply' ? '✖ Multiplication' : '➗ Division';
  $('#question-text').textContent       = q.display + ' = ?';

  // Answer buttons – reset styles and remove focus so the previously
  // selected button does not retain a highlighted border on the new question.
  const btns = $$('.answer-btn');
  btns.forEach((btn, i) => {
    btn.textContent = q.options[i];
    btn.dataset.value = q.options[i];
    btn.className  = 'answer-btn';
    btn.disabled   = false;
    btn.blur();
  });

  // Timer – only start per-question timer in normal mode
  if (!state.lightningMode) {
    startTimer();
  }
}

function handleAnswer(chosen) {
  if (state.answered) return;
  state.answered = true;

  if (!state.lightningMode) {
    stopTimer();
  }

  const elapsed = state.lightningMode
    ? (Date.now() - state.lightningQuestionStart) / 1000
    : (state.settings.timerDuration - state.timeLeft);
  const q       = state.questions[state.index];
  const correct = chosen === q.answer;

  // Visual feedback on buttons
  $$('.answer-btn').forEach(btn => {
    btn.disabled = true;
    const v = Number(btn.dataset.value);
    if (v === q.answer)   btn.classList.add('correct');
    if (v === chosen && !correct) btn.classList.add('wrong');
  });

  if (correct) {
    state.score  += scorePoints(elapsed, state.lightningMode);
    state.streak += 1;
    if (state.lightningMode) state.lightningCorrect += 1;
    showToast(streakMessage(state.streak));
  } else {
    state.streak = 0;
    showToast(`Nope! Answer: ${q.answer}`, true);
  }

  if (state.lightningMode) state.lightningCount += 1;

  state.history.push({
    question: q.display + ' = ?',
    correct,
    given:    chosen,
    expected: q.answer,
    ms:       Math.round(elapsed * 1000),
  });

  // Update score display immediately
  $('#hud-score').textContent  = state.score;
  $('#hud-streak').textContent = state.streak === 0 ? '—' : `🔥${state.streak}`;
  if (state.lightningMode) {
    $('#hud-q').textContent = `✓ ${state.lightningCorrect}`;
    const hudLabel = $('#hud-q-lbl');
    if (hudLabel) hudLabel.textContent = 'Correct';
  }

  setTimeout(nextQuestion, 900);
}

function handleTimeout() {
  handleAnswer(TIMEOUT_ANSWER);
}

function scorePoints(elapsed, lightning = false) {
  // For lightning rounds: LIGHTNING_REF_SECS is the reference for max points (fast answers rewarded more)
  const refDuration = lightning ? LIGHTNING_REF_SECS : state.settings.timerDuration;
  // MAX_POINTS pts for the fastest answers, scaling down to MIN_POINTS at refDuration
  const range = MAX_POINTS - MIN_POINTS;
  const base  = Math.round(MAX_POINTS - Math.min(range, elapsed * range / refDuration));
  return Math.max(MIN_POINTS, base);
}

function streakMessage(streak) {
  if (streak >= 10) return '🌟 Amazing streak!';
  if (streak >= 5)  return '🔥 On fire!';
  if (streak >= 3)  return '⚡ Keep going!';
  return '✓ Correct!';
}

/**
 * Calculate stars for a lightning round.
 * 1 star = passed, 2 stars = 25% over needed, 3 stars = 50% over needed.
 */
function lightningStars(correct, needed) {
  if (correct < needed)          return 0;
  if (correct >= needed * 1.5)   return 3;
  if (correct >= needed * 1.25)  return 2;
  return 1;
}

function nextQuestion() {
  state.index += 1;
  if (state.lightningMode) {
    if (state.lightningTimeLeft <= 0) {
      showResults();
    } else {
      // Generate the next question on the fly for lightning rounds
      state.questions[state.index] = generateQuestion(state.mode);
      loadQuestion();
    }
  } else if (state.index >= QUESTIONS_PER_ROUND) {
    showResults();
  } else {
    loadQuestion();
  }
}

// ── Results screen ────────────────────────────────────────────
function showResults() {
  // Guard against double invocation (e.g. timer fires while nextQuestion() timeout is pending)
  if (state.resultsShown) return;
  state.resultsShown = true;

  // Stop any active timers
  stopLightningTimer();
  stopTimer();

  showScreen('#results-screen');

  if (state.lightningMode) {
    showLightningResults();
    return;
  }

  const correct  = state.history.filter(h => h.correct).length;
  const pct      = Math.round((correct / QUESTIONS_PER_ROUND) * 100);
  const avgMs    = Math.round(
    state.history.reduce((sum, h) => sum + h.ms, 0) / state.history.length
  );
  const maxScore = QUESTIONS_PER_ROUND * 10;
  const stars    = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;

  // Trophy emoji based on stars
  const trophies = ['😅', '🥉', '🥈', '🏆'];
  $('#result-trophy').textContent = trophies[stars];
  $('#result-name').textContent   = `Well done, ${state.playerName}!`;
  $('#result-sub').textContent    = `You scored ${pct}% (${correct}/${QUESTIONS_PER_ROUND} correct)`;

  // Stars
  $('#result-stars').innerHTML = Array.from({ length: 3 }, (_, i) =>
    `<span>${i < stars ? '⭐' : '☆'}</span>`
  ).join('');

  // Stats
  $('#stat-score').textContent    = state.score;
  $('#stat-maxscore').textContent = `/ ${maxScore}`;
  $('#stat-correct').textContent  = correct;
  $('#stat-avgtime').textContent  = `${(avgMs / 1000).toFixed(1)}s`;

  // History log – use DOM construction to avoid innerHTML with dynamic content
  const list = $('#history-list');
  list.textContent = '';
  state.history.forEach(h => {
    const row  = document.createElement('div');
    row.className = `history-item ${h.correct ? 'ok' : 'bad'}`;

    const qEl = document.createElement('span');
    qEl.className = 'hi-q';
    qEl.textContent = h.question;

    const aEl = document.createElement('span');
    aEl.className = 'hi-a';
    aEl.textContent = h.correct ? '✓' : `✗ (ans: ${h.expected})`;

    const tEl = document.createElement('span');
    tEl.className = 'hi-t';
    tEl.textContent = `${(h.ms / 1000).toFixed(1)}s`;

    row.append(qEl, aEl, tEl);
    list.appendChild(row);
  });

  // ── Story mode extras
  const banner      = $('#story-result-banner');
  const backBtn     = $('#back-to-story-btn');

  if (state.storyMode) {
    const ch = CHAPTERS[state.chapterId];
    const { passed, newlyUnlockedChapter, newlyUnlockedCharacter } = handleStoryCompletion(pct);
    state.newlyUnlockedChapter = newlyUnlockedChapter;
    state.newlyUnlockedCharacter = newlyUnlockedCharacter;

    // Build chapter result banner with DOM methods (no innerHTML for user data)
    banner.textContent = '';

    const chapterLabel = document.createElement('div');
    chapterLabel.className = 'srb-chapter';
    chapterLabel.textContent = `${ch.emoji} ${ch.title}`;

    const resultLine = document.createElement('div');
    resultLine.className = `srb-result ${passed ? 'srb-passed' : 'srb-failed'}`;

    if (passed) {
      resultLine.textContent = `✅ Chapter complete! (${pct}% — need ${ch.passPct}%)`;
    } else {
      resultLine.textContent = `❌ Not quite… ${pct}% scored, need ${ch.passPct}% to pass. Try again!`;
    }

    banner.append(chapterLabel, resultLine);
    banner.style.display = 'block';
    backBtn.style.display = 'flex';
  } else {
    banner.style.display = 'none';
    backBtn.style.display = 'none';
    state.newlyUnlockedChapter = null;
  }
}

// ── Lightning results ─────────────────────────────────────────
function showLightningResults() {
  const correct   = state.lightningCorrect;
  const attempted = state.lightningCount;
  const needed    = state.settings.lightningPassCount;
  const passed    = correct >= needed;
  const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const avgMs     = state.history.length > 0
    ? Math.round(state.history.reduce((sum, h) => sum + h.ms, 0) / state.history.length)
    : 0;
  const stars     = lightningStars(correct, needed);

  // Trophy emoji based on stars
  const trophies = ['😅', '🥉', '🥈', '🏆'];
  $('#result-trophy').textContent = trophies[stars];
  $('#result-name').textContent   = `Well done, ${state.playerName}!`;
  $('#result-sub').textContent    = `⚡ ${correct} correct in ${state.settings.lightningDuration}s!`;

  // Stars
  $('#result-stars').innerHTML = Array.from({ length: 3 }, (_, i) =>
    `<span>${i < stars ? '⭐' : '☆'}</span>`
  ).join('');

  // Stats – reuse existing stat elements
  $('#stat-score').textContent    = state.score;
  $('#stat-maxscore').textContent = '';
  $('#stat-correct').textContent  = `${correct}/${attempted}`;
  $('#stat-avgtime').textContent  = avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : '—';

  // History log
  const list = $('#history-list');
  list.textContent = '';
  state.history.forEach(h => {
    const row = document.createElement('div');
    row.className = `history-item ${h.correct ? 'ok' : 'bad'}`;

    const qEl = document.createElement('span');
    qEl.className = 'hi-q';
    qEl.textContent = h.question;

    const aEl = document.createElement('span');
    aEl.className = 'hi-a';
    aEl.textContent = h.correct ? '✓' : `✗ (ans: ${h.expected})`;

    const tEl = document.createElement('span');
    tEl.className = 'hi-t';
    tEl.textContent = `${(h.ms / 1000).toFixed(1)}s`;

    row.append(qEl, aEl, tEl);
    list.appendChild(row);
  });

  // ── Story mode banner
  const banner  = $('#story-result-banner');
  const backBtn = $('#back-to-story-btn');

  if (state.storyMode) {
    const ch = CHAPTERS[state.chapterId];
    const { newlyUnlockedChapter, newlyUnlockedCharacter } = handleLightningCompletion(correct);
    state.newlyUnlockedChapter    = newlyUnlockedChapter;
    state.newlyUnlockedCharacter  = newlyUnlockedCharacter;

    banner.textContent = '';

    const chapterLabel = document.createElement('div');
    chapterLabel.className = 'srb-chapter';
    chapterLabel.textContent = `⚡ ${ch.emoji} ${ch.title} — Lightning Round!`;

    const resultLine = document.createElement('div');
    resultLine.className = `srb-result ${passed ? 'srb-passed' : 'srb-failed'}`;
    if (passed) {
      resultLine.textContent = `✅ Round complete! ${correct}/${attempted} correct (need ${needed})`;
    } else {
      resultLine.textContent = `❌ Not quite… ${correct} correct, need ${needed} to pass. Try again!`;
    }

    // Best score line
    const bestLine = document.createElement('div');
    bestLine.className = 'srb-best';
    const userName = getCurrentUser();
    const user = getUserProgress(userName);
    const userBest = user ? (user.bestLightningCorrect || 0) : 0;
    bestLine.textContent = `🏆 All-time best: ${userBest} correct`;

    banner.append(chapterLabel, resultLine, bestLine);
    banner.style.display = 'block';
    backBtn.style.display = 'flex';
  } else {
    banner.style.display = 'none';
    backBtn.style.display = 'none';
    state.newlyUnlockedChapter = null;
  }
}

// ── Event wiring ───────────────────────────────────────────────
// Handle bfcache restoration on mobile (page restored from browser cache does
// not re-fire DOMContentLoaded; pageshow fires with event.persisted = true).
// Re-render the login screen if active and ensure the modal is properly
// dismissed so that user-card click events are never blocked by a stale modal state.

// If a cloud session is active, pull the latest progress from the cloud and
// re-render the login screen so that progress saved on other devices is
// immediately visible to the user.
function syncCloudIfLoggedIn() {
  if (typeof PlayFabManager !== 'undefined' && PlayFabManager.isLoggedIn
      && typeof CloudSync !== 'undefined') {
    CloudSync.syncFromCloud(() => {
      renderLoginScreen();
      // Re-render whichever data-dependent screen is currently visible so
      // that merged cloud progress is reflected immediately, even if the
      // user navigated to that screen before the async sync completed.
      const activeEl = document.querySelector('.screen.active');
      if (activeEl) {
        if      (activeEl.id === 'chapter-screen')   renderChapterScreen();
        else if (activeEl.id === 'character-screen') renderCharacterScreen(null);
        else if (activeEl.id === 'story-screen')     renderStoryScreen(null);
      }
    });
  }
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Always hide the modal – it may have been left open if the user was
    // mid-sign-in when the page was suspended (e.g. Google popup opened).
    const modal = document.getElementById('mg-login-modal');
    if (modal) modal.style.display = 'none';

    // Only re-render the login screen if it is currently the active screen;
    // other screens should stay as-is (e.g. story/chapter/game screens).
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen && loginScreen.classList.contains('active')) {
      if (typeof PlayFabManager !== 'undefined') {
        PlayFabManager.initialize();
      }
      renderLoginScreen();
      syncCloudIfLoggedIn();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialise PlayFab (restores session from localStorage if present)
  if (typeof PlayFabManager !== 'undefined') {
    PlayFabManager.initialize();
  }

  // Explicitly hide the login modal so it can never intercept touch events
  // on page load (guards against CSS not yet applied or bfcache edge-cases).
  const modal = document.getElementById('mg-login-modal');
  if (modal) modal.style.display = 'none';

  // ── Login screen
  renderLoginScreen();

  // If a session was restored from localStorage, sync progress from the cloud
  // immediately so that progress made on other devices is visible right away.
  // Wrapped in try-catch: a synchronous throw from the PlayFab SDK must not
  // abort DOMContentLoaded and leave button event listeners unregistered.
  try {
    syncCloudIfLoggedIn();
  } catch (e) {
    console.warn('Cloud sync on startup failed —', e);
  }

  $('#add-player-btn').addEventListener('click', () => {
    const input = $('#add-player-input');
    addPlayer(input.value);
    input.value = '';
  });

  $('#add-player-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      addPlayer(e.target.value);
      e.target.value = '';
    }
  });

  // Cloud login button (optional Google sign-in / sign-out)
  $('#cloud-login-btn').addEventListener('click', () => {
    const loggedIn = typeof PlayFabManager !== 'undefined' && PlayFabManager.isLoggedIn;
    if (loggedIn) {
      if (typeof LoginModal !== 'undefined') {
        LoginModal.triggerLogout();
      } else if (typeof PlayFabManager !== 'undefined') {
        PlayFabManager.logout();
      }
      renderCloudLoginStatus();
    } else {
      if (typeof LoginModal !== 'undefined') {
        LoginModal.show(() => {
          renderLoginScreen();
        });
      }
    }
  });

  // ── Chapter screen
  $('#chapter-switch-user-btn').addEventListener('click', () => {
    renderLoginScreen();
    showScreen('#login-screen');
  });

  $('#chapter-settings-btn').addEventListener('click', () => {
    renderSettingsScreen();
    showScreen('#settings-screen');
  });

  // ── Character screen (back → chapter select)
  $('#back-to-chapters-btn').addEventListener('click', () => {
    renderChapterScreen();
    showScreen('#chapter-screen');
  });

  // ── Settings screen
  const timerInput  = $('#timer-duration-input');
  const timerVal    = $('#timer-duration-val');
  const maxNumInput = $('#max-number-input');
  const maxNumVal   = $('#max-number-val');
  const lightningDurInput  = $('#lightning-duration-input');
  const lightningDurVal    = $('#lightning-duration-val');
  const lightningPassInput = $('#lightning-pass-input');
  const lightningPassVal   = $('#lightning-pass-val');

  timerInput.addEventListener('input', () => {
    timerVal.textContent = `${timerInput.value}s`;
  });

  maxNumInput.addEventListener('input', () => {
    maxNumVal.textContent = maxNumInput.value;
  });

  if (lightningDurInput) {
    lightningDurInput.addEventListener('input', () => {
      lightningDurVal.textContent = `${lightningDurInput.value}s`;
    });
  }

  if (lightningPassInput) {
    lightningPassInput.addEventListener('input', () => {
      lightningPassVal.textContent = lightningPassInput.value;
    });
  }

  $('#back-from-settings-btn').addEventListener('click', () => {
    showScreen('#chapter-screen');
  });

  $('#save-settings-btn').addEventListener('click', () => {
    const newSettings = {
      timerDuration:      Number(timerInput.value),
      maxNumber:          Number(maxNumInput.value),
      allowDivision:      $('#allow-division-input').checked,
      lightningDuration:  lightningDurInput  ? Number(lightningDurInput.value)  : DEFAULT_SETTINGS.lightningDuration,
      lightningPassCount: lightningPassInput ? Number(lightningPassInput.value) : DEFAULT_SETTINGS.lightningPassCount,
    };
    state.settings = newSettings;
    saveUserSettings(getCurrentUser(), newSettings);

    // Dev mode is local-only — saved to a separate key, never synced to cloud
    // Only available for DEV_MODE_ALLOWED_USER
    const devModeInput = $('#dev-mode-input');
    if (devModeInput && getCurrentUser() === DEV_MODE_ALLOWED_USER) {
      const devEnabled = devModeInput.checked;
      setDevMode(getCurrentUser(), devEnabled);
      state.devMode = devEnabled;
    }

    showToast('✓ Settings saved!');
    renderChapterScreen();
    showScreen('#chapter-screen');
  });

  // ── Story screen (back → character select)
  $('#back-to-characters-btn').addEventListener('click', () => {
    renderCharacterScreen(null);
    showScreen('#character-screen');
  });

  // ── Start screen: mode selection
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Start button
  $('#start-btn').addEventListener('click', startGame);

  // Allow pressing Enter on name field to start
  $('#name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
  });

  // ── Game screen: answer buttons
  $$('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAnswer(Number(btn.dataset.value));
    });
  });

  // ── Results screen buttons
  $('#play-again-btn').addEventListener('click', () => {
    if (state.storyMode) {
      // Restart the same chapter directly (name/mode already set in DOM)
      startGame();
    } else {
      showScreen('#start-screen');
    }
  });

  $('#back-to-story-btn').addEventListener('click', () => {
    // If the last play unlocked a new character, go back to character screen to show it
    if (state.newlyUnlockedCharacter) {
      const unlockedId = state.newlyUnlockedCharacter;
      state.newlyUnlockedCharacter = null;
      renderCharacterScreen(unlockedId);
      showScreen('#character-screen');
    } else {
      // Return to the story map for the current character + theme
      renderStoryScreen(state.newlyUnlockedChapter);
      showScreen('#story-screen');
    }
  });
});

