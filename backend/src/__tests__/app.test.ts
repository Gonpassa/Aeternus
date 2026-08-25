import request from 'supertest';
import { createApp } from '../app';

describe('createApp', () => {
  it('responds to GET /api/health with status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('trust proxy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUseTestDb = process.env.USE_TEST_DB;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.USE_TEST_DB = originalUseTestDb;
    jest.resetModules();
  });

  it("trusts the first proxy hop in production, so secure session cookies get set behind Fly's TLS-terminating proxy", async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.USE_TEST_DB = 'true';
    const { createApp: createProdApp } = await import('../app');

    const app = createProdApp();

    expect(app.get('trust proxy')).toBe(1);
  });

  it('does not trust the proxy outside production', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const { createApp: createTestApp } = await import('../app');

    const app = createTestApp();

    expect(app.get('trust proxy')).toBe(false);
  });
});
