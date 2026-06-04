import { checkAnswer } from './puzzle.js';

const DEFAULT_DURATION_MS = 5 * 60 * 1000;

// A game wraps a puzzle with a countdown timer and win/lose state.
// Pure functions: submitAnswer returns a new game rather than mutating.
export function createGame(puzzle, { durationMs = DEFAULT_DURATION_MS, now = Date.now() } = {}) {
  return {
    puzzle,
    durationMs,
    startedAt: now,
    status: 'playing', // 'playing' | 'won' | 'lost'
    solvedAt: null,
  };
}

export function timeRemaining(game, now) {
  return Math.max(0, game.durationMs - (now - game.startedAt));
}

export function isExpired(game, now) {
  return timeRemaining(game, now) <= 0;
}

export function submitAnswer(game, submitted, now) {
  if (game.status !== 'playing') return game;
  if (isExpired(game, now)) return { ...game, status: 'lost' };
  if (checkAnswer(game.puzzle, submitted)) {
    return { ...game, status: 'won', solvedAt: now };
  }
  return game; // wrong answer — keep playing
}
