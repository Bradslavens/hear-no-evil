import { describe, it, expect } from 'vitest';
import { createGame, timeRemaining, isExpired, submitAnswer } from '../src/game.js';
import { createVaultPuzzle } from '../src/puzzle.js';

const T0 = 1_000_000;
const FIVE_MIN = 5 * 60 * 1000;

function newGame() {
  return createGame(createVaultPuzzle(), { durationMs: FIVE_MIN, now: T0 });
}

describe('game', () => {
  it('starts in playing status with the full duration remaining', () => {
    const game = newGame();
    expect(game.status).toBe('playing');
    expect(timeRemaining(game, T0)).toBe(FIVE_MIN);
  });

  it('counts down as time passes', () => {
    const game = newGame();
    expect(timeRemaining(game, T0 + 60_000)).toBe(FIVE_MIN - 60_000);
  });

  it('never reports negative time remaining', () => {
    const game = newGame();
    expect(timeRemaining(game, T0 + FIVE_MIN + 10_000)).toBe(0);
  });

  it('is expired once the duration elapses', () => {
    const game = newGame();
    expect(isExpired(game, T0 + FIVE_MIN - 1)).toBe(false);
    expect(isExpired(game, T0 + FIVE_MIN)).toBe(true);
  });

  it('wins on a correct answer within the time limit', () => {
    const game = submitAnswer(newGame(), 'red 7 triangle', T0 + 30_000);
    expect(game.status).toBe('won');
    expect(game.solvedAt).toBe(T0 + 30_000);
  });

  it('stays in play on a wrong answer', () => {
    const game = submitAnswer(newGame(), 'blue 1 square', T0 + 30_000);
    expect(game.status).toBe('playing');
  });

  it('loses when a correct answer arrives after time is up', () => {
    const game = submitAnswer(newGame(), 'red 7 triangle', T0 + FIVE_MIN + 1);
    expect(game.status).toBe('lost');
  });

  it('ignores answers once the game is already over', () => {
    const won = submitAnswer(newGame(), 'red 7 triangle', T0 + 1000);
    const after = submitAnswer(won, 'blue 1 square', T0 + 2000);
    expect(after.status).toBe('won');
  });
});
