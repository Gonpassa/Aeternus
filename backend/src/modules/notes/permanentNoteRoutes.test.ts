import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { LINK_REASON_MAX, PERMANENT_NOTE_BODY_MAX, PERMANENT_NOTE_TITLE_MAX } from './validation';

// Drizzle wraps driver errors and carries the pg error as `cause`, so the constraint that
// actually refused a statement is one level down (see db/errors.ts). These assertions are
// about the constraints themselves, so they name them rather than merely expecting a throw.
// The mandatory-Link count, taken in either direction: a note reachable only from another
// note's Links is linked (ADR 0014).
const countLinksForNote = async (noteId: number): Promise<number> => {
  const { rows } = await db.execute<{ total: number }>(
    sql`select count(*)::int as total from links where origin_note_id = ${noteId} or target_note_id = ${noteId}`,
  );
  return rows[0]?.total ?? 0;
};

const expectRefusedBy = async (statement: Promise<unknown>, constraint: string): Promise<void> => {
  await expect(statement).rejects.toThrow();
  const error = await statement.catch((err: unknown) => err);
  expect((error as { cause?: { constraint?: string } }).cause?.constraint).toBe(constraint);
};

describe('permanent note routes (integration)', () => {
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

  // The reading page is where this happens, so every fixture starts from a filed Literature
  // note: the composer is opened from one, and that note is the first Link's target.
  const fileLiteratureNote = async (
    agent: ReturnType<typeof request.agent>,
    overrides: Record<string, unknown> = {},
  ): Promise<number> => {
    const source = await agent
      .post('/api/sources')
      .send({ title: 'How to Take Smart Notes', kind: 'book' });
    const note = await agent.post(`/api/sources/${source.body.source.id}/notes`).send({
      body: 'Writing is the thinking, not the record of it.',
      section: 'Ch. 3',
      position: '42',
      ...overrides,
    });
    return note.body.note.id as number;
  };

  const validPayload = (targetNoteId: number) => ({
    title: 'Writing is how an idea is tested, not how it is stored.',
    body: 'An idea that cannot be written down has not been had yet.',
    links: [{ targetNoteId, reason: 'This is the claim that note was circling.' }],
  });

  describe('POST /api/notes/permanent', () => {
    it('creates the note and its first Link in one request', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send(validPayload(noteId));

      expect(res.status).toBe(201);
      expect(res.body.note).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          kind: 'permanent',
          title: 'Writing is how an idea is tested, not how it is stored.',
          body: 'An idea that cannot be written down has not been had yet.',
        }),
      );
      expect(res.body.links).toEqual([
        expect.objectContaining({
          originNoteId: res.body.note.id,
          targetNoteId: noteId,
          reason: 'This is the claim that note was circling.',
          // Null because nobody has linked back from the other end, which is a fact about the
          // Link rather than missing data (ADR 0013).
          targetReason: null,
        }),
      ]);
    });

    it('carries no Source, excerpt, Locator or open-question flag', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send(validPayload(noteId));

      expect(res.body.note).not.toHaveProperty('sourceId');
      expect(res.body.note).not.toHaveProperty('excerpt');
      expect(res.body.note).not.toHaveProperty('section');
      expect(res.body.note).not.toHaveProperty('position');
      expect(res.body.note).not.toHaveProperty('openQuestion');
      const [row] = (
        await db.execute(sql`SELECT source_id, excerpt, section, position, open_question
                             FROM notes WHERE id = ${res.body.note.id}`)
      ).rows as Record<string, unknown>[];
      expect(row).toEqual({
        source_id: null,
        excerpt: null,
        section: null,
        position: null,
        open_question: false,
      });
    });

    it('is born linked: the mandatory-Link count is met the moment it exists', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send(validPayload(noteId));

      expect(await countLinksForNote(res.body.note.id)).toBe(1);
    });

    it('rejects a request with no Link, and writes no note', async () => {
      await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send({
        title: 'An idea with nothing to connect to.',
        body: 'It should not be filed.',
        links: [],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        'A Permanent note needs at least one connection to a note already in the box.',
      );
      const permanent = await db.execute(sql`SELECT id FROM notes WHERE kind = 'permanent'`);
      expect(permanent.rows).toHaveLength(0);
    });

    it('rejects a request with the links key missing entirely', async () => {
      const res = await aliceAgent
        .post('/api/notes/permanent')
        .send({ title: 'An unconnected claim.', body: 'No links key at all.' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        'A Permanent note needs at least one connection to a note already in the box.',
      );
    });

    it('rejects a picked target with no reason', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send({
        title: 'A claim with an unexplained connection.',
        body: 'The reason is the thinking, so the save waits for it.',
        links: [{ targetNoteId: noteId, reason: '   ' }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        'Every connection needs a line saying why the two belong together.',
      );
      const permanent = await db.execute(sql`SELECT id FROM notes WHERE kind = 'permanent'`);
      expect(permanent.rows).toHaveLength(0);
    });

    it('rejects a reason over the one-line ceiling', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send({
        ...validPayload(noteId),
        links: [{ targetNoteId: noteId, reason: 'a'.repeat(LINK_REASON_MAX + 1) }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
      );
    });

    it('rejects a missing title and a missing body in the module voice', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const untitled = await aliceAgent
        .post('/api/notes/permanent')
        .send({ ...validPayload(noteId), title: '   ' });
      expect(untitled.status).toBe(400);
      expect(untitled.body.error).toBe(
        'A Permanent note needs a title stating the idea as a claim.',
      );

      const bodiless = await aliceAgent
        .post('/api/notes/permanent')
        .send({ ...validPayload(noteId), body: '' });
      expect(bodiless.status).toBe(400);
      expect(bodiless.body.error).toBe('A Permanent note needs the idea written out.');
    });

    it('rejects a title and a body over their ceilings', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const longTitle = await aliceAgent
        .post('/api/notes/permanent')
        .send({ ...validPayload(noteId), title: 'a'.repeat(PERMANENT_NOTE_TITLE_MAX + 1) });
      expect(longTitle.body.error).toBe(
        `A title is at most ${PERMANENT_NOTE_TITLE_MAX} characters.`,
      );

      const longBody = await aliceAgent
        .post('/api/notes/permanent')
        .send({ ...validPayload(noteId), body: 'a'.repeat(PERMANENT_NOTE_BODY_MAX + 1) });
      expect(longBody.body.error).toBe('A note is at most 8,000 characters.');
    });

    it('rejects the same target named twice, since a pair carries one Link', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send({
        ...validPayload(noteId),
        links: [
          { targetNoteId: noteId, reason: 'One reason.' },
          { targetNoteId: noteId, reason: 'And another.' },
        ],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note can only be connected once.');
    });

    it('collapses the title and reason to one line and keeps the body as typed', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send({
        title: '  Writing   is\nhow an idea is tested.  ',
        body: '  First line.\n\nSecond line.  ',
        links: [{ targetNoteId: noteId, reason: '  Two\nwords.  ' }],
      });

      expect(res.body.note.title).toBe('Writing is how an idea is tested.');
      expect(res.body.note.body).toBe('First line.\n\nSecond line.');
      expect(res.body.links[0].reason).toBe('Two words.');
    });

    it('refuses to link to another user’s note, and writes nothing', async () => {
      const bobNoteId = await fileLiteratureNote(bobAgent);

      const res = await aliceAgent.post('/api/notes/permanent').send(validPayload(bobNoteId));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('That note could not be found to connect to.');
      const permanent = await db.execute(sql`SELECT id FROM notes WHERE kind = 'permanent'`);
      expect(permanent.rows).toHaveLength(0);
    });

    it('refuses to link to a note that does not exist, and writes nothing', async () => {
      const res = await aliceAgent.post('/api/notes/permanent').send(validPayload(9999));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('That note could not be found to connect to.');
      const permanent = await db.execute(sql`SELECT id FROM notes WHERE kind = 'permanent'`);
      expect(permanent.rows).toHaveLength(0);
    });

    it('rejects a target id that is not a whole positive number', async () => {
      const res = await aliceAgent
        .post('/api/notes/permanent')
        .send({ ...validPayload(1), links: [{ targetNoteId: 1.5, reason: 'Why.' }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A connection needs a note to connect to.');
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).post('/api/notes/permanent').send(validPayload(1));

      expect(res.status).toBe(401);
    });
  });

  describe('the connections view on the reading page', () => {
    it('shows the Permanent note in the Literature note’s inbound group', async () => {
      const source = await aliceAgent
        .post('/api/sources')
        .send({ title: 'How to Take Smart Notes', kind: 'book' });
      const sourceId = source.body.source.id as number;
      const note = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'Writing is the thinking.', section: 'Ch. 3', position: '42' });
      const noteId = note.body.note.id as number;
      const created = await aliceAgent.post('/api/notes/permanent').send(validPayload(noteId));

      const res = await aliceAgent.get(`/api/sources/${sourceId}`);

      expect(res.status).toBe(200);
      expect(res.body.notes[0].connections.connectsTo).toEqual([]);
      expect(res.body.notes[0].connections.connectedFrom).toHaveLength(1);
      const [connection] = res.body.notes[0].connections.connectedFrom;
      expect(connection.link).toEqual(
        expect.objectContaining({
          originNoteId: created.body.note.id,
          targetNoteId: noteId,
          reason: 'This is the claim that note was circling.',
        }),
      );
      expect(connection.other).toEqual(
        expect.objectContaining({
          id: created.body.note.id,
          kind: 'permanent',
          title: 'Writing is how an idea is tested, not how it is stored.',
        }),
      );
      // A Permanent note has a title of its own, so no Source title rides with it.
      expect(connection.sourceTitle).toBeNull();
    });

    it('groups by the Link\u2019s direction, listing a note\u2019s inbound rows oldest first', async () => {
      const source = await aliceAgent
        .post('/api/sources')
        .send({ title: 'How to Take Smart Notes', kind: 'book' });
      const sourceId = source.body.source.id as number;
      const first = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'Writing is the thinking.', section: 'Ch. 3', position: '42' });
      const second = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A second reading, later on.', section: 'Ch. 9', position: '120' });
      // One Permanent note connected to both notes, so each Literature note's inbound group
      // has a row, and then a second one connected to the first note alone.
      await aliceAgent.post('/api/notes/permanent').send({
        title: 'Two readings of the same point meet here.',
        body: 'The claim the two notes were both circling.',
        links: [
          { targetNoteId: first.body.note.id, reason: 'Where the point is made.' },
          { targetNoteId: second.body.note.id, reason: 'Where it is made again.' },
        ],
      });
      await aliceAgent.post('/api/notes/permanent').send({
        title: 'A third claim, connected to the first note.',
        body: 'Written from the same note on another day.',
        links: [{ targetNoteId: first.body.note.id, reason: 'Still the same note.' }],
      });

      const res = await aliceAgent.get(`/api/sources/${sourceId}`);
      const card = (id: number) =>
        res.body.notes.find((candidate: { id: number }) => candidate.id === id);

      expect(
        card(first.body.note.id).connections.connectedFrom.map(
          (connection: { other: { title: string } }) => connection.other.title,
        ),
      ).toEqual([
        'Two readings of the same point meet here.',
        'A third claim, connected to the first note.',
      ]);
      // A Literature note makes no Links of its own in this slice, so its outbound group is
      // empty while its inbound group is the payoff: what the user built from that reading.
      expect(card(first.body.note.id).connections.connectsTo).toEqual([]);
      expect(card(second.body.note.id).connections.connectedFrom).toHaveLength(1);
      expect(card(second.body.note.id).connections.connectsTo).toEqual([]);
    });

    it('gives a note with no Links two empty groups rather than no groups', async () => {
      const source = await aliceAgent
        .post('/api/sources')
        .send({ title: 'An unconnected reading', kind: 'article' });
      await aliceAgent
        .post(`/api/sources/${source.body.source.id}/notes`)
        .send({ body: 'Nothing has been built from this yet.', position: '3' });

      const res = await aliceAgent.get(`/api/sources/${source.body.source.id}`);

      expect(res.body.notes[0].connections).toEqual({ connectsTo: [], connectedFrom: [] });
    });
  });

  describe('GET /api/notes/:noteId/connections', () => {
    it('names a Literature note at the other end by its Source title, Locator and body', async () => {
      const source = await aliceAgent
        .post('/api/sources')
        .send({ title: 'How to Take Smart Notes', kind: 'book' });
      const note = await aliceAgent
        .post(`/api/sources/${source.body.source.id}/notes`)
        .send({ body: 'Writing is the thinking.', section: 'Ch. 3', position: '42' });
      const created = await aliceAgent
        .post('/api/notes/permanent')
        .send(validPayload(note.body.note.id));

      const res = await aliceAgent.get(`/api/notes/${created.body.note.id}/connections`);

      expect(res.status).toBe(200);
      expect(res.body.note).toEqual(expect.objectContaining({ kind: 'permanent' }));
      expect(res.body.connections.connectedFrom).toEqual([]);
      expect(res.body.connections.connectsTo).toHaveLength(1);
      const [connection] = res.body.connections.connectsTo;
      // The three things a row needs to name a note that has no title of its own: the Source
      // it was read from, the Locator within it, and the words the note opens with.
      expect(connection.sourceTitle).toBe('How to Take Smart Notes');
      expect(connection.other).toEqual(
        expect.objectContaining({
          kind: 'literature',
          section: 'Ch. 3',
          position: '42',
          body: 'Writing is the thinking.',
        }),
      );
      expect(connection.link.reason).toBe('This is the claim that note was circling.');
    });

    it('reads a Literature note\u2019s connections through the same endpoint', async () => {
      const noteId = await fileLiteratureNote(aliceAgent);
      const created = await aliceAgent.post('/api/notes/permanent').send(validPayload(noteId));

      const res = await aliceAgent.get(`/api/notes/${noteId}/connections`);

      expect(res.status).toBe(200);
      expect(res.body.note).toEqual(expect.objectContaining({ id: noteId, kind: 'literature' }));
      expect(res.body.connections.connectsTo).toEqual([]);
      expect(res.body.connections.connectedFrom).toHaveLength(1);
      expect(res.body.connections.connectedFrom[0].other.id).toBe(created.body.note.id);
      // A Permanent note has a title, so nothing rides along to name it.
      expect(res.body.connections.connectedFrom[0].sourceTitle).toBeNull();
    });

    it('answers 404 for another user\u2019s note rather than empty groups', async () => {
      const bobNoteId = await fileLiteratureNote(bobAgent);

      const res = await aliceAgent.get(`/api/notes/${bobNoteId}/connections`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Note not found');
    });

    it.each(['not-a-number', 'Infinity', '-1', '1.5', '9999'])(
      'answers 404 for the note id %s',
      async (noteId) => {
        const res = await aliceAgent.get(`/api/notes/${noteId}/connections`);

        expect(res.status).toBe(404);
      },
    );

    it('requires authentication', async () => {
      const res = await request(createApp()).get('/api/notes/1/connections');

      expect(res.status).toBe(401);
    });
  });

  describe('the links table', () => {
    const seedPair = async (): Promise<{ literatureId: number; permanentId: number }> => {
      const literatureId = await fileLiteratureNote(aliceAgent);
      const created = await aliceAgent
        .post('/api/notes/permanent')
        .send(validPayload(literatureId));
      return { literatureId, permanentId: created.body.note.id as number };
    };

    it('holds at most one Link per unordered pair, in either direction', async () => {
      const { literatureId, permanentId } = await seedPair();

      await expectRefusedBy(
        db.execute(sql`INSERT INTO links (origin_note_id, target_note_id, reason)
                       VALUES (${literatureId}, ${permanentId}, 'The same pair, reversed.')`),
        'links_unordered_pair_unique',
      );
    });

    it('forbids a note linking to itself', async () => {
      const { literatureId } = await seedPair();

      await expectRefusedBy(
        db.execute(sql`INSERT INTO links (origin_note_id, target_note_id, reason)
                       VALUES (${literatureId}, ${literatureId}, 'Itself.')`),
        'links_not_self',
      );
    });

    it('requires a reason and leaves the other end’s reason nullable', async () => {
      const { literatureId, permanentId } = await seedPair();

      await expect(
        db.execute(sql`INSERT INTO links (origin_note_id, target_note_id)
                       VALUES (${permanentId}, ${literatureId})`),
      ).rejects.toThrow();
      const [row] = (await db.execute(sql`SELECT target_reason FROM links`)).rows as Record<
        string,
        unknown
      >[];
      expect(row?.target_reason).toBeNull();
    });

    it('cascades a Link away with the note at either end', async () => {
      const { literatureId } = await seedPair();

      await db.execute(sql`DELETE FROM notes WHERE id = ${literatureId}`);

      const remaining = await db.execute(sql`SELECT id FROM links`);
      expect(remaining.rows).toHaveLength(0);
    });
  });

  describe("the notes table's per-kind CHECKs", () => {
    it('refuses a Permanent row with no title', async () => {
      await expectRefusedBy(
        db.execute(sql`INSERT INTO notes (user_id, kind, body)
                       VALUES (1, 'permanent', 'An untitled idea.')`),
        'notes_permanent_shape',
      );
    });

    it('refuses a Permanent row carrying a Source, an excerpt, a Locator or the flag', async () => {
      const source = await aliceAgent.post('/api/sources').send({ title: 'A book', kind: 'book' });
      const sourceId = source.body.source.id as number;

      const forbidden = [
        sql`INSERT INTO notes (user_id, kind, title, body, source_id)
            VALUES (1, 'permanent', 'A claim.', 'Body.', ${sourceId})`,
        sql`INSERT INTO notes (user_id, kind, title, body, excerpt)
            VALUES (1, 'permanent', 'A claim.', 'Body.', 'Their words.')`,
        sql`INSERT INTO notes (user_id, kind, title, body, section)
            VALUES (1, 'permanent', 'A claim.', 'Body.', 'Ch. 3')`,
        sql`INSERT INTO notes (user_id, kind, title, body, position)
            VALUES (1, 'permanent', 'A claim.', 'Body.', '42')`,
        sql`INSERT INTO notes (user_id, kind, title, body, open_question)
            VALUES (1, 'permanent', 'A claim.', 'Body.', true)`,
      ];
      for (const statement of forbidden) {
        // Sequential on purpose: each is expected to fail, and a failed statement in a shared
        // connection is cleaner read one at a time than as a race of rejections.
        // eslint-disable-next-line no-await-in-loop
        await expectRefusedBy(db.execute(statement), 'notes_permanent_shape');
      }
    });
  });
});
