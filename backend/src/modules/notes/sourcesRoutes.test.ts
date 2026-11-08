import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { LITERATURE_NOTE_BODY_MAX, SOURCE_TITLE_MAX, SOURCE_URL_MAX } from './validation';

describe('sources routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration suites share this database and only truncate their own tables in
    // beforeEach, so start from a clean slate before seeding this file's fixtures.
    await db.execute(sql`TRUNCATE TABLE notes, sources, users RESTART IDENTITY CASCADE`);

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE notes, sources RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const validPayload = {
    title: 'How to Take Smart Notes',
    kind: 'book',
    author: 'Sönke Ahrens',
    url: 'https://example.com/smart-notes',
  };

  describe('POST /api/sources', () => {
    it('creates a Source and returns 201 with the stored row', async () => {
      const res = await aliceAgent.post('/api/sources').send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.source).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: 'How to Take Smart Notes',
          kind: 'book',
          author: 'Sönke Ahrens',
          url: 'https://example.com/smart-notes',
        }),
      );
    });

    it('creates a Source from a title and a kind alone, storing the rest as null', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ title: 'An unattributed essay', kind: 'article' });

      expect(res.status).toBe(201);
      expect(res.body.source).toEqual(
        expect.objectContaining({ author: null, url: null, kind: 'article' }),
      );
    });

    it('trims and collapses whitespace before storing', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ title: '  How to\n\nTake   Smart Notes  ', kind: 'book', author: ' Ahrens ' });

      expect(res.body.source).toEqual(
        expect.objectContaining({ title: 'How to Take Smart Notes', author: 'Ahrens' }),
      );
    });

    it('stores no status of any kind, since a Source has no lifecycle', async () => {
      const res = await aliceAgent.post('/api/sources').send(validPayload);

      expect(res.body.source).not.toHaveProperty('status');
    });

    it('returns 400 with a readable message when the title is missing', async () => {
      const res = await aliceAgent.post('/api/sources').send({ title: '  ', kind: 'book' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A Source needs a title.');
    });

    it('returns 400 when the kind is not one of the four', async () => {
      const res = await aliceAgent.post('/api/sources').send({ title: 'A talk', kind: 'podcast' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A Source is a book, an article, a video, or something else.');
    });

    it('returns 400 naming the ceiling when the title runs over it', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ title: 'a'.repeat(SOURCE_TITLE_MAX + 1), kind: 'book' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(`A Source title is at most ${SOURCE_TITLE_MAX} characters.`);
    });

    it('returns 400 naming the ceiling when the url runs over it', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({
          title: 'A long link',
          kind: 'article',
          url: `https://e.com/${'a'.repeat(SOURCE_URL_MAX)}`,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A Source link is at most 2,000 characters.');
    });

    it('returns 400 for a link that is not http(s)', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ title: 'A bad link', kind: 'article', url: 'javascript:alert(1)' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A Source link must start with http:// or https://.');
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).post('/api/sources').send(validPayload);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/sources', () => {
    it('returns an empty list for a user with no Sources', async () => {
      const res = await aliceAgent.get('/api/sources');

      expect(res.status).toBe(200);
      expect(res.body.sources).toEqual([]);
    });

    it("lists only the requester's own Sources", async () => {
      await aliceAgent.post('/api/sources').send({ title: "Alice's book", kind: 'book' });
      await bobAgent.post('/api/sources').send({ title: "Bob's book", kind: 'book' });

      const res = await aliceAgent.get('/api/sources');

      expect(res.body.sources).toHaveLength(1);
      expect(res.body.sources[0].title).toBe("Alice's book");
    });

    // Until Literature notes exist, every Source is in the "no notes" band and the ordering
    // collapses to creation order, most recent first.
    it('orders Sources with no notes most-recently-added first', async () => {
      await aliceAgent.post('/api/sources').send({ title: 'First', kind: 'book' });
      await aliceAgent.post('/api/sources').send({ title: 'Second', kind: 'book' });
      await aliceAgent.post('/api/sources').send({ title: 'Third', kind: 'book' });

      const res = await aliceAgent.get('/api/sources');

      expect(res.body.sources.map((s: { title: string }) => s.title)).toEqual([
        'Third',
        'Second',
        'First',
      ]);
    });

    it('carries the derived note count and last-note date on each entry', async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);
      await aliceAgent
        .post(`/api/sources/${created.body.source.id}/notes`)
        .send({ body: 'A first point.', position: '42' });

      const res = await aliceAgent.get('/api/sources');

      expect(res.body.sources[0]).toEqual(
        expect.objectContaining({ noteCount: 1, lastNoteAt: expect.any(String) }),
      );
    });

    it('reports no notes and no last-note date for a Source nothing is written from', async () => {
      await aliceAgent.post('/api/sources').send(validPayload);

      const res = await aliceAgent.get('/api/sources');

      expect(res.body.sources[0]).toEqual(
        expect.objectContaining({ noteCount: 0, lastNoteAt: null }),
      );
    });

    // The recency of a Source's Literature notes is the only signal that it is active (#70),
    // so a Source written from today leads one added later that nothing has been written from.
    it('puts Sources with notes ahead of Sources without', async () => {
      const written = await aliceAgent
        .post('/api/sources')
        .send({ title: 'Written from', kind: 'book' });
      await aliceAgent.post('/api/sources').send({ title: 'Untouched', kind: 'book' });
      await aliceAgent
        .post(`/api/sources/${written.body.source.id}/notes`)
        .send({ body: 'A point.', position: '42' });

      const res = await aliceAgent.get('/api/sources');

      expect(res.body.sources.map((entry: { title: string }) => entry.title)).toEqual([
        'Written from',
        'Untouched',
      ]);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).get('/api/sources');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/sources/:sourceId', () => {
    it('returns the Source for its owner', async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);

      const res = await aliceAgent.get(`/api/sources/${created.body.source.id}`);

      expect(res.status).toBe(200);
      expect(res.body.source).toEqual(
        expect.objectContaining({ id: created.body.source.id, title: validPayload.title }),
      );
    });

    it("returns 404 for another user's Source rather than disclosing it", async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);

      const res = await bobAgent.get(`/api/sources/${created.body.source.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Source not found');
    });

    it('returns 404 for an id that is not a number', async () => {
      const res = await aliceAgent.get('/api/sources/not-a-number');
      expect(res.status).toBe(404);
    });

    // `Number('Infinity')` is a number and is not NaN, so only a whole-number guard keeps it
    // out of a query against an integer column, where it would surface as a 500.
    it.each(['Infinity', '-1', '1.5'])('returns 404 for the id %s', async (sourceId) => {
      const res = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(res.status).toBe(404);
    });

    it('returns the Source with its notes oldest-first and their distinct sections', async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);
      const sourceId = created.body.source.id;
      await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'The first point.', section: 'Ch. 1', position: '12' });
      await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'The second point.', section: 'Ch. 1', position: '14' });
      await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'The third point.', section: 'Ch. 2', position: '31' });

      const res = await aliceAgent.get(`/api/sources/${sourceId}`);

      expect(res.status).toBe(200);
      expect(res.body.notes.map((note: { body: string }) => note.body)).toEqual([
        'The first point.',
        'The second point.',
        'The third point.',
      ]);
      // Distinct, and most recently used first, so the section being read in is offered first.
      expect(res.body.sections).toEqual(['Ch. 2', 'Ch. 1']);
    });

    it('carries an empty stream and no sections for a Source nothing is written from', async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);

      const res = await aliceAgent.get(`/api/sources/${created.body.source.id}`);

      expect(res.body.notes).toEqual([]);
      expect(res.body.sections).toEqual([]);
    });

    it('leaves a note with no section out of the section suggestions', async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);
      await aliceAgent
        .post(`/api/sources/${created.body.source.id}/notes`)
        .send({ body: 'A point with a page alone.', position: '42' });

      const res = await aliceAgent.get(`/api/sources/${created.body.source.id}`);

      expect(res.body.sections).toEqual([]);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).get('/api/sources/1');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/sources/:sourceId/notes', () => {
    let sourceId: number;

    beforeEach(async () => {
      const created = await aliceAgent.post('/api/sources').send(validPayload);
      sourceId = created.body.source.id;
    });

    it('captures a Literature note and returns 201 with the stored note', async () => {
      const res = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'Reading is not understanding.', section: 'Ch. 3', position: '42' });

      expect(res.status).toBe(201);
      expect(res.body.note).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          kind: 'literature',
          sourceId,
          body: 'Reading is not understanding.',
          section: 'Ch. 3',
          position: '42',
          excerpt: null,
          openQuestion: false,
        }),
      );
    });

    it('captures a note from a position alone, and from a section alone', async () => {
      const page = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A point.', position: '42' });
      const chapter = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'Another point.', section: 'Ch. 3' });

      expect(page.status).toBe(201);
      expect(page.body.note).toEqual(expect.objectContaining({ section: null, position: '42' }));
      expect(chapter.status).toBe(201);
      expect(chapter.body.note).toEqual(
        expect.objectContaining({ section: 'Ch. 3', position: null }),
      );
    });

    it('keeps the excerpt apart from the body, in the words it was given', async () => {
      const res = await aliceAgent.post(`/api/sources/${sourceId}/notes`).send({
        body: 'My own words.',
        position: '42',
        excerpt: "The author's exact words.",
      });

      expect(res.body.note).toEqual(
        expect.objectContaining({
          body: 'My own words.',
          excerpt: "The author's exact words.",
        }),
      );
    });

    it('records a note flagged as an open question', async () => {
      const res = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'Not sure I follow this.', position: '42', openQuestion: true });

      expect(res.body.note).toEqual(expect.objectContaining({ openQuestion: true }));
    });

    it('returns 400 when both halves of the Locator are empty', async () => {
      const res = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A point.', section: '  ', position: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note needs a section or a position - either one will do.');
    });

    it('returns 400 when the body is empty', async () => {
      const res = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: '   ', position: '42' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note needs a few words of your own.');
    });

    it('returns 400 naming the ceiling when the body runs over it', async () => {
      const res = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'a'.repeat(LITERATURE_NOTE_BODY_MAX + 1), position: '42' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note is at most 4,000 characters.');
    });

    it("returns 404 for another user's Source rather than writing into it", async () => {
      const res = await bobAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A point.', position: '42' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Source not found');
    });

    it.each(['not-a-number', 'Infinity', '-1', '1.5'])(
      'returns 404 for the Source id %s',
      async (badId) => {
        const res = await aliceAgent
          .post(`/api/sources/${badId}/notes`)
          .send({ body: 'A point.', position: '42' });

        expect(res.status).toBe(404);
      },
    );

    it('returns 404 for a Source that does not exist', async () => {
      const res = await aliceAgent
        .post('/api/sources/999999/notes')
        .send({ body: 'A point.', position: '42' });

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(createApp())
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A point.', position: '42' });

      expect(res.status).toBe(401);
    });
  });
});
