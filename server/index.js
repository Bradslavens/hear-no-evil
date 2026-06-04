import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

import { CAPABILITIES } from '../src/roles.js';
import { createLobby, joinLobby, leaveLobby, getRoom } from '../src/lobby.js';
import { randomPuzzle, cluesForRole } from '../src/puzzle.js';
import { createGame, submitAnswer } from '../src/game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// A trimmed view of a room that is safe to broadcast to clients.
function publicRoom(room) {
  return {
    id: room.id,
    status: room.status,
    players: room.players.map((p) => ({ role: p.role })),
  };
}

// Build the HTTP + Socket.IO server without starting to listen, so tests can
// drive it on an ephemeral port. The pure game logic lives in src/.
export function createServer({ makePuzzle = randomPuzzle } = {}) {
  const app = express();
  app.use(express.static(PUBLIC_DIR));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  const lobby = createLobby();
  const games = new Map(); // roomId -> game

  io.on('connection', (socket) => {
    socket.on('join', ({ roomId } = {}, ack) => {
      try {
        const { room, role } = joinLobby(lobby, roomId, socket.id);
        socket.data.roomId = roomId;
        socket.data.role = role;
        socket.join(roomId);
        if (typeof ack === 'function') ack({ ok: true, role, status: room.status });
        io.to(roomId).emit('room:update', publicRoom(room));
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('start', () => {
      const roomId = socket.data.roomId;
      const room = getRoom(lobby, roomId);
      if (!room || room.status !== 'ready') return;

      const puzzle = makePuzzle();
      const game = createGame(puzzle);
      games.set(roomId, game);

      // Each player only receives the clues their senses allow.
      for (const player of room.players) {
        io.to(player.id).emit('clues', cluesForRole(puzzle, player.role));
      }
      io.to(roomId).emit('game:started', {
        durationMs: game.durationMs,
        startedAt: game.startedAt,
        title: puzzle.title,
        prompt: puzzle.prompt,
      });
    });

    // Canvas strokes go only to sighted players — never the blind.
    socket.on('draw', (stroke) => {
      const room = getRoom(lobby, socket.data.roomId);
      if (!room) return;
      for (const player of room.players) {
        if (player.id === socket.id) continue;
        if (CAPABILITIES[player.role].canSee) {
          io.to(player.id).emit('draw', stroke);
        }
      }
    });

    socket.on('clear', () => {
      const room = getRoom(lobby, socket.data.roomId);
      if (!room) return;
      for (const player of room.players) {
        if (player.id === socket.id) continue;
        if (CAPABILITIES[player.role].canSee) {
          io.to(player.id).emit('clear');
        }
      }
    });

    socket.on('submit', ({ answer } = {}, ack) => {
      const roomId = socket.data.roomId;
      const current = games.get(roomId);
      if (!current) {
        if (typeof ack === 'function') ack({ ok: false, error: 'No game in progress' });
        return;
      }
      const game = submitAnswer(current, answer, Date.now());
      games.set(roomId, game);
      if (typeof ack === 'function') ack({ ok: true, status: game.status });
      io.to(roomId).emit('game:result', { status: game.status, answer });
    });

    socket.on('disconnect', () => {
      const left = leaveLobby(lobby, socket.id);
      if (!left) return;
      if (getRoom(lobby, left.roomId)) {
        io.to(left.roomId).emit('room:update', publicRoom(left.room));
      } else {
        games.delete(left.roomId);
      }
    });
  });

  return { app, httpServer, io, lobby, games };
}

// Start listening only when this file is run directly (not when imported by tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const { httpServer } = createServer();
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`HearNoEvil server running at http://localhost:${PORT}`);
  });
}
