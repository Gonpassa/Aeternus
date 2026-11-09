import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { TOPIC_NAME_MAX } from './validation';

// The Topic as a place, and the vocabulary maintenance that lives there: the index with its
// carrier counts, the view that collects a Topic's carriers, renaming - which is also how two
// Topics are merged - and deleting (#88, CONTEXT.md, Topic).
describe('topic browsing and vocabulary maintenance (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

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

  const createSource = async (
    agent: ReturnType<typeof request.agent>,
    overrides: Record<string, unknown> = {},
  ) => {
    const res = await agent
      .post('/api/sources')
      .send({
        title: 'How to Take Smart Notes',
        kind: 'book',
        author: 'Sönke Ahrens',
        ...overrides,
      })
      .expect(201);
    return res.body.source as { id: number; title: string; topics: { id: number; name: string }[] };
  };

  const fileNote = async (
    agent: ReturnType<typeof request.agent>,
    sourceId: number,
    overrides: Record<string, unknown> = {},
  ) => {
    const res = await agent
      .post(`/api/sources/${sourceId}/notes`)
      .send({ body: 'A note of my own.', section: 'Ch. 1', ...overrides })
      .expect(201);
    return res.body.note as { id: number };
  };

  const writePermanentNote = async (
    agent: ReturnType<typeof request.agent>,
    overrides: Record<string, unknown>,
  ) => {
    const res = await agent
      .post('/api/notes/permanent')
      .send({
        title: 'Writing is thinking, not its transcript.',
        body: 'The page is where the thought is finished.',
        ...overrides,
      })
      .expect(201);
    return res.body.note as { id: number; topics: { id: number; name: string }[] };
  };

  const topicNames = (topics: { name: string }[]) => topics.map((topic) => topic.name);

  const topicByName = async (
    agent: ReturnType<typeof request.agent>,
    name: string,
  ): Promise<{ id: number; name: string; permanentNoteCount: number; sourceCount: number }> => {
    const res = await agent.get('/api/topics').expect(200);
    const found = res.body.topics.find(
      (topic: { name: string }) => topic.name.toLowerCase() === name.toLowerCase(),
    );
    expect(found).toBeDefined();
    return found;
  };

  describe('the Topic index', () => {
    it('lists every Topic with how many carriers of each kind wear it', async () => {
      const tagged = await createSource(aliceAgent, { topicNames: ['Attention'] });
      await createSource(aliceAgent, { title: 'Deep Work', topicNames: ['Attention'] });
      const seed = await fileNote(aliceAgent, tagged.id);
      await writePermanentNote(aliceAgent, {
        links: [{ targetNoteId: seed.id, reason: 'This reading prompted it.' }],
        topicNames: ['Attention'],
      });

      const attention = await topicByName(aliceAgent, 'Attention');

      expect(attention.sourceCount).toBe(2);
      expect(attention.permanentNoteCount).toBe(1);
    });

    it('keeps a Topic nobody carries in the vocabulary, with a count of zero', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      await aliceAgent
        .patch(`/api/sources/${source.id}`)
        .send({ title: source.title, kind: 'book', topicNames: [] })
        .expect(200);

      const attention = await topicByName(aliceAgent, 'Attention');

      expect(attention.sourceCount).toBe(0);
      expect(attention.permanentNoteCount).toBe(0);
    });
  });

  describe('the Topic view', () => {
    // One Topic on two Sources and two Permanent notes, the second of them more linked than
    // the first, plus a Literature note inheriting the Topic through its Source.
    const seedTopic = async () => {
      const tagged = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const untagged = await createSource(aliceAgent, { title: 'Woodwork' });
      const inheriting = await fileNote(aliceAgent, tagged.id);
      const other = await fileNote(aliceAgent, untagged.id, { body: 'About something else.' });
      const lessLinked = await writePermanentNote(aliceAgent, {
        title: 'Attention is the scarce resource, not information.',
        links: [{ targetNoteId: inheriting.id, reason: 'This reading prompted it.' }],
        topicNames: ['Attention'],
      });
      const moreLinked = await writePermanentNote(aliceAgent, {
        title: 'What you attend to is what you end up thinking with.',
        links: [
          { targetNoteId: inheriting.id, reason: 'The same passage.' },
          { targetNoteId: other.id, reason: 'A second reading of it.' },
          { targetNoteId: lessLinked.id, reason: 'The claim this one sharpens.' },
        ],
        topicNames: ['Attention'],
      });
      return { tagged, untagged, inheriting, lessLinked, moreLinked };
    };

    it('collects the Permanent notes carrying the Topic, most-linked first', async () => {
      const { lessLinked, moreLinked } = await seedTopic();
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent.get(`/api/topics/${attention.id}`).expect(200);

      expect(res.body.permanentNotes.map((note: { id: number }) => note.id)).toEqual([
        moreLinked.id,
        lessLinked.id,
      ]);
      // Links at either end count the same: the less-linked note is linked to only by the
      // other one, and that inbound Link still counts (ADR 0013).
      expect(res.body.permanentNotes[0].linkCount).toBe(3);
      expect(res.body.permanentNotes[1].linkCount).toBe(2);
    });

    it('then lists the Sources carrying the Topic, and no individual Literature notes', async () => {
      const { tagged, untagged } = await seedTopic();
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent.get(`/api/topics/${attention.id}`).expect(200);

      expect(res.body.sources.map((source: { id: number }) => source.id)).toEqual([tagged.id]);
      expect(res.body.sources.map((source: { id: number }) => source.id)).not.toContain(
        untagged.id,
      );
      // A Literature note inherits its Source's Topics rather than carrying them, and stays
      // reachable through that Source (CONTEXT.md, Topic view).
      expect(
        res.body.permanentNotes.every((note: { kind: string }) => note.kind === 'permanent'),
      ).toBe(true);
    });

    it('answers a Topic nobody carries with empty groups rather than not found', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');
      await aliceAgent.delete(`/api/sources/1`).expect(204);

      const res = await aliceAgent.get(`/api/topics/${attention.id}`).expect(200);

      expect(res.body.topic.name).toBe('Attention');
      expect(res.body.permanentNotes).toEqual([]);
      expect(res.body.sources).toEqual([]);
    });

    // The ceiling is measured against the name as it will be stored, so surrounding whitespace
    // on a name that fits is not what makes it too long.
    it('accepts a name that fits once its whitespace is collapsed', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: `  ${'t'.repeat(TOPIC_NAME_MAX)}  ` })
        .expect(200);

      expect(res.body.topic.name).toBe('t'.repeat(TOPIC_NAME_MAX));
    });

    it('answers another user’s Topic as not found', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await bobAgent.get(`/api/topics/${attention.id}`).expect(404);

      expect(res.body.error).toBe('Topic not found');
    });

    it('answers an id that is not a number as not found', async () => {
      const res = await aliceAgent.get('/api/topics/nonsense').expect(404);

      expect(res.body.error).toBe('Topic not found');
    });

    it('is refused to an unauthenticated caller', async () => {
      await request(createApp()).get('/api/topics/1').expect(401);
    });
  });

  describe('renaming a Topic', () => {
    it('changes it on every carrier at once', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const seed = await fileNote(aliceAgent, source.id);
      const permanent = await writePermanentNote(aliceAgent, {
        links: [{ targetNoteId: seed.id, reason: 'This reading prompted it.' }],
        topicNames: ['Attention'],
      });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Focus' })
        .expect(200);

      expect(res.body.merged).toBe(false);
      expect(res.body.topic.name).toBe('Focus');
      // The same Topic record under a new word, so both carriers now read "Focus" without
      // anything having been reattached.
      const reread = await aliceAgent.get(`/api/sources/${source.id}`).expect(200);
      expect(topicNames(reread.body.source.topics)).toEqual(['Focus']);
      const note = await aliceAgent.get(`/api/topics/${attention.id}`).expect(200);
      expect(note.body.permanentNotes.map((row: { id: number }) => row.id)).toEqual([permanent.id]);
    });

    it('collapses the whitespace in the new name', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: '  Deep   work ' })
        .expect(200);

      expect(res.body.topic.name).toBe('Deep work');
    });

    it('recases a Topic without merging it into itself', async () => {
      await createSource(aliceAgent, { topicNames: ['attention'] });
      const attention = await topicByName(aliceAgent, 'attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Attention' })
        .expect(200);

      expect(res.body.merged).toBe(false);
      expect(res.body.topic.id).toBe(attention.id);
      expect(res.body.topic.name).toBe('Attention');
    });

    it('merges the two when the new name already belongs to another Topic', async () => {
      const first = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const second = await createSource(aliceAgent, { title: 'Deep Work', topicNames: ['Focus'] });
      const attention = await topicByName(aliceAgent, 'Attention');
      const focus = await topicByName(aliceAgent, 'Focus');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'focus', merge: true })
        .expect(200);

      // The Topic that already had the name survives, now wearing both carriers, and the
      // folded-away word leaves the vocabulary - there is no separate merge (CONTEXT.md, Topic).
      expect(res.body.merged).toBe(true);
      expect(res.body.topic.id).toBe(focus.id);
      expect(res.body.topic.sourceCount).toBe(2);
      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Focus']);
      const reread = await aliceAgent.get(`/api/sources/${first.id}`).expect(200);
      expect(topicNames(reread.body.source.topics)).toEqual(['Focus']);
      const kept = await aliceAgent.get(`/api/sources/${second.id}`).expect(200);
      expect(topicNames(kept.body.source.topics)).toEqual(['Focus']);
    });

    it('leaves a carrier wearing both Topics wearing the survivor once', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention', 'Focus'] });
      const attention = await topicByName(aliceAgent, 'Attention');
      const focus = await topicByName(aliceAgent, 'Focus');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Focus', merge: true })
        .expect(200);

      expect(res.body.merged).toBe(true);
      expect(res.body.topic.sourceCount).toBe(1);
      const reread = await aliceAgent.get(`/api/sources/${source.id}`).expect(200);
      expect(topicNames(reread.body.source.topics)).toEqual(['Focus']);
      expect(reread.body.source.topics[0].id).toBe(focus.id);
    });

    it('merges a Permanent note’s Topics as well as a Source’s', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      const seed = await fileNote(aliceAgent, source.id);
      await writePermanentNote(aliceAgent, {
        links: [{ targetNoteId: seed.id, reason: 'This reading prompted it.' }],
        topicNames: ['Attention', 'Focus'],
      });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Focus', merge: true })
        .expect(200);

      expect(res.body.merged).toBe(true);
      expect(res.body.topic.permanentNoteCount).toBe(1);
      // The Source that carried the folded-away word now carries the survivor too: a merge
      // moves every carrier of either kind.
      expect(res.body.topic.sourceCount).toBe(1);
    });

    it('does not merge across users', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      await createSource(bobAgent, { title: 'Deep Work', topicNames: ['Focus'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Focus' })
        .expect(200);

      // Bob's "Focus" is not in Alice's vocabulary, so this is a plain rename and Bob's Topic
      // is untouched.
      expect(res.body.merged).toBe(false);
      const bobsVocabulary = await bobAgent.get('/api/topics').expect(200);
      expect(topicNames(bobsVocabulary.body.topics)).toEqual(['Focus']);
    });

    // The merge takes one of the two Topics out of the vocabulary, so it happens only on a
    // request that agreed to it: without `merge` the server answers with the Topic the name
    // already belongs to and changes nothing, which is what makes the client's confirmation
    // enforceable rather than advisory (#88).
    it('refuses an unconfirmed merge and names the Topic the name belongs to', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      await createSource(aliceAgent, { title: 'Deep Work', topicNames: ['Focus'] });
      const attention = await topicByName(aliceAgent, 'Attention');
      const focus = await topicByName(aliceAgent, 'Focus');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'focus' })
        .expect(409);

      expect(res.body.mergeTarget.id).toBe(focus.id);
      expect(res.body.mergeTarget.name).toBe('Focus');
      expect(res.body.mergeTarget.sourceCount).toBe(1);
      // Nothing moved: both words are still in the vocabulary, on the carriers they had.
      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Attention', 'Focus']);
      const reread = await aliceAgent.get(`/api/sources/${source.id}`).expect(200);
      expect(topicNames(reread.body.source.topics)).toEqual(['Attention']);
    });

    // `merge` is about the collision, not about every rename: a plain rename carrying it is
    // still a plain rename.
    it('renames in place when merge is asked for but nothing collides', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 'Focus', merge: true })
        .expect(200);

      expect(res.body.merged).toBe(false);
      expect(res.body.topic.id).toBe(attention.id);
    });

    it('refuses a blank name', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: '   ' })
        .expect(400);

      expect(res.body.error).toBe('A Topic needs a name.');
    });

    it('refuses a name past its ceiling', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      const res = await aliceAgent
        .patch(`/api/topics/${attention.id}`)
        .send({ name: 't'.repeat(TOPIC_NAME_MAX + 1) })
        .expect(400);

      expect(res.body.error).toBe(`A Topic name is at most ${TOPIC_NAME_MAX} characters.`);
    });

    it('answers another user’s Topic as not found', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      await bobAgent.patch(`/api/topics/${attention.id}`).send({ name: 'Focus' }).expect(404);

      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Attention']);
    });
  });

  describe('deleting a Topic', () => {
    it('detaches it from every carrier and deletes no note', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention', 'Focus'] });
      const seed = await fileNote(aliceAgent, source.id);
      const permanent = await writePermanentNote(aliceAgent, {
        links: [{ targetNoteId: seed.id, reason: 'This reading prompted it.' }],
        topicNames: ['Attention'],
      });
      const attention = await topicByName(aliceAgent, 'Attention');

      await aliceAgent.delete(`/api/topics/${attention.id}`).expect(204);

      // The word is gone from the vocabulary, the carriers keep everything else they wear,
      // and both notes are still there (CONTEXT.md, Topic).
      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Focus']);
      const reread = await aliceAgent.get(`/api/sources/${source.id}`).expect(200);
      expect(topicNames(reread.body.source.topics)).toEqual(['Focus']);
      expect(reread.body.notes.map((note: { id: number }) => note.id)).toEqual([seed.id]);
      const note = await aliceAgent.get(`/api/notes/${permanent.id}/connections`).expect(200);
      expect(note.body.note.id).toBe(permanent.id);
    });

    it('deletes a Topic nobody carries', async () => {
      const source = await createSource(aliceAgent, { topicNames: ['Attention'] });
      await aliceAgent
        .patch(`/api/sources/${source.id}`)
        .send({ title: source.title, kind: 'book', topicNames: [] })
        .expect(200);
      const attention = await topicByName(aliceAgent, 'Attention');

      await aliceAgent.delete(`/api/topics/${attention.id}`).expect(204);

      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(vocabulary.body.topics).toEqual([]);
    });

    it('answers another user’s Topic as not found', async () => {
      await createSource(aliceAgent, { topicNames: ['Attention'] });
      const attention = await topicByName(aliceAgent, 'Attention');

      await bobAgent.delete(`/api/topics/${attention.id}`).expect(404);

      const vocabulary = await aliceAgent.get('/api/topics').expect(200);
      expect(topicNames(vocabulary.body.topics)).toEqual(['Attention']);
    });

    it('is refused to an unauthenticated caller', async () => {
      await request(createApp()).delete('/api/topics/1').expect(401);
    });
  });
});
