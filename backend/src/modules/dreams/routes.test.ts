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
      sql`TRUNCATE TABLE dreams, anchors, emotional_beats, analysis_passes, users RESTART IDENTITY CASCADE`,
    );

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE TABLE dreams, anchors, emotional_beats, analysis_passes RESTART IDENTITY CASCADE`,
    );
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

  describe('GET /api/dreams/summary', () => {
    // The Re-encounter window runs on the recording clock (created_at), which the API never
    // exposes, so these cases set it directly and always pass an explicit asOf rather than
    // depending on the day the suite happens to run.
    const recordDream = async (
      agent: ReturnType<typeof request.agent>,
      { date, narrative, recordedAt }: { date: string; narrative: string; recordedAt: string },
    ): Promise<number> => {
      const created = await agent.post('/api/dreams').send({ date, narrative });
      const dreamId = created.body.dream.id as number;
      await db.execute(sql`UPDATE dreams SET created_at = ${recordedAt} WHERE id = ${dreamId}`);
      return dreamId;
    };

    // Recorded on 2026-09-07, which is exactly seven nights before the asOf every case below
    // asks for, so the fixture sits on the near edge of eligibility.
    const eligible = {
      date: '2026-08-20',
      narrative: '<p>A corridor of doors, none of which opened.</p>',
      recordedAt: '2026-09-07T09:00:00',
    };

    it('requires authentication', async () => {
      const res = await request(createApp()).get('/api/dreams/summary');
      expect(res.status).toBe(401);
    });

    it('reports no dreams and no Re-encounter for a dreamer who has recorded nothing', async () => {
      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ hasAnyDreams: false, reEncounter: null });
    });

    it("returns the eligible dream's id, date and full narrative", async () => {
      const dreamId = await recordDream(aliceAgent, eligible);

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        hasAnyDreams: true,
        reEncounter: { id: dreamId, date: eligible.date, narrative: eligible.narrative },
      });
    });

    it('does not offer a dream recorded fewer than seven nights ago', async () => {
      await recordDream(aliceAgent, { ...eligible, recordedAt: '2026-09-11T09:00:00' });

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ hasAnyDreams: true, reEncounter: null });
    });

    it('offers a dream recorded seven nights before asOf however late in the day it was written', async () => {
      const dreamId = await recordDream(aliceAgent, {
        ...eligible,
        recordedAt: '2026-09-07T23:59:00',
      });

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body.reEncounter).toEqual(expect.objectContaining({ id: dreamId }));
    });

    it('does not offer a dream recorded the day after the seven-night boundary', async () => {
      await recordDream(aliceAgent, { ...eligible, recordedAt: '2026-09-08T00:01:00' });

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body.reEncounter).toBeNull();
    });

    it('stops offering a dream once it carries an anchor', async () => {
      const dreamId = await recordDream(aliceAgent, eligible);
      await aliceAgent.post(`/api/dreams/${dreamId}/anchors`).send({});

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body).toEqual({ hasAnyDreams: true, reEncounter: null });
    });

    it('stops offering a dream that carries an analysis pass but no anchor', async () => {
      const dreamId = await recordDream(aliceAgent, eligible);
      const pass = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'Read once, whole, and left where it was.' });
      expect(pass.status).toBe(201);

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body).toEqual({ hasAnyDreams: true, reEncounter: null });
    });

    it('returns the newest eligible dream by the night dreamt', async () => {
      const older = await recordDream(aliceAgent, { ...eligible, date: '2026-07-01' });
      const newer = await recordDream(aliceAgent, {
        ...eligible,
        date: '2026-08-25',
        recordedAt: '2026-09-01T09:00:00',
      });

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body.reEncounter).toEqual(expect.objectContaining({ id: newer }));
      expect(res.body.reEncounter.id).not.toBe(older);
    });

    it('does not offer a back-dated dream recorded today', async () => {
      await recordDream(aliceAgent, {
        ...eligible,
        date: '2026-03-02',
        recordedAt: '2026-09-14T07:00:00',
      });

      const res = await aliceAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.body).toEqual({ hasAnyDreams: true, reEncounter: null });
    });

    it("never reflects another dreamer's dreams", async () => {
      await recordDream(aliceAgent, eligible);

      const res = await bobAgent.get('/api/dreams/summary?asOf=2026-09-14');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ hasAnyDreams: false, reEncounter: null });
    });

    it('rejects a malformed asOf rather than coercing it', async () => {
      const res = await aliceAgent.get('/api/dreams/summary?asOf=not-a-date');
      expect(res.status).toBe(400);
    });

    it('defaults asOf to today when it is absent', async () => {
      const dreamId = await recordDream(aliceAgent, {
        ...eligible,
        recordedAt: '2026-01-05T09:00:00',
      });

      const res = await aliceAgent.get('/api/dreams/summary');

      expect(res.status).toBe(200);
      expect(res.body.reEncounter).toEqual(expect.objectContaining({ id: dreamId }));
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
