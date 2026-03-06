/* ============================================================
   Math Genius – Game Logic
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const QUESTIONS_PER_ROUND = 20;
const TIME_PER_QUESTION   = 10;   // seconds
const CIRCUMFERENCE       = 2 * Math.PI * 27; // r=27 → ≈169.6
const MAX_POINTS          = 10;
const MIN_POINTS          = 1;
const TIMEOUT_ANSWER           = null; // sentinel value meaning no answer was given
const MAX_PLAYER_NAME_LENGTH   = 20;   // must match maxlength on #add-player-input in HTML
const NEWLY_UNLOCKED_TOAST_DELAY_MS = 400;

// ── Story chapters ────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 0,
    title: "Chapter 1: Shrink-a-tron Calibration",
    emoji: "🔬",
    story: "Kiki's Shrink-a-tron-5000 went haywire and shrank her entire toy collection to microscopic size! She needs to multiply the shrink factor by each toy's original size to restore them. Help Kiki solve 20 multiplication problems to rescue her toys!",
    mode: "multiply",
    unlockAt: 0,
    passPct: 60,
  },
  {
    id: 1,
    title: "Chapter 2: Gigant-a-tron Overflow",
    emoji: "🐟",
    story: "Uh oh! The Gigant-a-tron-3000 made Kiki's goldfish WAY too big — it's now splashing around the whole living room! Kiki needs division to calculate exactly how much Anti-Grow Formula to use. Help her solve 20 division problems!",
    mode: "divide",
    unlockAt: 0,
    passPct: 60,
  },
  {
    id: 2,
    title: "Chapter 3: Rainbow Bubble Portal",
    emoji: "🫧",
    story: "Kiki discovered that mixing Shrink and Gigant formulas creates rainbow bubbles that can teleport objects! But the bubble formula needs precise mixed calculations to stay stable. Help Kiki solve 20 problems to open the portal!",
    mode: "both",
    unlockAt: 1,
    passPct: 60,
  },
  {
    id: 3,
    title: "Chapter 4: Bermione's Missing Sammich",
    emoji: "🥪",
    story: "Kiki's Rainbow Bubble Portal accidentally zapped the sammich belonging to her neighbour Bermione — and Bermione is NOT happy about it. \"That was MY sammich!\" she fumes, crossing her arms. Kiki must use the portal's return calculations to bring the sammich back before Bermione gets any grumpier. Help Kiki solve 20 problems to rescue the sammich and restore the peace!",
    mode: "both",
    unlockAt: 2,
    passPct: 60,
  },
  {
    id: 4,
    title: "Chapter 5: The Grand Science Fair",
    emoji: "🏆",
    story: "It's the day of the BIG Science Fair! Kiki is presenting ALL her inventions — the Shrink-a-tron-5000, Gigant-a-tron-3000, and the Rainbow Bubble Portal. The judges need the final calculation worksheet. Help Kiki ace it and win the Golden Bunsen Burner Trophy!",
    mode: "both",
    unlockAt: 3,
    passPct: 70,
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
  newlyUnlockedChapter: null,       // chapter id unlocked after last completion
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

// ── User progress helpers ─────────────────────────────────────
function getUserProgress(userName) {
  const users = getUsers();
  const user = users.find(u => u.name === userName);
  if (!user) return null;
  user.storyProgress = user.storyProgress || {};
  user.storyProgress.kiki = user.storyProgress.kiki || { chapters: [] };
  while (user.storyProgress.kiki.chapters.length < CHAPTERS.length) {
    user.storyProgress.kiki.chapters.push({
      completed: false, stars: 0, bestScore: null, bestPct: null,
    });
  }
  return user;
}

function saveUserProgress(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.name === user.name);
  if (idx >= 0) users[idx] = user;
  saveUsers(users);
}

function isChapterUnlocked(chapterId, kikiProgress) {
  if (chapterId === 0) return true;
  const prev = kikiProgress.chapters[chapterId - 1];
  return prev && prev.completed;
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
 * Multiplication: a × b = ? (a,b ∈ 0..10)
 * Division:       a ÷ b = ? where a = b×q, b ≠ 0, q ∈ 0..10
 */
function generateQuestion(mode) {
  let type, a, b, answer, display;

  if (mode === 'both') {
    type = Math.random() < 0.5 ? 'multiply' : 'divide';
  } else {
    type = mode;
  }

  if (type === 'multiply') {
    a = rand(0, 10);
    b = rand(0, 10);
    answer = a * b;
    display = `${a} × ${b}`;
  } else {
    // divisor b in 1..10, quotient in 0..10
    b = rand(1, 10);
    const q = rand(0, 10);
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
  state.timeLeft = TIME_PER_QUESTION;
  state.tickStart = Date.now();
  updateTimerUI();

  clearInterval(state.timerID);
  state.timerID = setInterval(() => {
    state.timeLeft = Math.max(
      0,
      TIME_PER_QUESTION - (Date.now() - state.tickStart) / 1000
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
  const frac  = state.timeLeft / TIME_PER_QUESTION;
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
  renderStoryScreen(null);
  showScreen('#story-screen');
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

// ── Story map screen ──────────────────────────────────────────
function renderStoryScreen(newlyUnlockedChapter) {
  const userName = getCurrentUser();
  const user = getUserProgress(userName);

  const usernameEl = $('#story-username');
  usernameEl.textContent = userName || '';

  const list = $('#chapters-list');
  list.textContent = '';

  const kikiProgress = user ? user.storyProgress.kiki : { chapters: [] };
  // Ensure enough slots if user is fresh
  while (kikiProgress.chapters.length < CHAPTERS.length) {
    kikiProgress.chapters.push({ completed: false, stars: 0, bestScore: null, bestPct: null });
  }

  CHAPTERS.forEach(ch => {
    const unlocked = isChapterUnlocked(ch.id, kikiProgress);
    const chProgress = kikiProgress.chapters[ch.id];

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
    setTimeout(() => showToast(`🎉 ${ch.emoji} Chapter ${newlyUnlockedChapter + 1} unlocked!`), NEWLY_UNLOCKED_TOAST_DELAY_MS);
  }
}

function startChapter(chapterId) {
  const ch = CHAPTERS[chapterId];
  state.storyMode  = true;
  state.chapterId  = chapterId;

  // Pre-fill player name from current user
  const nameInput = $('#name-input');
  nameInput.value = getCurrentUser() || '';

  // Pre-select mode for this chapter
  $$('.mode-btn').forEach(b => b.classList.remove('selected'));
  const modeBtn = $(`.mode-btn[data-mode="${ch.mode}"]`);
  if (modeBtn) modeBtn.classList.add('selected');

  showScreen('#start-screen');
}

// ── Story completion ──────────────────────────────────────────
function handleStoryCompletion(pct) {
  const ch = CHAPTERS[state.chapterId];
  const passed = pct >= ch.passPct;
  const stars  = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;

  const userName = getCurrentUser();
  const user = getUserProgress(userName);
  if (!user) return { passed, newlyUnlockedChapter: null };

  const kikiProgress = user.storyProgress.kiki;
  const chProgress   = kikiProgress.chapters[state.chapterId];
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
  if (passed && !wasCompleted) {
    const nextId = state.chapterId + 1;
    if (nextId < CHAPTERS.length) {
      newlyUnlockedChapter = nextId;
    }
  }

  return { passed, newlyUnlockedChapter };
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

  const elapsed = (TIME_PER_QUESTION - state.timeLeft);
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
  // MAX_POINTS pts for the fastest answers, scaling down to MIN_POINTS at TIME_PER_QUESTION
  const range = MAX_POINTS - MIN_POINTS;
  const base  = Math.round(MAX_POINTS - Math.min(range, elapsed * range / TIME_PER_QUESTION));
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
    const { passed, newlyUnlockedChapter } = handleStoryCompletion(pct);
    state.newlyUnlockedChapter = newlyUnlockedChapter;

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

  // ── Story screen
  $('#switch-user-btn').addEventListener('click', () => {
    renderLoginScreen();
    showScreen('#login-screen');
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
    renderStoryScreen(state.newlyUnlockedChapter);
    showScreen('#story-screen');
  });
});

