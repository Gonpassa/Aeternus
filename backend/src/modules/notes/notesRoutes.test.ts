import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { LITERATURE_NOTE_BODY_MAX } from './validation';

describe('notes routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;
  let sourceId: number;
  let noteId: number;

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
    const source = await aliceAgent
      .post('/api/sources')
      .send({ title: 'How to Take Smart Notes', kind: 'book' });
    sourceId = source.body.source.id;
    const note = await aliceAgent.post(`/api/sources/${sourceId}/notes`).send({
      body: 'Reading is not understanding.',
      section: 'Ch. 3',
      position: '42',
      excerpt: "The author's exact words.",
    });
    noteId = note.body.note.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('PATCH /api/notes/:noteId', () => {
    it('corrects every field a note was written with', async () => {
      const res = await aliceAgent.patch(`/api/notes/${noteId}`).send({
        body: 'Reading is not yet understanding.',
        section: 'Ch. 4',
        position: '57',
        excerpt: 'Their words, corrected.',
        openQuestion: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.note).toEqual(
        expect.objectContaining({
          id: noteId,
          kind: 'literature',
          sourceId,
          body: 'Reading is not yet understanding.',
          section: 'Ch. 4',
          position: '57',
          excerpt: 'Their words, corrected.',
          openQuestion: true,
        }),
      );
    });

    // The flag the capture card sets while writing is the same flag a reader can set days
    // later, once they notice they never did follow the argument (#82 deferred this here).
    it('flags a filed note as an open question after the fact, and unflags it again', async () => {
      const flagged = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'Not sure I follow this.', position: '42', openQuestion: true });
      expect(flagged.body.note.openQuestion).toBe(true);

      const cleared = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'Now I follow it.', position: '42', openQuestion: false });
      expect(cleared.body.note.openQuestion).toBe(false);
    });

    it('stores nothing rather than an empty value when the excerpt is emptied', async () => {
      const res = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'My own words.', position: '42', excerpt: '   ' });

      expect(res.status).toBe(200);
      expect(res.body.note.excerpt).toBeNull();
    });

    it('drops the excerpt entirely when the field is omitted', async () => {
      const res = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'My own words.', position: '42' });

      expect(res.body.note.excerpt).toBeNull();
    });

    it('keeps the note on the Source it was written from', async () => {
      const other = await aliceAgent.post('/api/sources').send({ title: 'Another', kind: 'book' });

      await aliceAgent.patch(`/api/notes/${noteId}`).send({
        body: 'Still from the first book.',
        position: '42',
        sourceId: other.body.source.id,
        kind: 'permanent',
      });

      const res = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0]).toEqual(
        expect.objectContaining({
          sourceId,
          kind: 'literature',
          body: 'Still from the first book.',
        }),
      );
    });

    it('still refuses a note with both halves of the Locator empty', async () => {
      const res = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'A point.', section: '  ', position: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note needs a section or a position - either one will do.');
    });

    it('still refuses an empty body', async () => {
      const res = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: '   ', position: '42' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note needs a few words of your own.');
    });

    it('still names the ceiling when the body runs over it', async () => {
      const res = await aliceAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'a'.repeat(LITERATURE_NOTE_BODY_MAX + 1), position: '42' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A note is at most 4,000 characters.');
    });

    it("returns 404 for another user's note rather than editing it", async () => {
      const res = await bobAgent
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'Not mine to correct.', position: '42' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Note not found');
    });

    it.each(['not-a-number', 'Infinity', '-1', '1.5'])(
      'returns 404 for the note id %s',
      async (badId) => {
        const res = await aliceAgent
          .patch(`/api/notes/${badId}`)
          .send({ body: 'A point.', position: '42' });

        expect(res.status).toBe(404);
      },
    );

    it('returns 404 for a note that does not exist', async () => {
      const res = await aliceAgent
        .patch('/api/notes/999999')
        .send({ body: 'A point.', position: '42' });

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(createApp())
        .patch(`/api/notes/${noteId}`)
        .send({ body: 'A point.', position: '42' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/notes/:noteId', () => {
    it("deletes the note and takes it out of its Source's stream", async () => {
      const res = await aliceAgent.delete(`/api/notes/${noteId}`);

      expect(res.status).toBe(204);

      const reading = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(reading.body.notes).toEqual([]);
      expect(reading.body.sections).toEqual([]);
    });

    it('leaves the Source itself standing', async () => {
      await aliceAgent.delete(`/api/notes/${noteId}`);

      const reading = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(reading.status).toBe(200);
      expect(reading.body.source.title).toBe('How to Take Smart Notes');
    });

    it("leaves the Source's other notes alone", async () => {
      const kept = await aliceAgent
        .post(`/api/sources/${sourceId}/notes`)
        .send({ body: 'A second point.', position: '44' });

      await aliceAgent.delete(`/api/notes/${noteId}`);

      const reading = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(reading.body.notes.map((note: { id: number }) => note.id)).toEqual([
        kept.body.note.id,
      ]);
    });

    it("returns 404 for another user's note rather than deleting it", async () => {
      const res = await bobAgent.delete(`/api/notes/${noteId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Note not found');
    });

    it.each(['not-a-number', 'Infinity', '-1', '1.5'])(
      'returns 404 for the note id %s',
      async (badId) => {
        const res = await aliceAgent.delete(`/api/notes/${badId}`);
        expect(res.status).toBe(404);
      },
    );

    it('returns 404 for a note that does not exist', async () => {
      const res = await aliceAgent.delete('/api/notes/999999');
      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).delete(`/api/notes/${noteId}`);
      expect(res.status).toBe(401);
    });
  });
});
