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
    await db.execute(
      sql`TRUNCATE TABLE dreams, anchors, emotional_beats, users RESTART IDENTITY CASCADE`,
    );

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE dreams, anchors, emotional_beats RESTART IDENTITY CASCADE`);
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

  describe('GET /api/dreams/:dreamId', () => {
    it('returns the dream with an empty anchors list when none exist', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await aliceAgent.get(`/api/dreams/${created.body.dream.id}`);
      expect(res.status).toBe(200);
      expect(res.body.dream).toEqual(expect.objectContaining({ id: created.body.dream.id }));
      expect(res.body.anchors).toEqual([]);
    });

    it('includes anchors with their emotional beats', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const dreamId = created.body.dream.id;
      const anchorRes = await aliceAgent.post(`/api/dreams/${dreamId}/anchors`).send({});
      const anchorId = anchorRes.body.anchor.id;
      await aliceAgent.post(`/api/anchors/${anchorId}/emotional-beats`).send({ label: 'dread' });

      const res = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(res.status).toBe(200);
      expect(res.body.anchors).toHaveLength(1);
      expect(res.body.anchors[0].id).toBe(anchorId);
      expect(res.body.anchors[0].emotionalBeats).toEqual([
        expect.objectContaining({ label: 'dread' }),
      ]);
    });

    it("404s for another user's dream", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await bobAgent.get(`/api/dreams/${created.body.dream.id}`);
      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await request(createApp()).get(`/api/dreams/${created.body.dream.id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/dreams/:dreamId', () => {
    it('updates the date and narrative', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await aliceAgent
        .patch(`/api/dreams/${created.body.dream.id}`)
        .send({ date: '2026-08-05', narrative: '<p>A revised account.</p>' });
      expect(res.status).toBe(200);
      expect(res.body.dream).toEqual(
        expect.objectContaining({ date: '2026-08-05', narrative: '<p>A revised account.</p>' }),
      );
    });

    it('returns 400 for invalid input', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await aliceAgent
        .patch(`/api/dreams/${created.body.dream.id}`)
        .send({ date: '2026-08-05', narrative: '' });
      expect(res.status).toBe(400);
    });

    it("404s when updating another user's dream", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await bobAgent
        .patch(`/api/dreams/${created.body.dream.id}`)
        .send({ date: '2026-08-05', narrative: '<p>Hijacked.</p>' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/dreams/:dreamId/anchors', () => {
    it('creates an anchor for a dream the user owns', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await aliceAgent.post(`/api/dreams/${created.body.dream.id}/anchors`).send({});
      expect(res.status).toBe(201);
      expect(res.body.anchor).toEqual(expect.objectContaining({ dreamId: created.body.dream.id }));
    });

    it("404s for another user's dream", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const res = await bobAgent.post(`/api/dreams/${created.body.dream.id}/anchors`).send({});
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/anchors/:anchorId', () => {
    it('deletes an anchor and cascades its emotional beats', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const anchorId = anchorRes.body.anchor.id;
      const beatRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/emotional-beats`)
        .send({ label: 'dread' });
      const beatId = beatRes.body.emotionalBeat.id;

      const deleteRes = await aliceAgent.delete(`/api/anchors/${anchorId}`);
      expect(deleteRes.status).toBe(204);

      const updateRes = await aliceAgent
        .patch(`/api/emotional-beats/${beatId}`)
        .send({ label: 'still here?' });
      expect(updateRes.status).toBe(404);
    });

    it("404s when deleting another user's anchor", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const res = await bobAgent.delete(`/api/anchors/${anchorRes.body.anchor.id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/anchors/:anchorId/emotional-beats', () => {
    it('creates an emotional beat on the anchor', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const res = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });
      expect(res.status).toBe(201);
      expect(res.body.emotionalBeat).toEqual(
        expect.objectContaining({ anchorId: anchorRes.body.anchor.id, label: 'awe' }),
      );
    });

    it('allows more than one emotional beat on the same anchor', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const anchorId = anchorRes.body.anchor.id;
      await aliceAgent.post(`/api/anchors/${anchorId}/emotional-beats`).send({ label: 'awe' });
      await aliceAgent.post(`/api/anchors/${anchorId}/emotional-beats`).send({ label: 'dread' });

      const dreamRes = await aliceAgent.get(`/api/dreams/${created.body.dream.id}`);
      expect(dreamRes.body.anchors[0].emotionalBeats).toHaveLength(2);
    });

    it('returns 400 for a blank label', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const res = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: '' });
      expect(res.status).toBe(400);
    });

    it("404s when attaching to another user's anchor", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const res = await bobAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/emotional-beats/:id', () => {
    it('updates the label', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const beatRes = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });

      const res = await aliceAgent
        .patch(`/api/emotional-beats/${beatRes.body.emotionalBeat.id}`)
        .send({ label: 'wonder' });
      expect(res.status).toBe(200);
      expect(res.body.emotionalBeat.label).toBe('wonder');
    });

    it("404s when updating another user's emotional beat", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const beatRes = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });

      const res = await bobAgent
        .patch(`/api/emotional-beats/${beatRes.body.emotionalBeat.id}`)
        .send({ label: 'hijacked' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/emotional-beats/:id', () => {
    it('deletes the emotional beat', async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const beatRes = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });

      const res = await aliceAgent.delete(`/api/emotional-beats/${beatRes.body.emotionalBeat.id}`);
      expect(res.status).toBe(204);

      const dreamRes = await aliceAgent.get(`/api/dreams/${created.body.dream.id}`);
      expect(dreamRes.body.anchors[0].emotionalBeats).toEqual([]);
    });

    it("404s when deleting another user's emotional beat", async () => {
      const created = await aliceAgent.post('/api/dreams').send(validPayload);
      const anchorRes = await aliceAgent
        .post(`/api/dreams/${created.body.dream.id}/anchors`)
        .send({});
      const beatRes = await aliceAgent
        .post(`/api/anchors/${anchorRes.body.anchor.id}/emotional-beats`)
        .send({ label: 'awe' });

      const res = await bobAgent.delete(`/api/emotional-beats/${beatRes.body.emotionalBeat.id}`);
      expect(res.status).toBe(404);
    });
  });
});
