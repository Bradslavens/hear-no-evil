import { ROLES } from './roles.js';

// A room holds up to three players, one per role. All functions are pure:
// they return a new room object rather than mutating the input.

export function createRoom(id) {
  return { id, players: [], status: 'waiting' };
}

function statusFor(players) {
  return players.length === ROLES.length ? 'ready' : 'waiting';
}

// Assign the first role (in ROLES order) that nobody currently holds.
function nextFreeRole(players) {
  const taken = new Set(players.map((p) => p.role));
  return ROLES.find((role) => !taken.has(role));
}

export function joinRoom(room, playerId) {
  if (room.players.some((p) => p.id === playerId)) {
    throw new Error(`Player ${playerId} is already in the room`);
  }
  const role = nextFreeRole(room.players);
  if (!role) {
    throw new Error('Room is full');
  }
  const players = [...room.players, { id: playerId, role }];
  return { ...room, players, status: statusFor(players) };
}

export function leaveRoom(room, playerId) {
  const players = room.players.filter((p) => p.id !== playerId);
  return { ...room, players, status: statusFor(players) };
}
