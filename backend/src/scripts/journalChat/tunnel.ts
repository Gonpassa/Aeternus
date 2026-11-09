import { ChildProcess, spawn } from 'child_process';
import net from 'net';

const READY_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 200;

const isPortOpen = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const waitForTunnel = (proxy: ChildProcess, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let timer: NodeJS.Timeout;
    let failed = false;
    const fail = (message: string): void => {
      failed = true;
      clearTimeout(timer);
      reject(new Error(message));
    };

    proxy.once('error', () => fail('Could not run `fly`. Is flyctl installed and on your PATH?'));
    proxy.once('exit', () =>
      fail('`fly proxy` exited early. Are you logged in with `fly auth login`?'),
    );

    const poll = async (): Promise<void> => {
      const open = await isPortOpen(port);
      // The proxy can die while the check above is in flight.
      if (failed) return;
      if (open) {
        proxy.removeAllListeners('exit');
        resolve();
      } else if (Date.now() > deadline) {
        fail('Timed out waiting for the `fly proxy` tunnel.');
      } else {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };
    void poll();
  });

// Runs work with a `fly proxy` tunnel open, and always closes the tunnel afterwards.
export const withTunnel = async <T>(
  flyApp: string,
  port: number,
  work: () => Promise<T>,
  flyCommand = 'fly',
): Promise<T> => {
  // Checked first so an unrelated listener can't be mistaken for the tunnel coming up.
  if (await isPortOpen(port)) throw new Error(`Port ${port} is already in use. Free it and retry.`);

  const proxy = spawn(flyCommand, ['proxy', `${port}:5432`, '-a', flyApp], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    await waitForTunnel(proxy, port);
    return await work();
  } finally {
    proxy.kill();
  }
};
