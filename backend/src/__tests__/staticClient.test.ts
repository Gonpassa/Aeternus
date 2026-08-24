import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';

describe('static client serving', () => {
  let clientDistPath: string;

  beforeEach(() => {
    clientDistPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aeternus-client-dist-'));
    fs.writeFileSync(
      path.join(clientDistPath, 'index.html'),
      '<html><body>app shell</body></html>',
    );
    fs.mkdirSync(path.join(clientDistPath, 'assets'));
    fs.writeFileSync(path.join(clientDistPath, 'assets', 'app.js'), 'console.log("hi");');
  });

  afterEach(() => {
    fs.rmSync(clientDistPath, { recursive: true, force: true });
  });

  describe('when a built client directory exists', () => {
    it('serves index.html for a non-API GET path', async () => {
      const app = createApp({ clientDistPath });
      const response = await request(app).get('/journal/2026-08-24');

      expect(response.status).toBe(200);
      expect(response.text).toContain('app shell');
    });

    it('serves a static asset from the built client directory', async () => {
      const app = createApp({ clientDistPath });
      const response = await request(app).get('/assets/app.js');

      expect(response.status).toBe(200);
      expect(response.text).toContain('console.log');
    });

    it('leaves existing /api routes unaffected', async () => {
      const app = createApp({ clientDistPath });
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });

    it('leaves the /api 404 behavior unaffected', async () => {
      const app = createApp({ clientDistPath });
      const response = await request(app).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.text).not.toContain('app shell');
    });
  });

  describe('when no built client directory is present', () => {
    it('does not serve a static fallback for non-API GET paths', async () => {
      const missingPath = path.join(clientDistPath, 'does-not-exist');
      const app = createApp({ clientDistPath: missingPath });
      const response = await request(app).get('/journal/2026-08-24');

      expect(response.status).toBe(404);
      expect(response.text).not.toContain('app shell');
    });
  });
});
