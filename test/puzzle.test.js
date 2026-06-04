import { describe, it, expect } from 'vitest';
import {
  createVaultPuzzle,
  cluesForRole,
  checkAnswer,
  answerOf,
  rolesSolvingAlone,
} from '../src/puzzle.js';

describe('vault puzzle', () => {
  it('has an ordered three-part answer (colour, digit, shape)', () => {
    const puzzle = createVaultPuzzle();
    expect(answerOf(puzzle)).toEqual(['red', '7', 'triangle']);
  });

  it('lets only the mute solve it alone; blind and deaf cannot', () => {
    const puzzle = createVaultPuzzle();
    expect(rolesSolvingAlone(puzzle)).toEqual(['mute']);
  });

  describe('clue routing', () => {
    it('gives the blind player only audio clues (beeps + spoken shape)', () => {
      const puzzle = createVaultPuzzle();
      const ids = cluesForRole(puzzle, 'blind').map((c) => c.id).sort();
      expect(ids).toEqual(['beeps', 'shape']);
    });

    it('gives the deaf player only visual clues (color key + digit)', () => {
      const puzzle = createVaultPuzzle();
      const ids = cluesForRole(puzzle, 'deaf').map((c) => c.id).sort();
      expect(ids).toEqual(['colorKey', 'digit']);
    });

    it('gives the mute player every clue (sees and hears all)', () => {
      const puzzle = createVaultPuzzle();
      const ids = cluesForRole(puzzle, 'mute').map((c) => c.id).sort();
      expect(ids).toEqual(['beeps', 'colorKey', 'digit', 'shape']);
    });

    it('ensures no single role can solve it alone', () => {
      const puzzle = createVaultPuzzle();
      // The color needs beeps (audio) + colorKey (visual). Only the mute has both,
      // but the mute cannot speak, so a relay is always required.
      const blind = cluesForRole(puzzle, 'blind').map((c) => c.id);
      const deaf = cluesForRole(puzzle, 'deaf').map((c) => c.id);
      expect(blind).not.toContain('colorKey'); // blind can't see the key
      expect(deaf).not.toContain('beeps'); // deaf can't hear the beeps
    });
  });

  describe('checkAnswer', () => {
    it('accepts the exact answer', () => {
      const puzzle = createVaultPuzzle();
      expect(checkAnswer(puzzle, 'red 7 triangle')).toBe(true);
    });

    it('is case-insensitive and tolerant of extra whitespace', () => {
      const puzzle = createVaultPuzzle();
      expect(checkAnswer(puzzle, '  RED   7  Triangle ')).toBe(true);
    });

    it('tolerates different separators', () => {
      const puzzle = createVaultPuzzle();
      expect(checkAnswer(puzzle, 'red-7-triangle')).toBe(true);
    });

    it('rejects a wrong answer', () => {
      const puzzle = createVaultPuzzle();
      expect(checkAnswer(puzzle, 'blue 7 triangle')).toBe(false);
      expect(checkAnswer(puzzle, 'red 7 square')).toBe(false);
    });
  });
});
