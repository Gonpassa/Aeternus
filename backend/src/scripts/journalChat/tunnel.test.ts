import { chmod, mkdtemp, writeFile } from 'fs/promises';
import net, { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { withTunnel } from './tunnel';

const LISTENING_FLY = `#!/usr/bin/env node
require('net').createServer().listen(Number(process.argv[3].split(':')[0]), '127.0.0.1');
`;
const FAILING_FLY = `#!/usr/bin/env node
process.exit(1);
`;

const fakeFly = async (script: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fake-fly-'));
  const file = path.join(dir, 'fly');
  await writeFile(file, script);
  await chmod(file, 0o755);
  return file;
};

const listen = (port = 0): Promise<net.Server> =>
  new Promise((resolve) => {
    const server = net.createServer().listen(port, '127.0.0.1', () => resolve(server));
  });

const close = (server: net.Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

const freePort = async (): Promise<number> => {
  const server = await listen();
  const { port } = server.address() as AddressInfo;
  await close(server);
  return port;
};

const canConnect = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const proxyToStop = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 200);
  });

describe('withTunnel', () => {
  it('runs the work once the tunnel is up and closes it afterwards', async () => {
    const port = await freePort();

    const openDuringWork = await withTunnel(
      'app',
      port,
      () => canConnect(port),
      await fakeFly(LISTENING_FLY),
    );

    expect(openDuringWork).toBe(true);
    await proxyToStop();
    expect(await canConnect(port)).toBe(false);
  });

  it('closes the tunnel when the work fails', async () => {
    const port = await freePort();
    const fly = await fakeFly(LISTENING_FLY);

    await expect(
      withTunnel('app', port, () => Promise.reject(new Error('boom')), fly),
    ).rejects.toThrow('boom');
    await proxyToStop();
    expect(await canConnect(port)).toBe(false);
  });

  it('reports a proxy that exits before the tunnel opens', async () => {
    const work = jest.fn();
    const fly = await fakeFly(FAILING_FLY);

    await expect(withTunnel('app', await freePort(), work, fly)).rejects.toThrow(/exited early/);
    expect(work).not.toHaveBeenCalled();
  });

  it('reports a missing fly command', async () => {
    await expect(
      withTunnel('app', await freePort(), jest.fn(), '/nonexistent/fly'),
    ).rejects.toThrow(/Could not run/);
  });

  it('refuses a port something else is already using', async () => {
    const server = await listen();
    const { port } = server.address() as AddressInfo;

    await expect(withTunnel('app', port, jest.fn(), await fakeFly(LISTENING_FLY))).rejects.toThrow(
      /already in use/,
    );
    await close(server);
  });
});
