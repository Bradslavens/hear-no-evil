/* global io */
const socket = io();

const ROLE_INFO = {
  blind: {
    name: '🙈 See No Evil',
    voice:
      'You may speak and you can hear. Your screen shows no clues — rely on sound and your teammates.',
  },
  deaf: {
    name: '🙉 Hear No Evil',
    voice:
      'Mute your speakers / turn your volume off on the voice call. You can speak and draw. You will not hear the sounds — your team must draw them for you.',
  },
  mute: {
    name: '🙊 Speak No Evil',
    voice:
      'Mute your microphone on the voice call. You can see and hear everything, but the others can’t hear you — communicate by drawing.',
  },
};

const els = {
  joinScreen: document.getElementById('join-screen'),
  gameScreen: document.getElementById('game-screen'),
  joinForm: document.getElementById('join-form'),
  roomCode: document.getElementById('room-code'),
  joinError: document.getElementById('join-error'),
  roleBadge: document.getElementById('role-badge'),
  roomLabel: document.getElementById('room-label'),
  timer: document.getElementById('timer'),
  voice: document.getElementById('voice-instructions'),
  playerCount: document.getElementById('player-count'),
  startBtn: document.getElementById('start-btn'),
  clueList: document.getElementById('clue-list'),
  replayAudio: document.getElementById('replay-audio'),
  board: document.getElementById('board'),
  clearBtn: document.getElementById('clear-btn'),
  answerForm: document.getElementById('answer-form'),
  answerInput: document.getElementById('answer-input'),
  answerHeading: document.querySelector('#answer-panel h2'),
  banner: document.getElementById('result-banner'),
};

let myRole = null;
let lastClues = [];
let timerHandle = null;
let gameActive = false;

/* ---------- Join ---------- */
els.joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const roomId = els.roomCode.value.trim().toUpperCase();
  if (!roomId) return;
  const res = await socket.emitWithAck('join', { roomId });
  if (!res.ok) {
    els.joinError.textContent = res.error || 'Could not join room.';
    return;
  }
  myRole = res.role;
  enterGame(roomId, res.role);
});

function enterGame(roomId, role) {
  document.body.classList.add(`role-${role}`);
  els.roleBadge.textContent = ROLE_INFO[role].name;
  els.voice.textContent = ROLE_INFO[role].voice;
  els.roomLabel.textContent = `Room ${roomId}`;
  els.joinScreen.classList.add('hidden');
  els.gameScreen.classList.remove('hidden');
}

/* ---------- Lobby / room state ---------- */
socket.on('room:update', (room) => {
  const filled = room.players.length;
  els.playerCount.textContent =
    room.status === 'ready'
      ? 'All three players are here!'
      : `Waiting for players… (${filled}/3)`;
  // Only offer Start before a game is running.
  els.startBtn.classList.toggle('hidden', gameActive || room.status !== 'ready');
});

els.startBtn.addEventListener('click', () => {
  els.startBtn.disabled = true; // guard against a double-tap before the server responds
  socket.emit('start');
});

/* ---------- Clues ---------- */
socket.on('clues', (clues) => {
  lastClues = clues;
  renderVisualClues(clues);
  playAudioClues(clues);
  els.banner.classList.add('hidden');
});

function renderVisualClues(clues) {
  els.clueList.innerHTML = '';
  for (const clue of clues) {
    if (clue.channel !== 'visual') continue;
    const li = document.createElement('li');
    li.textContent = clue.text;
    els.clueList.appendChild(li);
  }
}

els.replayAudio.addEventListener('click', () => playAudioClues(lastClues));

/* ---------- Audio (Web Audio beeps + speech) ---------- */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // Browsers start the context suspended until a user gesture; resume it.
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

async function playAudioClues(clues) {
  for (const clue of clues) {
    if (clue.channel !== 'audio') continue;
    if (clue.type === 'beeps') {
      await playBeeps(clue.count);
    } else if (clue.type === 'speech') {
      await speak(clue.text);
    }
  }
}

function playBeeps(count) {
  return new Promise((resolve) => {
    const ctx = getAudioCtx();
    const beepMs = 180;
    const gapMs = 160;
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * ((beepMs + gapMs) / 1000);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + beepMs / 1000);
      osc.start(start);
      osc.stop(start + beepMs / 1000);
    }
    setTimeout(resolve, count * (beepMs + gapMs) + 200);
  });
}

function speak(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.onend = resolve;
    utter.onerror = resolve;
    window.speechSynthesis.speak(utter);
  });
}

/* ---------- Shared canvas ---------- */
// Strokes are sent in normalized 0..1 coordinates so they match across screens.
const ctx2d = els.board.getContext('2d');
let drawing = false;
let last = null;

function pos(evt) {
  const rect = els.board.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / rect.width,
    y: (evt.clientY - rect.top) / rect.height,
  };
}

function drawSegment(seg) {
  ctx2d.strokeStyle = '#1b1d23';
  ctx2d.lineWidth = 2.5;
  ctx2d.lineCap = 'round';
  ctx2d.beginPath();
  ctx2d.moveTo(seg.x0 * els.board.width, seg.y0 * els.board.height);
  ctx2d.lineTo(seg.x1 * els.board.width, seg.y1 * els.board.height);
  ctx2d.stroke();
}

els.board.addEventListener('pointerdown', (e) => {
  drawing = true;
  last = pos(e);
  els.board.setPointerCapture(e.pointerId);
});

els.board.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const p = pos(e);
  const seg = { x0: last.x, y0: last.y, x1: p.x, y1: p.y };
  drawSegment(seg);
  socket.emit('draw', seg);
  last = p;
});

function endStroke() {
  drawing = false;
  last = null;
}
els.board.addEventListener('pointerup', endStroke);
els.board.addEventListener('pointercancel', endStroke);

socket.on('draw', drawSegment);

function clearBoard() {
  ctx2d.clearRect(0, 0, els.board.width, els.board.height);
}
els.clearBtn.addEventListener('click', () => {
  clearBoard();
  socket.emit('clear');
});
socket.on('clear', clearBoard);

/* ---------- Timer ---------- */
socket.on('game:started', ({ durationMs, title, prompt }) => {
  gameActive = true;
  els.startBtn.classList.add('hidden');
  if (title) els.answerHeading.textContent = title;
  if (prompt) els.answerInput.placeholder = prompt;
  const startedAt = Date.now();
  clearInterval(timerHandle);
  const tick = () => {
    const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
    els.timer.textContent = formatTime(remaining);
    els.timer.classList.toggle('low', remaining <= 30000);
    if (remaining <= 0) clearInterval(timerHandle);
  };
  tick();
  timerHandle = setInterval(tick, 250);
});

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* ---------- Answer / result ---------- */
els.answerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const answer = els.answerInput.value.trim();
  if (!answer) return;
  await socket.emitWithAck('submit', { answer });
  els.answerInput.value = '';
});

socket.on('game:result', ({ status }) => {
  if (status === 'won' || status === 'lost') {
    showBanner(status, status === 'won'
      ? '🎉 Vault cracked! You win!'
      : '⏱️ Out of time. The vault stays shut.');
    clearInterval(timerHandle);
    // Game over — let the team start a fresh round.
    gameActive = false;
    els.startBtn.disabled = false;
    els.startBtn.textContent = 'Play again';
    els.startBtn.classList.remove('hidden');
  }
  // status 'playing' (wrong answer) shows nothing — keep going.
});

function showBanner(kind, text) {
  els.banner.textContent = text;
  els.banner.className = `banner ${kind}`;
}
