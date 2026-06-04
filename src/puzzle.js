import { ROLES, rolesForChannel } from './roles.js';

// A puzzle has:
//   id      - stable identifier
//   title   - shown to players when the round starts
//   prompt  - tells players what format to type the answer in
//   parts   - ordered answer pieces; each has a `value` and `via` (the clue ids
//             needed to determine it). The full answer is the parts joined by
//             spaces. `via` makes the cooperation requirement explicit/testable.
//   clues   - delivered to players by sensory channel:
//               'visual' -> the sighted (deaf + mute)
//               'audio'  -> the hearing (blind + mute)
//
// Every puzzle follows the same shape: two visual clues (a legend + a direct
// fact) and two audio clues (a beep count + a spoken word). One answer part is
// "cross-channel" (needs a beep count AND a visual legend), which forces the
// team to relay information.

export function createVaultPuzzle() {
  return {
    id: 'vault-code',
    title: '🔐 Vault Code',
    prompt: 'Enter: colour, digit, shape — e.g. red 7 triangle',
    parts: [
      { value: 'red', via: ['beeps', 'colorKey'] },
      { value: '7', via: ['digit'] },
      { value: 'triangle', via: ['shape'] },
    ],
    clues: [
      { id: 'beeps', channel: 'audio', type: 'beeps', count: 3 },
      {
        id: 'colorKey',
        channel: 'visual',
        type: 'text',
        text: 'Beeps → colour:  1 = Blue   2 = Green   3 = Red',
      },
      { id: 'digit', channel: 'visual', type: 'text', text: 'The digit is 7' },
      { id: 'shape', channel: 'audio', type: 'speech', text: 'triangle' },
    ],
  };
}

export function createLaunchPuzzle() {
  return {
    id: 'launch-sequence',
    title: '🚀 Launch Sequence',
    prompt: 'Enter: light colour, fuel cells, heading — e.g. amber 4 north',
    parts: [
      { value: 'amber', via: ['beeps', 'lightKey'] },
      { value: '4', via: ['fuel'] },
      { value: 'north', via: ['heading'] },
    ],
    clues: [
      { id: 'beeps', channel: 'audio', type: 'beeps', count: 2 },
      {
        id: 'lightKey',
        channel: 'visual',
        type: 'text',
        text: 'Warning beeps → light:  1 = Red   2 = Amber   3 = Green',
      },
      { id: 'fuel', channel: 'visual', type: 'text', text: 'Fuel cells charged: 4' },
      { id: 'heading', channel: 'audio', type: 'speech', text: 'north' },
    ],
  };
}

export function createWizardPuzzle() {
  return {
    id: 'wizards-spell',
    title: '🧙 Wizard’s Spell',
    prompt: 'Enter: element, power, rune — e.g. fire 1 moon',
    parts: [
      { value: 'fire', via: ['element'] },
      { value: '1', via: ['chimes', 'powerKey'] },
      { value: 'moon', via: ['rune'] },
    ],
    clues: [
      { id: 'chimes', channel: 'audio', type: 'beeps', count: 3 },
      {
        id: 'powerKey',
        channel: 'visual',
        type: 'text',
        text: 'Chimes → power:  1 chime = 5   2 chimes = 3   3 chimes = 1',
      },
      { id: 'rune', channel: 'visual', type: 'text', text: 'The rune carved on the door: moon' },
      { id: 'element', channel: 'audio', type: 'speech', text: 'fire' },
    ],
  };
}

export function createTreasurePuzzle() {
  return {
    id: 'treasure-map',
    title: '🗺️ Treasure Map',
    prompt: 'Enter: landmark, paces, direction — e.g. skull 6 east',
    parts: [
      { value: 'skull', via: ['landmark'] },
      { value: '6', via: ['drums', 'pacesKey'] },
      { value: 'east', via: ['direction'] },
    ],
    clues: [
      { id: 'drums', channel: 'audio', type: 'beeps', count: 2 },
      {
        id: 'pacesKey',
        channel: 'visual',
        type: 'text',
        text: 'Drum beats → paces:  1 = 2   2 = 6   3 = 10',
      },
      { id: 'landmark', channel: 'visual', type: 'text', text: 'The marked landmark is a skull' },
      { id: 'direction', channel: 'audio', type: 'speech', text: 'east' },
    ],
  };
}

// Registry of all puzzles, keyed by id.
const PUZZLE_FACTORIES = {
  'vault-code': createVaultPuzzle,
  'launch-sequence': createLaunchPuzzle,
  'wizards-spell': createWizardPuzzle,
  'treasure-map': createTreasurePuzzle,
};

export const PUZZLE_IDS = Object.keys(PUZZLE_FACTORIES);

export function getPuzzle(id) {
  const factory = PUZZLE_FACTORIES[id];
  if (!factory) throw new Error(`Unknown puzzle: ${id}`);
  return factory();
}

export function randomPuzzle(rng = Math.random) {
  const id = PUZZLE_IDS[Math.floor(rng() * PUZZLE_IDS.length)];
  return getPuzzle(id);
}

// The clues a given role can perceive, based on channel routing.
export function cluesForRole(puzzle, role) {
  return puzzle.clues.filter((clue) => rolesForChannel(clue.channel).includes(role));
}

// The ordered answer values for a puzzle.
export function answerOf(puzzle) {
  return puzzle.parts.map((p) => p.value);
}

// Which roles, if any, could determine the entire answer on their own (i.e.
// they perceive every clue listed in every part's `via`). Used to reason about
// how much cooperation a puzzle forces.
export function rolesSolvingAlone(puzzle) {
  return ROLES.filter((role) => {
    const have = new Set(cluesForRole(puzzle, role).map((c) => c.id));
    return puzzle.parts.every((part) => part.via.every((id) => have.has(id)));
  });
}

function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function checkAnswer(puzzle, submitted) {
  const expected = normalize(answerOf(puzzle).join(' '));
  return normalize(submitted) === expected;
}
