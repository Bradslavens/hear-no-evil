# HearNoEvil

A 3-player cooperative puzzle game built around sensory constraints. Inspired by
*SenSense*, redesigned so players can play from **different locations**.

Each player takes on one of the **Three Wise Monkeys**:

| Role | Monkey | Sees screen? | Hears audio? | Voice heard by others? |
|------|--------|:---:|:---:|:---:|
| 🙈 **See No Evil** (Blind) | Mizaru | No | Yes | Yes |
| 🙉 **Hear No Evil** (Deaf) | Kikazaru | Yes | No | Yes |
| 🙊 **Speak No Evil** (Mute) | Iwazaru | Yes | Yes | No |

No single player has the whole picture, so the team must **relay** clues to each
other to solve the puzzle before the timer runs out.

## How communication works (MVP)

- **Talking** happens on an external group voice call (Discord, Zoom, phone). The
  app tells each player how to set up their mic/speakers for their role.
- The app enforces the in-game channels:
  - **Visual clues** show only to the sighted (Hear No Evil + Speak No Evil).
  - **Audio clues** play only to the hearing (See No Evil + Speak No Evil).
  - A **shared drawing canvas** is visible only to the sighted, so the silent
    player can communicate by drawing.

## Tech

- Node + Socket.IO server (self-hosted, playable on a home network)
- Plain HTML/CSS/JS client
- Vitest for tests (TDD)

## Development

```bash
npm install
npm test          # run the test suite once
npm run test:watch
npm start         # start the server
```

## Puzzles

A random puzzle is chosen each round. Current set:

- 🔐 **Vault Code** — colour, digit, shape
- 🚀 **Launch Sequence** — light colour, fuel cells, heading
- 🧙 **Wizard's Spell** — element, power, rune
- 🗺️ **Treasure Map** — landmark, paces, direction

Each splits clues across the senses so the 🙈 blind and 🙉 deaf players can never
solve alone. (Today the 🙊 mute, who sees and hears everything, technically can —
a future "private clues" mode will close that gap.)

## Status

Early MVP — four puzzles, three roles, shared canvas, timer, win/lose, replay.
