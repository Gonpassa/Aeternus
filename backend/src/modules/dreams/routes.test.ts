import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';

describe('dreams routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration test files share this database and may leave residual
    // rows (e.g. a lingering 'alice' user) since they only truncate in their own
    // beforeEach. Start from a clean slate before seeding this file's fixtures.
    await db.execute(sql`TRUNCATE TABLE dreams, users RESTART IDENTITY CASCADE`);

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE dreams RESTART IDENTITY`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const validPayload = {
    date: '2026-08-01',
    narrative: '<p>I was flying over a city made of glass.</p>',
  };

  it('requires authentication', async () => {
    const res = await request(createApp()).get('/api/dreams');
    expect(res.status).toBe(401);
  });

  describe('POST /api/dreams', () => {
    it('creates a dream and returns 201', async () => {
      const res = await aliceAgent.post('/api/dreams').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.dream).toEqual(
        expect.objectContaining({ date: '2026-08-01', narrative: validPayload.narrative }),
      );
    });

    it('accepts a second dream on the same date without conflict', async () => {
      await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await aliceAgent
        .post('/api/dreams')
        .send({ ...validPayload, narrative: '<p>A second, different dream.</p>' });
      expect(res.status).toBe(201);
    });

    it('returns 400 when narrative is missing', async () => {
      const res = await aliceAgent.post('/api/dreams').send({ date: '2026-08-01', narrative: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when date is invalid', async () => {
      const res = await aliceAgent
        .post('/api/dreams')
        .send({ ...validPayload, date: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).post('/api/dreams').send(validPayload);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dreams', () => {
    it("lists only the requester's dreams, reverse-chronological", async () => {
      await aliceAgent.post('/api/dreams').send({ ...validPayload, date: '2026-08-01' });
      await aliceAgent.post('/api/dreams').send({ ...validPayload, date: '2026-08-02' });
      await bobAgent.post('/api/dreams').send({ ...validPayload, date: '2026-08-01' });

      const res = await aliceAgent.get('/api/dreams');
      expect(res.status).toBe(200);
      expect(res.body.dreams.map((d: { date: string }) => d.date)).toEqual([
        '2026-08-02',
        '2026-08-01',
      ]);
    });

    it('includes more than one dream recorded on the same date', async () => {
      await aliceAgent
        .post('/api/dreams')
        .send({ ...validPayload, narrative: '<p>First dream that night.</p>' });
      await aliceAgent
        .post('/api/dreams')
        .send({ ...validPayload, narrative: '<p>Second dream that night.</p>' });

      const res = await aliceAgent.get('/api/dreams');
      expect(res.status).toBe(200);
      expect(res.body.dreams).toHaveLength(2);
      expect(res.body.dreams.every((d: { date: string }) => d.date === validPayload.date)).toBe(
        true,
      );
    });

    it("never returns another user's dreams", async () => {
      await bobAgent.post('/api/dreams').send(validPayload);

      const res = await aliceAgent.get('/api/dreams');
      expect(res.status).toBe(200);
      expect(res.body.dreams).toEqual([]);
    });
  });
});
