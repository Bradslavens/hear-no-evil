import { createRoom, joinRoom, leaveRoom } from './room.js';

// The lobby manages many rooms at once, keyed by room id. It maps player ids
// (socket ids, in the live server) to the room they're in. Room state itself is
// produced by the pure functions in room.js; the lobby just stores the latest
// version of each room.

export function createLobby() {
  return { rooms: new Map() };
}

export function getRoom(lobby, roomId) {
  return lobby.rooms.get(roomId) ?? null;
}

export function findPlayerRoom(lobby, playerId) {
  for (const room of lobby.rooms.values()) {
    if (room.players.some((p) => p.id === playerId)) return room;
  }
  return null;
}

// Join (or create) a room. Throws if the room is full or the player is already
// in it. Returns the updated room and the role the player was assigned.
export function joinLobby(lobby, roomId, playerId) {
  const existing = lobby.rooms.get(roomId) ?? createRoom(roomId);
  const room = joinRoom(existing, playerId);
  lobby.rooms.set(roomId, room);
  const role = room.players.find((p) => p.id === playerId).role;
  return { room, role };
}

// Remove a player from whichever room they're in. Deletes the room when it
// becomes empty. Returns { room, roomId } or null if the player wasn't found.
export function leaveLobby(lobby, playerId) {
  for (const [roomId, room] of lobby.rooms) {
    if (!room.players.some((p) => p.id === playerId)) continue;
    const updated = leaveRoom(room, playerId);
    if (updated.players.length === 0) {
      lobby.rooms.delete(roomId);
    } else {
      lobby.rooms.set(roomId, updated);
    }
    return { room: updated, roomId };
  }
  return null;
}
