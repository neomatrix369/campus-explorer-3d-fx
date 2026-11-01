import net from 'node:net';
import type { Server } from 'node:http';

export const DEFAULT_LISTEN_PORT = 3000;
export const MAX_TCP_PORT = 65535;
export const PORT_SCAN_ATTEMPTS = 20;

type Bindable = {
  listen: (port: number, host: string, callback: () => void) => Server;
};

export function parsePortNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid port "${raw}". Use an integer from 1 to ${MAX_TCP_PORT}.`);
  }
  const port = Number(trimmed);
  if (port < 1 || port > MAX_TCP_PORT) {
    throw new Error(`Invalid port "${raw}". Use an integer from 1 to ${MAX_TCP_PORT}.`);
  }
  return port;
}

export function parseCliPort(argv: string[]): number | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${arg}. Example: --port 4000`);
      }
      return parsePortNumber(value);
    }
    if (arg.startsWith('--port=')) {
      return parsePortNumber(arg.slice('--port='.length));
    }
  }
  return undefined;
}

export function resolvePreferredPort(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): number {
  return parseCliPort(argv) ?? parsePortNumber(env.PORT) ?? DEFAULT_LISTEN_PORT;
}

export function isPortAvailable(port: number, host = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

export async function findAvailablePort(
  preferredPort: number,
  maxAttempts = PORT_SCAN_ATTEMPTS,
  host = '0.0.0.0'
): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset++) {
    const port = preferredPort + offset;
    if (port > MAX_TCP_PORT) break;
    if (await isPortAvailable(port, host)) return port;
  }
  throw new Error(
    `No free TCP port found in ${preferredPort}–${Math.min(preferredPort + maxAttempts - 1, MAX_TCP_PORT)}.`
  );
}

export async function listenOnFirstAvailable(
  app: Bindable,
  requestedPort: number,
  host = '0.0.0.0',
  maxAttempts = PORT_SCAN_ATTEMPTS
): Promise<{ port: number; requestedPort: number }> {
  let port = await findAvailablePort(requestedPort, maxAttempts, host);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(port, host, () => resolve());
        server.once('error', reject);
      });
      return { port, requestedPort };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
      port = await findAvailablePort(port + 1, maxAttempts - attempt, host);
    }
  }
  throw new Error(`Could not bind a free TCP port starting from ${requestedPort}.`);
}
