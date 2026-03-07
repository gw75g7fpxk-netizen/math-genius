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
const TIMEOUT_ANSWER           = null; // sentinel value meaning no answer was given
const MAX_PLAYER_NAME_LENGTH   = 20;   // must match maxlength on #add-player-input in HTML
const NEWLY_UNLOCKED_TOAST_DELAY_MS = 400;

// ── Default user settings ─────────────────────────────────────
const DEFAULT_SETTINGS = {
  timerDuration: TIME_PER_QUESTION, // seconds per question (5–30)
  maxNumber:     10,                // max operand for questions (2–12)
  allowDivision: true,              // when false, division is replaced by multiplication
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
    description: 'A giraffe chocolatier who runs the beloved chocolate shop at the end of the street — the highlight of Humphrey\'s morning walk!',
  },
  {
    id: 'vaporeon',
    name: 'Vaporeon',
    emoji: '💧',
    description: 'A strong and kind Water Pokémon who can only say her own name — but shoots a powerful water cannon blast from her mouth! A very good friend of Margret and the Tigey\'s.',
  },
];

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
  chapterId:            null,       // which chapter (0-4) is being played
  selectedCharacter:    null,       // character id chosen on the character screen
  newlyUnlockedChapter: null,       // chapter id unlocked after last completion
  newlyUnlockedCharacter: null,     // character id unlocked after last completion
  settings:             { ...DEFAULT_SETTINGS }, // active user's settings
};

// ── LocalStorage helpers ──────────────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem('mathgenius_users') || '[]');
}
function saveUsers(users) {
  localStorage.setItem('mathgenius_users', JSON.stringify(users));
}
function getCurrentUser() {
  return localStorage.getItem('mathgenius_currentUser') || null;
}
function setCurrentUser(name) {
  localStorage.setItem('mathgenius_currentUser', name);
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
  CHARACTERS.forEach(char => {
    user.storyProgress[char.id] = user.storyProgress[char.id] || { chapters: [] };
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    while (user.storyProgress[char.id].chapters.length < charChapters.length) {
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
  if (ch.charIdx === 0) return true;
  const charProgress = progress[ch.character];
  if (!charProgress) return false;
  const prev = charProgress.chapters[ch.charIdx - 1];
  return prev && prev.completed;
}

/** Returns true when all chapters of character at CHARACTERS[charIndex-1] are done. */
function isCharacterUnlocked(charIndex, progress) {
  if (charIndex === 0) return true;
  const prevChar = CHARACTERS[charIndex - 1];
  const prevProgress = progress[prevChar.id];
  if (!prevProgress) return false;
  const prevChapters = CHAPTERS.filter(ch => ch.character === prevChar.id);
  return prevChapters.length > 0 &&
    prevChapters.every((ch, i) => prevProgress.chapters[i] && prevProgress.chapters[i].completed);
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

// ── Timer ─────────────────────────────────────────────────────
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

function updateTimerUI() {
  const ring  = $('#timer-ring');
  const numEl = $('#timer-num');
  const fg    = $('#ring-fg');
  const frac  = state.timeLeft / state.settings.timerDuration;
  const offset = CIRCUMFERENCE * (1 - frac);

  fg.style.strokeDashoffset = offset;
  numEl.textContent = Math.ceil(state.timeLeft);
  ring.classList.toggle('urgent', state.timeLeft <= 3);
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
}

function loginUser(name) {
  setCurrentUser(name);
  const users = getUsers();
  const user = users.find(u => u.name === name);
  if (user) {
    user.lastPlayed = Date.now();
    saveUsers(users);
  }
  state.settings = getUserSettings(name);
  state.selectedCharacter = null;
  state.newlyUnlockedCharacter = null;
  renderCharacterScreen(null);
  showScreen('#character-screen');
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
  saveUsers(users);
  loginUser(name);
}

// ── Character select screen ───────────────────────────────────
function renderCharacterScreen(newlyUnlockedCharacterId) {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  const progress = user ? user.storyProgress : {};

  // Ensure progress slots exist for all characters
  CHARACTERS.forEach(char => {
    progress[char.id] = progress[char.id] || { chapters: [] };
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    while (progress[char.id].chapters.length < charChapters.length) {
      progress[char.id].chapters.push({ completed: false, stars: 0, bestScore: null, bestPct: null });
    }
  });

  $('#char-screen-username').textContent = userName || '';

  const grid = $('#character-grid');
  grid.textContent = '';

  CHARACTERS.forEach((char, charIndex) => {
    const unlocked = isCharacterUnlocked(charIndex, progress);
    const charProgress = progress[char.id];
    const charChapters = CHAPTERS.filter(ch => ch.character === char.id);
    const completedCount = charChapters.filter((ch, i) =>
      charProgress.chapters[i] && charProgress.chapters[i].completed
    ).length;
    const allDone = completedCount === charChapters.length;

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
        ? `Complete ${CHARACTERS[charIndex - 1].name}'s story to unlock!`
        : 'Locked';

    const progressEl = document.createElement('div');
    progressEl.className = 'character-card-progress';
    if (!unlocked) {
      progressEl.textContent = '🔒 Locked';
    } else if (allDone) {
      progressEl.textContent = '✅ All chapters complete!';
    } else {
      progressEl.textContent = `${completedCount} / ${charChapters.length} chapters complete`;
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

  timerInput.value  = s.timerDuration;
  timerVal.textContent = `${s.timerDuration}s`;

  maxNumInput.value = s.maxNumber;
  maxNumVal.textContent = s.maxNumber;

  divToggle.checked = s.allowDivision;
}


function renderStoryScreen(newlyUnlockedChapter) {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  const charId = state.selectedCharacter;
  const char = CHARACTERS.find(c => c.id === charId);

  $('#story-character-title').textContent = char ? char.name : '';

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
    while (progress[char.id].chapters.length < charChapters.length) {
      progress[char.id].chapters.push({ completed: false, stars: 0, bestScore: null, bestPct: null });
    }
  }

  const charChapters = char ? CHAPTERS.filter(ch => ch.character === char.id) : [];
  const charProgress = char ? (progress[char.id] || { chapters: [] }) : { chapters: [] };

  charChapters.forEach(ch => {
    const unlocked = isChapterUnlocked(ch, progress);
    const chProgress = charProgress.chapters[ch.charIdx];

    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.classList.add(unlocked ? 'unlocked' : 'locked');
    if (chProgress.completed) card.classList.add('completed');
    if (ch.id === newlyUnlockedChapter) card.classList.add('newly-unlocked');

    // ── Header row
    const header = document.createElement('div');
    header.className = 'chapter-header';

    const emojiEl = document.createElement('span');
    emojiEl.className = 'chapter-emoji';
    emojiEl.textContent = ch.emoji;

    const titleEl = document.createElement('div');
    titleEl.className = 'chapter-title';
    titleEl.textContent = ch.title;

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
      if (chProgress.bestPct !== null) {
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

      const playBtn = document.createElement('button');
      playBtn.className = 'btn btn-primary chapter-play-btn';
      playBtn.setAttribute('type', 'button');
      playBtn.textContent = chProgress.completed ? '🔄 Play Again' : '▶ Play';
      playBtn.addEventListener('click', () => startChapter(ch.id));
      card.appendChild(playBtn);
    }

    list.appendChild(card);
  });

  if (newlyUnlockedChapter !== null) {
    const ch = CHAPTERS[newlyUnlockedChapter];
    // Delay slightly so the screen transition completes first
    setTimeout(() => showToast(`🎉 ${ch.emoji} Chapter ${ch.charIdx + 1} unlocked!`), NEWLY_UNLOCKED_TOAST_DELAY_MS);
  }
}

function startChapter(chapterId) {
  const ch = CHAPTERS[chapterId];
  state.storyMode  = true;
  state.chapterId  = chapterId;

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
    const nextChapter = CHAPTERS.find(c => c.character === ch.character && c.charIdx === ch.charIdx + 1);
    if (nextChapter) {
      newlyUnlockedChapter = nextChapter.id;
    } else {
      // This was the last chapter — check if the next character is now unlocked
      const currentCharIdx = CHARACTERS.findIndex(c => c.id === ch.character);
      if (currentCharIdx >= 0 && currentCharIdx + 1 < CHARACTERS.length) {
        newlyUnlockedCharacter = CHARACTERS[currentCharIdx + 1].id;
      }
    }
  }

  return { passed, newlyUnlockedChapter, newlyUnlockedCharacter };
}

// ── Game flow ─────────────────────────────────────────────────
function startGame() {
  const nameInput = $('#name-input').value.trim();
  state.playerName = nameInput || 'Player';
  state.mode       = getSelectedMode();
  state.questions  = buildRound(state.mode);
  state.index      = 0;
  state.score      = 0;
  state.streak     = 0;
  state.history    = [];

  showScreen('#game-screen');
  loadQuestion();
}

function getSelectedMode() {
  const btn = $('.mode-btn.selected');
  return btn ? btn.dataset.mode : 'both';
}

function loadQuestion() {
  const q = state.questions[state.index];
  state.answered = false;

  // HUD
  $('#hud-score').textContent   = state.score;
  $('#hud-streak').textContent  = state.streak === 0 ? '—' : `🔥${state.streak}`;
  $('#hud-q').textContent       = `${state.index + 1}/${QUESTIONS_PER_ROUND}`;

  // Progress bar
  const pct = (state.index / QUESTIONS_PER_ROUND) * 100;
  $('#progress-bar').style.width = `${pct}%`;

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

  // Timer
  startTimer();
}

function handleAnswer(chosen) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const elapsed = (state.settings.timerDuration - state.timeLeft);
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
    state.score  += scorePoints(elapsed);
    state.streak += 1;
    showToast(streakMessage(state.streak));
  } else {
    state.streak = 0;
    showToast(`Nope! Answer: ${q.answer}`, true);
  }

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

  setTimeout(nextQuestion, 900);
}

function handleTimeout() {
  handleAnswer(TIMEOUT_ANSWER);
}

function scorePoints(elapsed) {
  // MAX_POINTS pts for the fastest answers, scaling down to MIN_POINTS at timerDuration
  const range = MAX_POINTS - MIN_POINTS;
  const base  = Math.round(MAX_POINTS - Math.min(range, elapsed * range / state.settings.timerDuration));
  return Math.max(MIN_POINTS, base);
}

function streakMessage(streak) {
  if (streak >= 10) return '🌟 Amazing streak!';
  if (streak >= 5)  return '🔥 On fire!';
  if (streak >= 3)  return '⚡ Keep going!';
  return '✓ Correct!';
}

function nextQuestion() {
  state.index += 1;
  if (state.index >= QUESTIONS_PER_ROUND) {
    showResults();
  } else {
    loadQuestion();
  }
}

// ── Results screen ────────────────────────────────────────────
function showResults() {
  showScreen('#results-screen');

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

// ── Event wiring ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // ── Login screen
  renderLoginScreen();

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

  // ── Character screen
  $('#char-switch-user-btn').addEventListener('click', () => {
    renderLoginScreen();
    showScreen('#login-screen');
  });

  $('#char-settings-btn').addEventListener('click', () => {
    renderSettingsScreen();
    showScreen('#settings-screen');
  });

  // ── Settings screen
  const timerInput  = $('#timer-duration-input');
  const timerVal    = $('#timer-duration-val');
  const maxNumInput = $('#max-number-input');
  const maxNumVal   = $('#max-number-val');

  timerInput.addEventListener('input', () => {
    timerVal.textContent = `${timerInput.value}s`;
  });

  maxNumInput.addEventListener('input', () => {
    maxNumVal.textContent = maxNumInput.value;
  });

  $('#back-from-settings-btn').addEventListener('click', () => {
    showScreen('#character-screen');
  });

  $('#save-settings-btn').addEventListener('click', () => {
    const newSettings = {
      timerDuration: Number(timerInput.value),
      maxNumber:     Number(maxNumInput.value),
      allowDivision: $('#allow-division-input').checked,
    };
    state.settings = newSettings;
    saveUserSettings(getCurrentUser(), newSettings);
    showToast('✓ Settings saved!');
    showScreen('#character-screen');
  });

  // ── Story screen
  $('#back-to-characters-btn').addEventListener('click', () => {
    renderCharacterScreen(state.newlyUnlockedCharacter);
    state.newlyUnlockedCharacter = null;
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
      renderStoryScreen(state.newlyUnlockedChapter);
      showScreen('#story-screen');
    }
  });
});

