import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';

// The mandatory-Link guard of ADR 0014 at the two deletion points, which is one guard asked
// about different sets of Links (#86). Read as its own suite because the question spans both
// delete paths: a Literature note, a Permanent note and a Source all run it, and what they
// share is the refusal rather than the endpoint.
describe('deletion orphan guard (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    await db.execute(sql`TRUNCATE TABLE links, notes, sources, users RESTART IDENTITY CASCADE`);

    await createUser('alice', 'alice@example.com', 'secret123');

    aliceAgent = request.agent(createApp());
    await aliceAgent.post('/api/auth/login').send({ username: 'alice', password: 'secret123' });
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE links, notes, sources RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const fileSource = async (title = 'How to Take Smart Notes'): Promise<number> => {
    const source = await aliceAgent.post('/api/sources').send({ title, kind: 'book' });
    return source.body.source.id as number;
  };

  const fileLiteratureNote = async (sourceId: number, position = '42'): Promise<number> => {
    const note = await aliceAgent
      .post(`/api/sources/${sourceId}/notes`)
      .send({ body: 'Reading is not understanding.', section: 'Ch. 3', position });
    return note.body.note.id as number;
  };

  // A Permanent note arrives with its first Link, because there is no moment at which an
  // unlinked one may exist (ADR 0014) - so every fixture here is a note plus the note it was
  // written from.
  const writePermanentNote = async (
    targetNoteId: number,
    title = 'Writing is how an idea is tested, not how it is stored.',
  ): Promise<number> => {
    const note = await aliceAgent.post('/api/notes/permanent').send({
      title,
      body: 'An idea that cannot be written down has not been had yet.',
      links: [{ targetNoteId, reason: 'This is the claim that note was circling.' }],
    });
    return note.body.note.id as number;
  };

  const linkNotes = async (originNoteId: number, targetNoteId: number): Promise<number> => {
    const link = await aliceAgent
      .post('/api/links')
      .send({ originNoteId, targetNoteId, reason: 'These two are the same thought twice.' });
    return link.body.link.id as number;
  };

  const connectionCount = async (noteId: number): Promise<number> => {
    const res = await aliceAgent.get(`/api/notes/${noteId}/connections`);
    return res.body.connections.connectsTo.length + res.body.connections.connectedFrom.length;
  };

  describe('DELETE /api/notes/:noteId', () => {
    it("refuses to delete a Literature note that is a Permanent note's only Link", async () => {
      const sourceId = await fileSource();
      const literatureId = await fileLiteratureNote(sourceId);
      const permanentId = await writePermanentNote(literatureId, 'An idea worth keeping.');

      const res = await aliceAgent.delete(`/api/notes/${literatureId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        'Deleting this note would leave “An idea worth keeping.” with none. Connect it elsewhere first, or delete it.',
      );
      // Refused means nothing happened: the note is still filed and the Link is still there.
      expect(await connectionCount(permanentId)).toBe(1);
      const reading = await aliceAgent.get(`/api/sources/${sourceId}`);
      expect(reading.body.notes.map((note: { id: number }) => note.id)).toEqual([literatureId]);
    });

    // The count is taken in either direction, so a Permanent note held only by an inbound Link
    // is linked - and deleting the note at that Link's other end is the refusal (ADR 0014).
    it('counts an inbound Link, and refuses the deletion that would take the last one', async () => {
      const sourceId = await fileSource();
      const firstId = await fileLiteratureNote(sourceId, '42');
      const secondId = await fileLiteratureNote(sourceId, '57');
      const permanentId = await writePermanentNote(firstId, 'An idea worth keeping.');
      await linkNotes(secondId, permanentId);
      // The outbound Link goes first, leaving the Permanent note holding only the inbound one.
      const outbound = await aliceAgent.get(`/api/notes/${permanentId}/connections`);
      await aliceAgent.delete(`/api/links/${outbound.body.connections.connectsTo[0].link.id}`);

      const res = await aliceAgent.delete(`/api/notes/${secondId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('“An idea worth keeping.”');
      expect(await connectionCount(permanentId)).toBe(1);
    });

    it('deletes a Literature note that is not the last Link, and the Link goes with it', async () => {
      const sourceId = await fileSource();
      const firstId = await fileLiteratureNote(sourceId, '42');
      const secondId = await fileLiteratureNote(sourceId, '57');
      const permanentId = await writePermanentNote(firstId, 'An idea worth keeping.');
      await linkNotes(secondId, permanentId);

      const res = await aliceAgent.delete(`/api/notes/${secondId}`);

      expect(res.status).toBe(204);
      expect(await connectionCount(permanentId)).toBe(1);
    });

    it("refuses to delete a Permanent note that is another Permanent note's only Link", async () => {
      const sourceId = await fileSource();
      const literatureId = await fileLiteratureNote(sourceId);
      const firstId = await writePermanentNote(literatureId, 'The first idea.');
      const secondId = await writePermanentNote(firstId, 'The second idea.');

      const res = await aliceAgent.delete(`/api/notes/${firstId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        'Deleting this note would leave “The second idea.” with none. Connect it elsewhere first, or delete it.',
      );
      expect(await connectionCount(secondId)).toBe(1);
    });

    // A Permanent note going away cannot be orphaned by its own deletion, so a note whose only
    // Link is to a Literature note that stays put is deleted as any other note is.
    it('deletes a Permanent note that orphans nothing, and its Links go with it', async () => {
      const sourceId = await fileSource();
      const literatureId = await fileLiteratureNote(sourceId);
      const permanentId = await writePermanentNote(literatureId);

      const res = await aliceAgent.delete(`/api/notes/${permanentId}`);

      expect(res.status).toBe(204);
      expect(await aliceAgent.get(`/api/notes/${permanentId}/connections`)).toMatchObject({
        status: 404,
      });
      expect(await connectionCount(literatureId)).toBe(0);
    });
  });

  describe('DELETE /api/sources/:sourceId', () => {
    it('refuses to delete a Source whose notes would orphan an idea', async () => {
      const sourceId = await fileSource();
      const literatureId = await fileLiteratureNote(sourceId);
      const permanentId = await writePermanentNote(literatureId, 'An idea worth keeping.');

      const res = await aliceAgent.delete(`/api/sources/${sourceId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        'Deleting this Source would leave “An idea worth keeping.” with none. Connect it elsewhere first, or delete it.',
      );
      const catalog = await aliceAgent.get('/api/sources');
      expect(catalog.body.sources.map((source: { id: number }) => source.id)).toEqual([sourceId]);
      expect(await connectionCount(permanentId)).toBe(1);
    });

    // The guard is asked once across the batch, so the refusal names every idea the cascade
    // would have unlinked rather than the first one it met (ADR 0014).
    it('names every affected note across the batch rather than failing on the first', async () => {
      const sourceId = await fileSource();
      const firstId = await fileLiteratureNote(sourceId, '42');
      const secondId = await fileLiteratureNote(sourceId, '57');
      await writePermanentNote(firstId, 'The first idea.');
      await writePermanentNote(secondId, 'The second idea.');

      const res = await aliceAgent.delete(`/api/sources/${sourceId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        'Deleting this Source would leave these notes with none: “The first idea.”, “The second idea.”. Connect them elsewhere first, or delete them.',
      );
    });

    // An idea connected elsewhere survives the reading it came from, which is the whole point
    // of counting rather than refusing on any Link at all.
    it('deletes a Source whose notes orphan nothing, and cascades as before', async () => {
      const keptSourceId = await fileSource('Zettelkasten');
      const keptNoteId = await fileLiteratureNote(keptSourceId, '7');
      const sourceId = await fileSource();
      const literatureId = await fileLiteratureNote(sourceId);
      const permanentId = await writePermanentNote(literatureId, 'An idea worth keeping.');
      await linkNotes(keptNoteId, permanentId);

      const res = await aliceAgent.delete(`/api/sources/${sourceId}`);

      expect(res.status).toBe(204);
      expect(await aliceAgent.get(`/api/sources/${sourceId}`)).toMatchObject({ status: 404 });
      // The Literature note cascaded away with its Source, and its Link went with it - the
      // Permanent note is left holding the one that was connected elsewhere.
      expect(await connectionCount(permanentId)).toBe(1);
      expect(await aliceAgent.get(`/api/notes/${literatureId}/connections`)).toMatchObject({
        status: 404,
      });
    });

    it('deletes a Source with no notes at all', async () => {
      const sourceId = await fileSource();

      const res = await aliceAgent.delete(`/api/sources/${sourceId}`);

      expect(res.status).toBe(204);
    });
  });
});
