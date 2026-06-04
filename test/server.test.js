import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { createServer } from '../server/index.js';

let httpServer;
let port;

beforeAll(async () => {
  ({ httpServer } = createServer());
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(() => {
  httpServer.close();
});

function connect() {
  return ioClient(`http://localhost:${port}`, { forceNew: true, transports: ['websocket'] });
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

// Wait a short beat to let any (unwanted) events arrive.
function tick(ms = 60) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('socket server', () => {
  let clients = [];

  beforeEach(() => {
    clients = [];
  });

  afterEach(() => {
    for (const c of clients) c.disconnect();
  });

  async function joinAll(roomId) {
    const blind = connect();
    const deaf = connect();
    const mute = connect();
    clients.push(blind, deaf, mute);

    const r1 = await blind.emitWithAck('join', { roomId });
    const r2 = await deaf.emitWithAck('join', { roomId });
    const r3 = await mute.emitWithAck('join', { roomId });
    return { blind, deaf, mute, r1, r2, r3 };
  }

  it('assigns the three roles in join order and reports ready', async () => {
    const { r1, r2, r3 } = await joinAll('ROOM-A');
    expect(r1.role).toBe('blind');
    expect(r2.role).toBe('deaf');
    expect(r3.role).toBe('mute');
    expect(r3.status).toBe('ready');
  });

  it('rejects a fourth player', async () => {
    await joinAll('ROOM-B');
    const fourth = connect();
    clients.push(fourth);
    const res = await fourth.emitWithAck('join', { roomId: 'ROOM-B' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/full/i);
  });

  it('delivers only sense-appropriate clues to each role on start', async () => {
    const { blind, deaf, mute } = await joinAll('ROOM-C');

    const blindClues = once(blind, 'clues');
    const deafClues = once(deaf, 'clues');
    const muteClues = once(mute, 'clues');

    mute.emit('start');

    const ids = (clues) => clues.map((c) => c.id).sort();
    expect(ids(await blindClues)).toEqual(['beeps', 'shape']);
    expect(ids(await deafClues)).toEqual(['colorKey', 'digit']);
    expect(ids(await muteClues)).toEqual(['beeps', 'colorKey', 'digit', 'shape']);
  });

  it('sends canvas strokes to sighted players but never to the blind', async () => {
    const { blind, deaf, mute } = await joinAll('ROOM-D');

    let blindGotDraw = false;
    blind.on('draw', () => {
      blindGotDraw = true;
    });
    const muteGotDraw = once(mute, 'draw');

    // The deaf player draws a stroke.
    deaf.emit('draw', { x: 10, y: 20 });

    const received = await muteGotDraw;
    expect(received).toEqual({ x: 10, y: 20 });

    await tick(); // give any stray event time to land
    expect(blindGotDraw).toBe(false);
  });

  it('broadcasts a win when the correct answer is submitted', async () => {
    const { blind, deaf, mute } = await joinAll('ROOM-E');
    mute.emit('start');

    const blindResult = once(blind, 'game:result');
    const deafResult = once(deaf, 'game:result');

    const ack = await mute.emitWithAck('submit', { answer: 'red 7 triangle' });
    expect(ack.status).toBe('won');
    expect((await blindResult).status).toBe('won');
    expect((await deafResult).status).toBe('won');
  });

  it('keeps playing on a wrong answer', async () => {
    const { mute } = await joinAll('ROOM-F');
    mute.emit('start');
    const ack = await mute.emitWithAck('submit', { answer: 'blue 1 square' });
    expect(ack.status).toBe('playing');
  });
});
