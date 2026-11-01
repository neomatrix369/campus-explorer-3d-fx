import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {
  DEFAULT_LISTEN_PORT,
  findAvailablePort,
  listenOnFirstAvailable,
  parseCliPort,
  parsePortNumber,
  resolvePreferredPort,
} from './listenPort.ts';

function occupyPort(host = '0.0.0.0'): Promise<{ port: number; close: () => Promise<void> }> {
  const holder = net.createServer();
  return new Promise((resolve, reject) => {
    holder.once('error', reject);
    holder.listen(0, host, () => {
      const address = holder.address();
      if (!address || typeof address === 'string') {
        holder.close();
        reject(new Error('Expected a TCP address'));
        return;
      }
      resolve({
        port: address.port,
        close: () => new Promise((done, fail) => holder.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

test('parsePortNumber accepts 1-65535 and rejects junk', () => {
  assert.equal(parsePortNumber(undefined), undefined);
  assert.equal(parsePortNumber(''), undefined);
  assert.equal(parsePortNumber(' 4000 '), 4000);
  assert.throws(() => parsePortNumber('0'), /Invalid port/);
  assert.throws(() => parsePortNumber('65536'), /Invalid port/);
  assert.throws(() => parsePortNumber('abc'), /Invalid port/);
});

test('parseCliPort reads --port, --port=, and -p', () => {
  assert.equal(parseCliPort(['node', 'server.ts']), undefined);
  assert.equal(parseCliPort(['node', 'server.ts', '--port', '4000']), 4000);
  assert.equal(parseCliPort(['node', 'server.ts', '--port=4123']), 4123);
  assert.equal(parseCliPort(['node', 'server.ts', '-p', '5000']), 5000);
  assert.throws(() => parseCliPort(['--port']), /Missing value/);
  assert.throws(() => parseCliPort(['-p', '--other']), /Missing value/);
});

test('resolvePreferredPort prefers CLI over PORT env over default 3000', () => {
  assert.equal(resolvePreferredPort(['node', 'server.ts'], {}), DEFAULT_LISTEN_PORT);
  assert.equal(resolvePreferredPort(['node', 'server.ts'], { PORT: '3500' }), 3500);
  assert.equal(
    resolvePreferredPort(['node', 'server.ts', '--port', '4100'], { PORT: '3500' }),
    4100
  );
});

test('findAvailablePort returns the preferred port when it is free', async () => {
  const probe = await occupyPort();
  const freePort = probe.port;
  await probe.close();
  assert.equal(await findAvailablePort(freePort, 3), freePort);
});

test('findAvailablePort skips an occupied port and picks the next free one', async () => {
  const occupied = await occupyPort();
  try {
    const chosen = await findAvailablePort(occupied.port, 8);
    assert.ok(chosen !== occupied.port);
    assert.ok(chosen > occupied.port);
  } finally {
    await occupied.close();
  }
});

test('listenOnFirstAvailable binds the requested port, or the next free one if occupied', async () => {
  const occupied = await occupyPort();
  const app = http.createServer();
  try {
    const bound = await listenOnFirstAvailable(app, occupied.port, '0.0.0.0', 8);
    assert.equal(bound.requestedPort, occupied.port);
    assert.ok(bound.port !== occupied.port);
    const address = app.address();
    assert.ok(address && typeof address !== 'string');
    assert.equal(address.port, bound.port);
  } finally {
    await new Promise<void>((resolve, reject) => app.close((err) => (err ? reject(err) : resolve())));
    await occupied.close();
  }
});
