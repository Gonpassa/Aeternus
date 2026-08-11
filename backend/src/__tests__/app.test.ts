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
