import { describe, it, expect } from 'vitest';
import {
  createLobby,
  joinLobby,
  leaveLobby,
  getRoom,
  findPlayerRoom,
} from '../src/lobby.js';

describe('lobby', () => {
  it('creates a room on first join and assigns the blind role', () => {
    const lobby = createLobby();
    const { room, role } = joinLobby(lobby, 'ROOM1', 'socketA');
    expect(role).toBe('blind');
    expect(room.id).toBe('ROOM1');
    expect(getRoom(lobby, 'ROOM1').players).toHaveLength(1);
  });

  it('routes later joiners of the same room to the next free role', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'socketA');
    const second = joinLobby(lobby, 'ROOM1', 'socketB');
    const third = joinLobby(lobby, 'ROOM1', 'socketC');
    expect(second.role).toBe('deaf');
    expect(third.role).toBe('mute');
    expect(third.room.status).toBe('ready');
  });

  it('keeps separate rooms independent', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'socketA');
    const other = joinLobby(lobby, 'ROOM2', 'socketB');
    expect(other.role).toBe('blind');
    expect(getRoom(lobby, 'ROOM1').players).toHaveLength(1);
    expect(getRoom(lobby, 'ROOM2').players).toHaveLength(1);
  });

  it('throws when a room is already full', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'a');
    joinLobby(lobby, 'ROOM1', 'b');
    joinLobby(lobby, 'ROOM1', 'c');
    expect(() => joinLobby(lobby, 'ROOM1', 'd')).toThrow(/full/i);
  });

  it('finds which room a player is in', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'socketA');
    expect(findPlayerRoom(lobby, 'socketA').id).toBe('ROOM1');
    expect(findPlayerRoom(lobby, 'ghost')).toBeNull();
  });

  it('removes a player on leave and frees their role', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'socketA');
    joinLobby(lobby, 'ROOM1', 'socketB');
    const left = leaveLobby(lobby, 'socketA');
    expect(left.roomId).toBe('ROOM1');
    expect(getRoom(lobby, 'ROOM1').players.map((p) => p.id)).toEqual(['socketB']);
    // the freed blind role is reassigned to the next joiner
    const rejoin = joinLobby(lobby, 'ROOM1', 'socketC');
    expect(rejoin.role).toBe('blind');
  });

  it('deletes a room once its last player leaves', () => {
    const lobby = createLobby();
    joinLobby(lobby, 'ROOM1', 'socketA');
    leaveLobby(lobby, 'socketA');
    expect(getRoom(lobby, 'ROOM1')).toBeNull();
  });

  it('returns null when leaving without being in any room', () => {
    const lobby = createLobby();
    expect(leaveLobby(lobby, 'nobody')).toBeNull();
  });
});
