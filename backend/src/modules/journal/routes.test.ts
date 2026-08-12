import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';

describe('journal routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration test files share this database and may leave residual
    // rows (e.g. a lingering 'alice' user) since they only truncate in their own
    // beforeEach. Start from a clean slate before seeding this file's fixtures.
    await db.execute(sql`TRUNCATE TABLE entries, users RESTART IDENTITY CASCADE`);

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE entries RESTART IDENTITY`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const validPayload = {
    date: '2026-08-01',
    title: 'A good day',
    primaryMood: 'happy',
    specificEmotion: 'content',
    content: '<p>Hello</p>',
  };

  it('requires authentication', async () => {
    const res = await request(createApp()).get('/api/journal/entries');
    expect(res.status).toBe(401);
  });

  describe('POST /api/journal/entries', () => {
    it('creates an entry and returns 201', async () => {
      const res = await aliceAgent.post('/api/journal/entries').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.entry).toEqual(expect.objectContaining({ title: 'A good day' }));
    });

    it('returns 409 for a second entry on the same date', async () => {
      await aliceAgent.post('/api/journal/entries').send(validPayload);
      const res = await aliceAgent
        .post('/api/journal/entries')
        .send({ ...validPayload, title: 'Different' });
      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid input', async () => {
      const res = await aliceAgent
        .post('/api/journal/entries')
        .send({ ...validPayload, title: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/journal/entries', () => {
    it("lists only the requester's entries, reverse-chronological", async () => {
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-02' });
      await bobAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });

      const res = await aliceAgent.get('/api/journal/entries');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.entries.map((e: { date: string }) => e.date)).toEqual([
        '2026-08-02',
        '2026-08-01',
      ]);
    });
  });

  describe('GET /api/journal/entries/by-date/:date', () => {
    it('finds the entry for a given date', async () => {
      await aliceAgent.post('/api/journal/entries').send(validPayload);
      const res = await aliceAgent.get('/api/journal/entries/by-date/2026-08-01');
      expect(res.status).toBe(200);
      expect(res.body.entry.title).toBe('A good day');
    });

    it('returns 404 when no entry exists for the date', async () => {
      const res = await aliceAgent.get('/api/journal/entries/by-date/2026-08-01');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/journal/entries/by-range', () => {
    it('returns entries within range, scoped to the requester, sorted ascending', async () => {
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-15' });
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-09-01' });
      await bobAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-10' });

      const res = await aliceAgent.get(
        '/api/journal/entries/by-range?start=2026-08-01&end=2026-08-31',
      );

      expect(res.status).toBe(200);
      expect(res.body.map((e: { date: string }) => e.date)).toEqual(['2026-08-01', '2026-08-15']);
    });

    it('returns 400 for a malformed range', async () => {
      const res = await aliceAgent.get('/api/journal/entries/by-range?start=bad&end=2026-08-31');
      expect(res.status).toBe(400);
    });

    it('returns an empty array with 200 when nothing matches', async () => {
      const res = await aliceAgent.get(
        '/api/journal/entries/by-range?start=2099-01-01&end=2099-01-31',
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).get(
        '/api/journal/entries/by-range?start=2026-08-01&end=2026-08-31',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('cross-user isolation', () => {
    it("returns 404 when reading, updating, or deleting another user's entry", async () => {
      const created = await aliceAgent.post('/api/journal/entries').send(validPayload);
      const entryId = created.body.entry.id;

      expect((await bobAgent.get(`/api/journal/entries/${entryId}`)).status).toBe(404);
      expect(
        (await bobAgent.put(`/api/journal/entries/${entryId}`).send(validPayload)).status,
      ).toBe(404);
      expect((await bobAgent.delete(`/api/journal/entries/${entryId}`)).status).toBe(404);
    });
  });

  describe('PUT /api/journal/entries/:id', () => {
    it('updates an entry and returns 200', async () => {
      const created = await aliceAgent.post('/api/journal/entries').send(validPayload);
      const res = await aliceAgent
        .put(`/api/journal/entries/${created.body.entry.id}`)
        .send({ ...validPayload, title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.entry.title).toBe('Updated');
    });
  });

  describe('DELETE /api/journal/entries/:id', () => {
    it('deletes an entry and returns 204', async () => {
      const created = await aliceAgent.post('/api/journal/entries').send(validPayload);
      const res = await aliceAgent.delete(`/api/journal/entries/${created.body.entry.id}`);
      expect(res.status).toBe(204);
      expect((await aliceAgent.get(`/api/journal/entries/${created.body.entry.id}`)).status).toBe(
        404,
      );
    });
  });
});
