import { rolesForChannel } from './roles.js';

// "Vault Code" — the first puzzle. The answer is a three-part code:
//   [color] [digit] [shape]   e.g. "red 7 triangle"
//
// Clues are split across channels so no single role can solve it alone:
//   - beeps    (audio):  N beeps -> heard by blind + mute
//   - colorKey (visual): beep-count -> color legend -> seen by deaf + mute
//   - digit    (visual): the digit, shown on screen -> seen by deaf + mute
//   - shape    (audio):  the shape, spoken aloud -> heard by blind + mute
//
// The color requires beeps AND colorKey: only the mute has both, but the mute
// cannot speak, so the team must always relay something.
export function createVaultPuzzle() {
  return {
    id: 'vault-code',
    answer: { color: 'red', digit: '7', shape: 'triangle' },
    clues: [
      { id: 'beeps', channel: 'audio', type: 'beeps', count: 3 },
      {
        id: 'colorKey',
        channel: 'visual',
        type: 'text',
        text: 'Beeps -> colour:  1 = Blue   2 = Green   3 = Red',
      },
      { id: 'digit', channel: 'visual', type: 'text', text: 'The digit is 7' },
      { id: 'shape', channel: 'audio', type: 'speech', text: 'triangle' },
    ],
  };
}

// The clues a given role can perceive, based on channel routing.
export function cluesForRole(puzzle, role) {
  return puzzle.clues.filter((clue) => rolesForChannel(clue.channel).includes(role));
}

function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function checkAnswer(puzzle, submitted) {
  const { color, digit, shape } = puzzle.answer;
  const expected = normalize(`${color} ${digit} ${shape}`);
  return normalize(submitted) === expected;
}
