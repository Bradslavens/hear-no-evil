import { describe, it, expect } from 'vitest';
import {
  PUZZLE_IDS,
  getPuzzle,
  randomPuzzle,
  cluesForRole,
  answerOf,
  checkAnswer,
  rolesSolvingAlone,
} from '../src/puzzle.js';

describe('puzzle registry', () => {
  it('exposes more than one puzzle', () => {
    expect(PUZZLE_IDS.length).toBeGreaterThan(1);
  });

  it('builds a puzzle by id and rejects unknown ids', () => {
    expect(getPuzzle(PUZZLE_IDS[0]).id).toBe(PUZZLE_IDS[0]);
    expect(() => getPuzzle('nope')).toThrow(/unknown/i);
  });

  it('returns a fresh object each time (no shared mutable state)', () => {
    const a = getPuzzle('vault-code');
    const b = getPuzzle('vault-code');
    expect(a).not.toBe(b);
    a.parts[0].value = 'tampered';
    expect(b.parts[0].value).toBe('red');
  });

  it('randomPuzzle picks from the registry (deterministic with a stubbed rng)', () => {
    expect(randomPuzzle(() => 0).id).toBe(PUZZLE_IDS[0]);
    expect(randomPuzzle(() => 0.999).id).toBe(PUZZLE_IDS[PUZZLE_IDS.length - 1]);
  });
});

describe.each(PUZZLE_IDS)('puzzle "%s" invariants', (id) => {
  const puzzle = getPuzzle(id);

  it('has a title and an answer prompt', () => {
    expect(puzzle.title).toBeTruthy();
    expect(puzzle.prompt).toBeTruthy();
  });

  it('uses only valid channels and has both audio and visual clues', () => {
    const channels = puzzle.clues.map((c) => c.channel);
    expect(channels.every((c) => c === 'audio' || c === 'visual')).toBe(true);
    expect(channels).toContain('audio');
    expect(channels).toContain('visual');
  });

  it('every clue referenced by a part actually exists', () => {
    const clueIds = new Set(puzzle.clues.map((c) => c.id));
    for (const part of puzzle.parts) {
      for (const ref of part.via) {
        expect(clueIds.has(ref)).toBe(true);
      }
    }
  });

  it('accepts its own example answer', () => {
    expect(checkAnswer(puzzle, answerOf(puzzle).join(' '))).toBe(true);
  });

  it('routes audio only to the hearing and visual only to the sighted', () => {
    expect(cluesForRole(puzzle, 'blind').every((c) => c.channel === 'audio')).toBe(true);
    expect(cluesForRole(puzzle, 'deaf').every((c) => c.channel === 'visual')).toBe(true);
  });

  it('cannot be solved alone by the blind or the deaf player', () => {
    const solo = rolesSolvingAlone(puzzle);
    expect(solo).not.toContain('blind');
    expect(solo).not.toContain('deaf');
  });
});
