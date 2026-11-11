import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { LINK_REASON_MAX } from './validation';

// The panel and the Links it makes, end to end. Linking is the one thing in this module that
// reaches past the Source in front of the user, so the fixtures below deliberately build two
// Sources: a Link between two Literature notes across different readings is the case the
// browsable panel exists for (#85).
describe('link routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    await db.execute(sql`TRUNCATE TABLE links, notes, sources, users RESTART IDENTITY CASCADE`);

    await createUser('alice', 'alice@example.com', 'secret123');
    await createUser('bob', 'bob@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });

    bobAgent = request.agent(createApp());
    await bobAgent.post('/api/auth/login').send({ username: 'bob', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE links, notes, sources RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const createSource = async (
    agent: ReturnType<typeof request.agent>,
    title: string,
  ): Promise<number> => {
    const res = await agent.post('/api/sources').send({ title, kind: 'book' });
    return res.body.source.id as number;
  };

  const fileNote = async (
    agent: ReturnType<typeof request.agent>,
    sourceId: number,
    overrides: Record<string, unknown> = {},
  ): Promise<number> => {
    const res = await agent.post(`/api/sources/${sourceId}/notes`).send({
      body: 'Writing is the thinking, not the record of it.',
      section: 'Ch. 3',
      position: '42',
      ...overrides,
    });
    return res.body.note.id as number;
  };

  const writePermanentNote = async (
    agent: ReturnType<typeof request.agent>,
    targetNoteId: number,
    overrides: Record<string, unknown> = {},
  ): Promise<number> => {
    const res = await agent.post('/api/notes/permanent').send({
      title: 'Writing is how an idea is tested, not how it is stored.',
      body: 'An idea that cannot be written down has not been had yet.',
      links: [{ targetNoteId, reason: 'This is the claim that note was circling.' }],
      ...overrides,
    });
    return res.body.note.id as number;
  };

  describe('GET /api/notes/link-targets', () => {
    it('offers the Source’s other notes without a query, oldest first', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const first = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const second = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const third = await fileNote(aliceAgent, sourceId, { body: 'The third note.' });

      const res = await aliceAgent.get('/api/notes/link-targets').query({ fromNoteId: second });

      expect(res.status).toBe(200);
      // The note being linked from is not among them: a note linking to itself states nothing.
      expect(res.body.sameSource.map((row: { note: { id: number } }) => row.note.id)).toEqual([
        first,
        third,
      ]);
      // Nothing is searched until something is typed.
      expect(res.body.results).toEqual([]);
    });

    it('carries enough for a result to be readable without a second fetch', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const first = await fileNote(aliceAgent, sourceId, {
        body: 'The first note.',
        section: 'Ch. 1',
        position: '7',
      });
      const second = await fileNote(aliceAgent, sourceId);

      const res = await aliceAgent.get('/api/notes/link-targets').query({ fromNoteId: second });

      expect(res.body.sameSource).toEqual([
        {
          note: expect.objectContaining({
            id: first,
            kind: 'literature',
            body: 'The first note.',
            section: 'Ch. 1',
            position: '7',
          }),
          sourceTitle: 'How to Take Smart Notes',
          existingLink: null,
        },
      ]);
    });

    it('searches a Literature note by its body, its Source title and either half of its Locator', async () => {
      const readingId = await createSource(aliceAgent, 'Thinking, Fast and Slow');
      const otherId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const fromNoteId = await fileNote(aliceAgent, readingId, { body: 'Where the panel opens.' });
      const byBody = await fileNote(aliceAgent, otherId, { body: 'Elaboration beats rereading.' });
      const bySection = await fileNote(aliceAgent, otherId, {
        body: 'Something else entirely.',
        section: 'Elaboration',
      });
      const byPosition = await fileNote(aliceAgent, otherId, {
        body: 'Something else entirely.',
        position: 'elaboration-7',
      });

      const found = async (q: string) => {
        const res = await aliceAgent.get('/api/notes/link-targets').query({ fromNoteId, q });
        return (res.body.results as { note: { id: number } }[]).map((row) => row.note.id);
      };

      expect((await found('elaboration')).sort()).toEqual([byBody, bySection, byPosition].sort());
      // By Source title: the whole of that reading answers, the note being linked from aside.
      expect((await found('Smart Notes')).sort()).toEqual([byBody, bySection, byPosition].sort());
    });

    it('searches a Permanent note by its title and by its body', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const literatureId = await fileNote(aliceAgent, sourceId);
      const byTitle = await writePermanentNote(aliceAgent, literatureId, {
        title: 'Elaboration is what makes a note worth having.',
        body: 'Nothing matching here.',
      });
      const fromNoteId = await fileNote(aliceAgent, sourceId, { body: 'Where the panel opens.' });

      const res = await aliceAgent
        .get('/api/notes/link-targets')
        .query({ fromNoteId, q: 'elaboration' });

      expect(res.body.results).toEqual([
        expect.objectContaining({
          note: expect.objectContaining({ id: byTitle, kind: 'permanent' }),
          sourceTitle: null,
        }),
      ]);
    });

    it('treats LIKE’s own wildcards as text rather than as a pattern', async () => {
      const readingId = await createSource(aliceAgent, 'Thinking, Fast and Slow');
      const otherId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const fromNoteId = await fileNote(aliceAgent, readingId, { body: 'Where the panel opens.' });
      await fileNote(aliceAgent, otherId, { body: 'Nothing with a percentage in it.' });
      const literal = await fileNote(aliceAgent, otherId, {
        body: 'Retention near 100% is rare.',
      });

      const res = await aliceAgent.get('/api/notes/link-targets').query({ fromNoteId, q: '100%' });

      expect(res.body.results.map((row: { note: { id: number } }) => row.note.id)).toEqual([
        literal,
      ]);
    });

    it('marks a candidate that is already linked with the Link that is there', async () => {
      const readingId = await createSource(aliceAgent, 'Thinking, Fast and Slow');
      const otherId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const fromNoteId = await fileNote(aliceAgent, readingId, { body: 'Where the panel opens.' });
      const targetId = await fileNote(aliceAgent, otherId, {
        body: 'Elaboration beats rereading.',
      });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: fromNoteId, targetNoteId: targetId, reason: 'Same mechanism.' });

      const res = await aliceAgent
        .get('/api/notes/link-targets')
        .query({ fromNoteId, q: 'elaboration' });

      expect(res.body.results[0].existingLink).toEqual(
        expect.objectContaining({ id: made.body.link.id, reason: 'Same mechanism.' }),
      );
      // The same Links are also listed on their own, because the Topic tier is read from the
      // Topics endpoint and has to be marked from this list (#87, ADR 0013).
      expect(res.body.existingLinks).toEqual([
        expect.objectContaining({ id: made.body.link.id, reason: 'Same mechanism.' }),
      ]);
    });

    it('does not offer the same note in both tiers', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const sibling = await fileNote(aliceAgent, sourceId, {
        body: 'Elaboration beats rereading.',
      });
      const fromNoteId = await fileNote(aliceAgent, sourceId, { body: 'Where the panel opens.' });

      const res = await aliceAgent
        .get('/api/notes/link-targets')
        .query({ fromNoteId, q: 'elaboration' });

      expect(res.body.sameSource.map((row: { note: { id: number } }) => row.note.id)).toEqual([
        sibling,
      ]);
      expect(res.body.results).toEqual([]);
    });

    it('offers no same-Source tier for a Permanent note, which belongs to none', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const literatureId = await fileNote(aliceAgent, sourceId);
      const permanentId = await writePermanentNote(aliceAgent, literatureId);

      const res = await aliceAgent
        .get('/api/notes/link-targets')
        .query({ fromNoteId: permanentId });

      expect(res.status).toBe(200);
      expect(res.body.sameSource).toEqual([]);
    });

    it('never reaches another user’s notes', async () => {
      const bobSource = await createSource(bobAgent, 'Bob’s reading');
      await fileNote(bobAgent, bobSource, { body: 'Elaboration beats rereading.' });
      const aliceSource = await createSource(aliceAgent, 'How to Take Smart Notes');
      const fromNoteId = await fileNote(aliceAgent, aliceSource);

      const res = await aliceAgent
        .get('/api/notes/link-targets')
        .query({ fromNoteId, q: 'elaboration' });

      expect(res.body.results).toEqual([]);
    });

    it('answers not found for a note that is not this user’s', async () => {
      const bobSource = await createSource(bobAgent, 'Bob’s reading');
      const bobNote = await fileNote(bobAgent, bobSource);

      const res = await aliceAgent.get('/api/notes/link-targets').query({ fromNoteId: bobNote });

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(createApp())
        .get('/api/notes/link-targets')
        .query({ fromNoteId: 1 });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/links', () => {
    it('links two Literature notes across different Sources, with its reason', async () => {
      const readingId = await createSource(aliceAgent, 'Thinking, Fast and Slow');
      const otherId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const originNoteId = await fileNote(aliceAgent, readingId, { body: 'System 2 is lazy.' });
      const targetNoteId = await fileNote(aliceAgent, otherId, { body: 'Elaboration is effort.' });

      const res = await aliceAgent
        .post('/api/links')
        .send({ originNoteId, targetNoteId, reason: 'Both are about effort being avoided.' });

      expect(res.status).toBe(201);
      expect(res.body.link).toEqual(
        expect.objectContaining({
          originNoteId,
          targetNoteId,
          reason: 'Both are about effort being avoided.',
          targetReason: null,
        }),
      );
    });

    it('adds this end’s reason to the Link already there rather than making a second', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const first = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });

      const back = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: b, targetNoteId: a, reason: 'B says this about A.' });

      // 200 rather than 201: nothing was created, and the answer is the Link that exists.
      expect(back.status).toBe(200);
      expect(back.body.link).toEqual(
        expect.objectContaining({
          id: first.body.link.id,
          originNoteId: a,
          targetNoteId: b,
          reason: 'A says this about B.',
          targetReason: 'B says this about A.',
        }),
      );
      const { rows } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from links`,
      );
      expect(rows[0]?.total).toBe(1);
    });

    // Linking again from an end that has already written its line is a rewrite, and rewriting
    // happens in place at its own endpoint (ADR 0015) - so this path refuses rather than
    // taking the new line as an edit nobody declared.
    it('refuses a second connection from the end that has already said why', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'The first thought.' });

      const again = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'What it was really about.' });

      expect(again.status).toBe(409);
      expect(again.body.error).toBe(
        'This note has already said why - rewrite the reason where the Link is shown.',
      );

      const { rows } = await db.execute<{ reason: string }>(
        sql`select reason from links where origin_note_id = ${a}`,
      );
      expect(rows[0]?.reason).toBe('The first thought.');
    });

    it('refuses linking back a second time from the end that already linked back', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'The first thought.' });
      await aliceAgent
        .post('/api/links')
        .send({ originNoteId: b, targetNoteId: a, reason: 'And this back.' });

      const again = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: b, targetNoteId: a, reason: 'Said differently.' });

      expect(again.status).toBe(409);
    });

    it('refuses a connection with no reason', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });

      const res = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/why the two belong together/);
    });

    it('refuses a reason longer than one line’s worth', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });

      const res = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'x'.repeat(LINK_REASON_MAX + 1) });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/a note of its own/);
    });

    it('refuses a note connected to itself', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId);

      const res = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: a, reason: 'It reminds me of itself.' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot be linked to itself/);
    });

    it('refuses an end that is not this user’s note', async () => {
      const aliceSource = await createSource(aliceAgent, 'How to Take Smart Notes');
      const mine = await fileNote(aliceAgent, aliceSource);
      const bobSource = await createSource(bobAgent, 'Bob’s reading');
      const theirs = await fileNote(bobAgent, bobSource);

      const res = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: mine, targetNoteId: theirs, reason: 'Not mine to connect.' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/could not be found/);
      const { rows } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from links`,
      );
      expect(rows[0]?.total).toBe(0);
    });

    it('requires authentication', async () => {
      const res = await request(createApp())
        .post('/api/links')
        .send({ originNoteId: 1, targetNoteId: 2, reason: 'Nobody is signed in.' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/links/:linkId', () => {
    it('rewrites the origin end’s reason in place', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'The first thought.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: a, reason: 'What it was really about.' });

      expect(res.status).toBe(200);
      expect(res.body.link).toEqual(
        expect.objectContaining({
          reason: 'What it was really about.',
          targetReason: null,
        }),
      );
    });

    it('rewrites the target end’s reason without touching the origin’s', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });
      await aliceAgent
        .post('/api/links')
        .send({ originNoteId: b, targetNoteId: a, reason: 'B says this about A.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: b, reason: 'What B really meant.' });

      expect(res.status).toBe(200);
      expect(res.body.link).toEqual(
        expect.objectContaining({
          reason: 'A says this about B.',
          targetReason: 'What B really meant.',
        }),
      );
    });

    it('refuses an edit from an end that has said nothing yet', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: b, reason: 'B has not linked back.' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/link back from it/);
    });

    it('refuses an emptied reason', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: a, reason: '  ' });

      expect(res.status).toBe(400);
    });

    it('answers not found for a note that is not one of the Link’s ends', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const c = await fileNote(aliceAgent, sourceId, { body: 'The third note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: c, reason: 'Not my connection to speak for.' });

      expect(res.status).toBe(404);
    });

    it('answers not found for another user’s Link', async () => {
      const sourceId = await createSource(bobAgent, 'Bob’s reading');
      const a = await fileNote(bobAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(bobAgent, sourceId, { body: 'The second note.' });
      const made = await bobAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'Bob’s own reason.' });

      const res = await aliceAgent
        .patch(`/api/links/${made.body.link.id}`)
        .send({ fromNoteId: a, reason: 'Not mine to rewrite.' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/links/:linkId', () => {
    it('removes a Link between two Literature notes', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const a = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const made = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'A says this about B.' });

      const res = await aliceAgent.delete(`/api/links/${made.body.link.id}`);

      expect(res.status).toBe(204);
      const { rows } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from links`,
      );
      expect(rows[0]?.total).toBe(0);
    });

    it('refuses the removal when it is a Permanent note’s last, and names that note', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const literatureId = await fileNote(aliceAgent, sourceId);
      const written = await aliceAgent.post('/api/notes/permanent').send({
        title: 'Writing is how an idea is tested, not how it is stored.',
        body: 'An idea that cannot be written down has not been had yet.',
        links: [{ targetNoteId: literatureId, reason: 'The claim that note was circling.' }],
      });

      const res = await aliceAgent.delete(`/api/links/${written.body.links[0].id}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Writing is how an idea is tested, not how it is stored.');
      const { rows } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from links`,
      );
      expect(rows[0]?.total).toBe(1);
    });

    it('allows the removal once the Permanent note has another Link', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const first = await fileNote(aliceAgent, sourceId, { body: 'The first note.' });
      const second = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const written = await aliceAgent.post('/api/notes/permanent').send({
        title: 'Writing is how an idea is tested, not how it is stored.',
        body: 'An idea that cannot be written down has not been had yet.',
        links: [{ targetNoteId: first, reason: 'The claim that note was circling.' }],
      });
      await aliceAgent.post('/api/links').send({
        originNoteId: second,
        targetNoteId: written.body.note.id,
        reason: 'This reading reaches the same idea.',
      });

      const res = await aliceAgent.delete(`/api/links/${written.body.links[0].id}`);

      expect(res.status).toBe(204);
    });

    it('counts the Permanent note’s Links in either direction', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const literatureId = await fileNote(aliceAgent, sourceId);
      const other = await fileNote(aliceAgent, sourceId, { body: 'The second note.' });
      const written = await aliceAgent.post('/api/notes/permanent').send({
        title: 'Writing is how an idea is tested, not how it is stored.',
        body: 'An idea that cannot be written down has not been had yet.',
        links: [{ targetNoteId: literatureId, reason: 'The claim that note was circling.' }],
      });
      // The idea's only remaining Link now points at it rather than out of it, which is still
      // a Link (ADR 0014).
      const inbound = await aliceAgent.post('/api/links').send({
        originNoteId: other,
        targetNoteId: written.body.note.id,
        reason: 'This reading reaches the same idea.',
      });
      await aliceAgent.delete(`/api/links/${written.body.links[0].id}`);

      const res = await aliceAgent.delete(`/api/links/${inbound.body.link.id}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Writing is how an idea is tested, not how it is stored.');
    });

    it('names both ideas when a removal would leave two unlinked', async () => {
      const sourceId = await createSource(aliceAgent, 'How to Take Smart Notes');
      const literatureId = await fileNote(aliceAgent, sourceId);
      const first = await aliceAgent.post('/api/notes/permanent').send({
        title: 'The first idea.',
        body: 'Its body.',
        links: [{ targetNoteId: literatureId, reason: 'From this note.' }],
      });
      const second = await aliceAgent.post('/api/notes/permanent').send({
        title: 'The second idea.',
        body: 'Its body.',
        links: [{ targetNoteId: first.body.note.id, reason: 'Built on the first.' }],
      });
      // The first idea's own Link is removed first, leaving it holding only the Link the
      // second idea made to it; removing that one would strand both at once.
      await aliceAgent.delete(`/api/links/${first.body.links[0].id}`);

      const res = await aliceAgent.delete(`/api/links/${second.body.links[0].id}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('The first idea.');
      expect(res.body.error).toContain('The second idea.');
    });

    it('answers not found for another user’s Link', async () => {
      const sourceId = await createSource(bobAgent, 'Bob’s reading');
      const a = await fileNote(bobAgent, sourceId, { body: 'The first note.' });
      const b = await fileNote(bobAgent, sourceId, { body: 'The second note.' });
      const made = await bobAgent
        .post('/api/links')
        .send({ originNoteId: a, targetNoteId: b, reason: 'Bob’s own reason.' });

      const res = await aliceAgent.delete(`/api/links/${made.body.link.id}`);

      expect(res.status).toBe(404);
      const { rows } = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from links`,
      );
      expect(rows[0]?.total).toBe(1);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).delete('/api/links/1');

      expect(res.status).toBe(401);
    });
  });
});
