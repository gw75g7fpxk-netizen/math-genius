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
const TIMEOUT_ANSWER      = null; // sentinel value meaning no answer was given

// ── State ─────────────────────────────────────────────────────
let state = {
  playerName: '',
  mode:       'both',     // 'multiply' | 'divide' | 'both'
  questions:  [],
  index:      0,
  score:      0,
  streak:     0,
  history:    [],         // {question, correct, given, ms}
  timeLeft:   TIME_PER_QUESTION,
  timerID:    null,
  tickStart:  null,
  answered:   false,
};

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

  // Answer buttons
  const btns = $$('.answer-btn');
  btns.forEach((btn, i) => {
    btn.textContent = q.options[i];
    btn.dataset.value = q.options[i];
    btn.className  = 'answer-btn';
    btn.disabled   = false;
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
  $('#stat-score').textContent   = state.score;
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
}

// ── Event wiring ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Mode selection
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

  // Answer buttons
  $$('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAnswer(Number(btn.dataset.value));
    });
  });

  // Play again
  $('#play-again-btn').addEventListener('click', () => {
    showScreen('#start-screen');
  });
});
