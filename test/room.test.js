import { describe, it, expect } from 'vitest';
import { createRoom, joinRoom, leaveRoom } from '../src/room.js';

describe('room', () => {
  it('starts empty and waiting', () => {
    const room = createRoom('ABCD');
    expect(room.id).toBe('ABCD');
    expect(room.players).toEqual([]);
    expect(room.status).toBe('waiting');
  });

  it('assigns the three roles in order as players join', () => {
    let room = createRoom('ABCD');
    room = joinRoom(room, 'p1');
    room = joinRoom(room, 'p2');
    room = joinRoom(room, 'p3');
    expect(room.players.map((p) => p.role)).toEqual(['blind', 'deaf', 'mute']);
    expect(room.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('becomes ready once all three roles are filled', () => {
    let room = createRoom('ABCD');
    room = joinRoom(room, 'p1');
    expect(room.status).toBe('waiting');
    room = joinRoom(room, 'p2');
    expect(room.status).toBe('waiting');
    room = joinRoom(room, 'p3');
    expect(room.status).toBe('ready');
  });

  it('rejects a fourth player', () => {
    let room = createRoom('ABCD');
    room = joinRoom(room, 'p1');
    room = joinRoom(room, 'p2');
    room = joinRoom(room, 'p3');
    expect(() => joinRoom(room, 'p4')).toThrow(/full/i);
  });

  it('rejects the same player joining twice', () => {
    let room = createRoom('ABCD');
    room = joinRoom(room, 'p1');
    expect(() => joinRoom(room, 'p1')).toThrow(/already/i);
  });

  it('does not mutate the original room when joining', () => {
    const room = createRoom('ABCD');
    const joined = joinRoom(room, 'p1');
    expect(room.players).toEqual([]);
    expect(joined.players).toHaveLength(1);
  });

  it('frees up a role when a player leaves', () => {
    let room = createRoom('ABCD');
    room = joinRoom(room, 'p1');
    room = joinRoom(room, 'p2');
    room = leaveRoom(room, 'p1');
    expect(room.players.map((p) => p.id)).toEqual(['p2']);
    expect(room.status).toBe('waiting');
    room = joinRoom(room, 'p3');
    // p3 should take the freed 'blind' role
    expect(room.players.find((p) => p.id === 'p3').role).toBe('blind');
  });
});
