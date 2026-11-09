import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { TOPIC_COUNT_MAX, TOPIC_NAME_MAX } from './validation';

describe('topic tagging routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration suites share this database and only truncate their own tables in
    // beforeEach, so start from a clean slate before seeding this file's fixtures.
    await db.execute(
      sql`TRUNCATE TABLE note_topics, source_topics, topics, links, notes, sources, users RESTART IDENTITY CASCADE`,
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
      sql`TRUNCATE TABLE note_topics, source_topics, topics, links, notes, sources RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const sourcePayload = {
    title: 'How to Take Smart Notes',
    kind: 'book',
    author: 'Sönke Ahrens',
    url: 'https://example.com/smart-notes',
  };

  const createSource = async (
    agent: ReturnType<typeof request.agent>,
    overrides: Record<string, unknown> = {},
  ) => {
    const res = await agent
      .post('/api/sources')
      .send({ ...sourcePayload, ...overrides })
      .expect(201);
    return res.body.source as { id: number; topics: { id: number; name: string }[] };
  };

  const fileNote = async (sourceId: number, overrides: Record<string, unknown> = {}) => {
    const res = await aliceAgent
      .post(`/api/sources/${sourceId}/notes`)
      .send({ body: 'A note of my own.', section: 'Ch. 1', ...overrides })
      .expect(201);
    return res.body.note as { id: number };
  };

  const topicNames = (topics: { name: string }[]) => topics.map((topic) => topic.name);

  describe('attaching Topics to a Source', () => {
    it('creates a Topic by name and returns it on the new Source', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Note-taking', 'Attention'] });

      expect(topicNames(source.topics)).toEqual(['Note-taking', 'Attention']);
    });

    it('files a Source with no Topics when none are given', async () => {
      const source = await createSource(aliceAgent);

      expect(source.topics).toEqual([]);
    });

    it('attaches the existing Topic when the name is typed in another casing', async () => {
      const first = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const second = await createSource(aliceAgent, {
        title: 'Deep Work',
        topicNames: ['attention'],
      });

      // The existing record, with the casing it was first typed in - casing never splits the
      // vocabulary, and the second Source did not add a second Topic.
      expect(second.topics[0]?.id).toBe(first.topics[0]?.id);
      expect(second.topics[0]?.name).toBe('Attention');

      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Attention']);
    });

    it('treats the same name twice in one payload as one Topic', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention', 'attention'] });

      expect(source.topics).toHaveLength(1);
    });

    it('reads the Source back with its Topics on the reading page payload', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Note-taking'] });

      const res = await aliceAgent.get(`/api/sources/${source.id}`).expect(200);

      expect(topicNames(res.body.source.topics)).toEqual(['Note-taking']);
    });

    it('lists each Source in the catalog with its own Topics', async () => {
      await createSource(aliceAgent, { topicNames: ['Note-taking'] });
      await createSource(aliceAgent, { title: 'Deep Work', topicNames: ['Attention'] });

      const res = await aliceAgent.get('/api/sources').expect(200);

      const byTitle = new Map<string, string[]>(
        res.body.sources.map((source: { title: string; topics: { name: string }[] }) => [
          source.title,
          topicNames(source.topics),
        ]),
      );
      expect(byTitle.get('How to Take Smart Notes')).toEqual(['Note-taking']);
      expect(byTitle.get('Deep Work')).toEqual(['Attention']);
    });
  });

  describe('correcting a Source’s Topics', () => {
    it('takes off the Topics left out of the payload and keeps them in the vocabulary', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Note-taking', 'Attention'] });

      const res = await aliceAgent
        .patch(`/api/sources/${source.id}`)
        .send({ ...sourcePayload, topicNames: ['Attention'] })
        .expect(200);

      expect(topicNames(res.body.source.topics)).toEqual(['Attention']);
      // The detached Topic is still a word the user chose, so it stays in the vocabulary with
      // one fewer carrier (CONTEXT.md, Topic).
      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Attention', 'Note-taking']);
    });

    it('takes off every Topic when the list is empty', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Note-taking'] });

      const res = await aliceAgent
        .patch(`/api/sources/${source.id}`)
        .send({ ...sourcePayload, topicNames: [] })
        .expect(200);

      expect(res.body.source.topics).toEqual([]);
    });

    it('keeps the Topics a corrected Source already carried', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Note-taking'] });

      const res = await aliceAgent
        .patch(`/api/sources/${source.id}`)
        .send({ ...sourcePayload, title: 'Smart Notes', topicNames: ['Note-taking'] })
        .expect(200);

      expect(res.body.source.topics[0]?.id).toBe(source.topics[0]?.id);
    });
  });

  describe('refusing a malformed Topic list', () => {
    it('refuses a Topic name that is not a string', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ ...sourcePayload, topicNames: [7] })
        .expect(400);

      expect(res.body.error).toBe('A Topic needs a name.');
    });

    it('refuses a Topic name past its ceiling', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({ ...sourcePayload, topicNames: ['t'.repeat(TOPIC_NAME_MAX + 1)] })
        .expect(400);

      expect(res.body.error).toBe(`A Topic name is at most ${TOPIC_NAME_MAX} characters.`);
    });

    it('refuses more Topics than a carrier can wear', async () => {
      const res = await aliceAgent
        .post('/api/sources')
        .send({
          ...sourcePayload,
          topicNames: Array.from({ length: TOPIC_COUNT_MAX + 1 }, (_value, i) => `Topic ${i}`),
        })
        .expect(400);

      expect(res.body.error).toBe(`A Topic list is at most ${TOPIC_COUNT_MAX} Topics.`);
    });
  });

  describe('the Topic vocabulary', () => {
    it('is one per user: another user’s Topics are not in it', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      await createSource(bobAgent, { topicNames: ['Woodwork'] });

      const alice = await aliceAgent.get('/api/topics').expect(200);
      const bob = await bobAgent.get('/api/topics').expect(200);

      expect(topicNames(alice.body.topics)).toEqual(['Attention']);
      expect(topicNames(bob.body.topics)).toEqual(['Woodwork']);
    });

    it('filters by a query, case-insensitively, for autocomplete', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention', 'Note-taking'] });

      const res = await aliceAgent.get('/api/topics?q=NOTE').expect(200);

      expect(topicNames(res.body.topics)).toEqual(['Note-taking']);
    });

    it('is refused to an unauthenticated caller', async () => {
      await request(createApp()).get('/api/topics').expect(401);
    });
  });

  describe('a Permanent note’s own Topics', () => {
    it('attaches them in the same request that writes the note', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(source.id);

      const res = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking, not its transcript.',
          body: 'The page is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where the idea started.' }],
          topicNames: ['Writing'],
        })
        .expect(201);

      expect(topicNames(res.body.note.topics)).toEqual(['Writing']);
    });

    it('writes the note with none when no Topic is given', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(source.id);

      const res = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'An idea can be filed under no word at all.',
          body: 'Topics are optional on every carrier.',
          links: [{ targetNoteId: note.id, reason: 'This reading prompted it.' }],
        })
        .expect(201);

      expect(res.body.note.topics).toEqual([]);
    });

    it('rolls the Topics back with the note when a Link target is unknown', async () => {
      const res = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'A note that cannot be written.',
          body: 'Its target is not a note of this user.',
          links: [{ targetNoteId: 9999, reason: 'Nothing is there.' }],
          topicNames: ['Orphaned'],
        })
        .expect(400);

      expect(res.body.error).toBe('That note could not be found to connect to.');
      // Nothing was written, the vocabulary included: the note, its Links and its Topics are
      // one transaction (ADR 0014).
      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(vocabulary.body.topics).toEqual([]);
    });

    it('is refused by the database when the carrier is a Literature note', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(source.id);
      const [topic] = (
        await db.execute(
          sql`INSERT INTO topics (user_id, name) VALUES (1, 'Attention') RETURNING id`,
        )
      ).rows as { id: number }[];

      // The composite foreign key into notes(id, kind) plus the CHECK pinning the kind is what
      // makes "only a Permanent note carries Topics" a constraint rather than a controller rule
      // (ADR 0012): a Literature note's id cannot be inserted here at all.
      await expect(
        db.execute(
          sql`INSERT INTO note_topics (topic_id, note_id, note_kind)
              VALUES (${topic?.id}, ${note.id}, 'literature')`,
        ),
      ).rejects.toThrow();
      await expect(
        db.execute(
          sql`INSERT INTO note_topics (topic_id, note_id, note_kind)
              VALUES (${topic?.id}, ${note.id}, 'permanent')`,
        ),
      ).rejects.toThrow();
    });
  });

  describe('GET /api/notes/:noteId/topic-notes', () => {
    // One Source carrying a Topic, one note filed against it, and a Permanent note carrying the
    // same Topic: the Literature note reaches the tier through what it inherits.
    const seedSharedTopic = async () => {
      const tagged = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const untagged = await createSource(aliceAgent, { title: 'Woodwork', topicNames: [] });
      const inheriting = await fileNote(tagged.id);
      const unrelated = await fileNote(untagged.id, { body: 'About something else.' });
      const permanent = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Attention is the scarce resource, not information.',
          body: 'What is scarce is what you can attend to.',
          links: [{ targetNoteId: inheriting.id, reason: 'This reading prompted it.' }],
          topicNames: ['Attention'],
        })
        .expect(201);
      return {
        inheriting,
        unrelated,
        permanentId: permanent.body.note.id as number,
      };
    };

    it('lists the notes sharing a Topic with a Literature note, through its Source', async () => {
      const { inheriting, unrelated, permanentId } = await seedSharedTopic();

      const res = await aliceAgent.get(`/api/notes/${inheriting.id}/topic-notes`).expect(200);

      const ids = res.body.notes.map((row: { note: { id: number } }) => row.note.id);
      expect(ids).toContain(permanentId);
      // The note the tier was read about is not offered as a note to link it to, and neither is
      // a note whose Source carries no Topic in common.
      expect(ids).not.toContain(inheriting.id);
      expect(ids).not.toContain(unrelated.id);
    });

    it('names the Topic that put each note in the tier', async () => {
      const { inheriting } = await seedSharedTopic();

      const res = await aliceAgent.get(`/api/notes/${inheriting.id}/topic-notes`).expect(200);

      expect(topicNames(res.body.notes[0].topics)).toEqual(['Attention']);
    });

    it('lists a Literature note with its Source title, so a row reads on its own', async () => {
      const { inheriting, permanentId } = await seedSharedTopic();

      const res = await aliceAgent.get(`/api/notes/${permanentId}/topic-notes`).expect(200);

      const row = res.body.notes.find(
        (candidate: { note: { id: number } }) => candidate.note.id === inheriting.id,
      );
      expect(row.sourceTitle).toBe('How to Take Smart Notes');
    });

    it('comes back empty for a note whose Topics nothing else shares', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const note = await fileNote(source.id);

      const res = await aliceAgent.get(`/api/notes/${note.id}/topic-notes`).expect(200);

      expect(res.body.notes).toEqual([]);
    });

    it('answers another user’s note as not found', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const note = await fileNote(source.id);

      const res = await bobAgent.get(`/api/notes/${note.id}/topic-notes`).expect(404);

      expect(res.body.error).toBe('Note not found');
    });
  });
});
