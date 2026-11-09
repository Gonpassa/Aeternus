import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';
import { notes, reviewAnswers } from '../../db/schema';
import { listReviewAnswersByNoteIds } from '../../db/reviewAnswers';

describe('review routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration suites share this database and only truncate their own tables in
    // beforeEach, so start from a clean slate before seeding this file's fixtures.
    await db.execute(
      sql`TRUNCATE TABLE review_answers, note_topics, source_topics, topics, links, notes, sources, users RESTART IDENTITY CASCADE`,
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
      sql`TRUNCATE TABLE review_answers, note_topics, source_topics, topics, links, notes, sources RESTART IDENTITY CASCADE`,
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
      .send({ title: 'How to Take Smart Notes', kind: 'book', ...overrides })
      .expect(201);
    return res.body.source as { id: number; topics: { name: string }[] };
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
    return res.body.note as { id: number; openQuestion: boolean };
  };

  const answer = async (body: Record<string, unknown>, expected = 201) => {
    const res = await aliceAgent.post('/api/review/answers').send(body).expect(expected);
    return res.body;
  };

  const queue = async (agent: ReturnType<typeof request.agent> = aliceAgent) => {
    const res = await agent.get('/api/review/queue').expect(200);
    return res.body as {
      notes: { note: { id: number }; sourceTitle: string; band: string }[];
      dueCount: number;
    };
  };

  const dueCount = async () => {
    const res = await aliceAgent.get('/api/review/due-count').expect(200);
    return (res.body as { dueCount: number }).dueCount;
  };

  describe('the queue', () => {
    it('hands back every Literature note, oldest first and flat across Sources, while none has been answered', async () => {
      const first = await createSource(aliceAgent, { title: 'Smart Notes' });
      const second = await createSource(aliceAgent, { title: 'Attention' });
      const oldest = await fileNote(aliceAgent, first.id);
      const middle = await fileNote(aliceAgent, second.id);
      const newest = await fileNote(aliceAgent, first.id);

      const body = await queue();

      expect(body.notes.map((row) => row.note.id)).toEqual([oldest.id, middle.id, newest.id]);
      expect(body.notes.map((row) => row.band)).toEqual([
        'never-answered',
        'never-answered',
        'never-answered',
      ]);
      expect(body.dueCount).toBe(3);
    });

    it('labels each note by its Source and carries the Topics it inherits from it', async () => {
      const source = await createSource(aliceAgent, {
        title: 'Smart Notes',
        topicNames: ['Note-taking'],
      });
      await fileNote(aliceAgent, source.id);

      const body = await queue();

      expect(body.notes[0]?.sourceTitle).toBe('Smart Notes');
      expect(body.notes[0]).toMatchObject({ inheritedTopics: [{ name: 'Note-taking' }] });
    });

    it('drops an answered note behind the notes that have never been answered', async () => {
      const source = await createSource(aliceAgent);
      const answered = await fileNote(aliceAgent, source.id);
      const due = await fileNote(aliceAgent, source.id);
      await answer({ noteId: answered.id, answer: 'nothing_here' });

      const body = await queue();

      expect(body.notes.map((row) => row.note.id)).toEqual([due.id, answered.id]);
      expect(body.notes.map((row) => row.band)).toEqual(['never-answered', 'answered']);
    });

    it('sorts an answered open question that yielded nothing ahead of the rest of the answered notes', async () => {
      const source = await createSource(aliceAgent);
      const plain = await fileNote(aliceAgent, source.id);
      const openQuestion = await fileNote(aliceAgent, source.id, { openQuestion: true });
      // `plain` is answered last, so least-recently-answered alone would put the open question
      // first in one band; the bands are what is being asserted, so it is answered second.
      await answer({ noteId: openQuestion.id, answer: 'nothing_here' });
      await answer({ noteId: plain.id, answer: 'nothing_here' });

      const body = await queue();

      expect(body.notes.map((row) => row.note.id)).toEqual([openQuestion.id, plain.id]);
      expect(body.notes.map((row) => row.band)).toEqual(['open-question', 'answered']);
    });

    it('leaves an open question in the last band once its most recent Answer produced something', async () => {
      const source = await createSource(aliceAgent);
      const openQuestion = await fileNote(aliceAgent, source.id, { openQuestion: true });
      const other = await fileNote(aliceAgent, source.id);
      await answer({ noteId: other.id, answer: 'nothing_here' });
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: openQuestion.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);
      await answer({
        noteId: openQuestion.id,
        answer: 'link_made',
        producedLinkId: link.body.link.id,
      });

      const body = await queue();

      expect(body.notes.map((row) => row.band)).toEqual(['answered', 'answered']);
    });

    it('sorts the answered bands least-recently-answered first', async () => {
      const source = await createSource(aliceAgent);
      const first = await fileNote(aliceAgent, source.id);
      const second = await fileNote(aliceAgent, source.id);
      await answer({ noteId: second.id, answer: 'nothing_here' });
      await answer({ noteId: first.id, answer: 'nothing_here' });

      const body = await queue();

      expect(body.notes.map((row) => row.note.id)).toEqual([second.id, first.id]);
    });

    it('reads a note by its most recent Answer rather than by its first', async () => {
      const source = await createSource(aliceAgent);
      const openQuestion = await fileNote(aliceAgent, source.id, { openQuestion: true });
      const other = await fileNote(aliceAgent, source.id);
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: openQuestion.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);
      await answer({
        noteId: openQuestion.id,
        answer: 'link_made',
        producedLinkId: link.body.link.id,
      });
      await answer({ noteId: openQuestion.id, answer: 'nothing_here' });

      const body = await queue();

      expect(body.notes.find((row) => row.note.id === openQuestion.id)?.band).toBe('open-question');
    });

    it('holds no Permanent note, since Review asks its question of a Literature note', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking.',
          body: 'Because the sentence is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where I read it.' }],
        })
        .expect(201);

      const body = await queue();

      expect(body.notes.map((row) => row.note.id)).toEqual([note.id]);
    });

    it("is one user's own notes", async () => {
      const mine = await createSource(aliceAgent);
      await fileNote(aliceAgent, mine.id);
      const theirs = await createSource(bobAgent);
      await fileNote(bobAgent, theirs.id);

      expect((await queue(bobAgent)).notes).toHaveLength(1);
      expect((await queue()).notes).toHaveLength(1);
    });

    it('turns away a request with no session', async () => {
      await request(createApp()).get('/api/review/queue').expect(401);
      await request(createApp()).get('/api/review/due-count').expect(401);
      await request(createApp()).post('/api/review/answers').send({}).expect(401);
    });
  });

  describe('the badge', () => {
    it('counts only the notes that have never been answered, and reaches zero', async () => {
      const source = await createSource(aliceAgent);
      const first = await fileNote(aliceAgent, source.id);
      const second = await fileNote(aliceAgent, source.id);

      expect(await dueCount()).toBe(2);

      await answer({ noteId: first.id, answer: 'nothing_here' });
      expect(await dueCount()).toBe(1);

      await answer({ noteId: second.id, answer: 'nothing_here' });
      expect(await dueCount()).toBe(0);
    });

    it('does not count an answered note again however many times it is answered', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      await answer({ noteId: note.id, answer: 'nothing_here' });
      await answer({ noteId: note.id, answer: 'nothing_here' });

      expect(await dueCount()).toBe(0);
    });

    it("agrees with the length of the queue's first band, which is where a pass ends", async () => {
      const source = await createSource(aliceAgent);
      const answered = await fileNote(aliceAgent, source.id);
      await fileNote(aliceAgent, source.id);
      await fileNote(aliceAgent, source.id);
      await answer({ noteId: answered.id, answer: 'nothing_here' });

      const body = await queue();

      expect(body.dueCount).toBe(2);
      expect(body.notes.filter((row) => row.band === 'never-answered')).toHaveLength(2);
    });
  });

  describe('recording an Answer', () => {
    it('records "nothing of mine here" with nothing produced', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);

      const body = await answer({ noteId: note.id, answer: 'nothing_here' });

      expect(body.reviewAnswer).toMatchObject({
        noteId: note.id,
        answer: 'nothing_here',
        producedLinkId: null,
        producedNoteId: null,
      });
    });

    it('records the Link a sitting produced', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const other = await fileNote(aliceAgent, source.id);
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: note.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);

      const body = await answer({
        noteId: note.id,
        answer: 'link_made',
        producedLinkId: link.body.link.id,
      });

      expect(body.reviewAnswer).toMatchObject({
        answer: 'link_made',
        producedLinkId: link.body.link.id,
        producedNoteId: null,
      });
    });

    it('records the Permanent note a sitting produced', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const written = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking.',
          body: 'Because the sentence is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where I read it.' }],
        })
        .expect(201);

      const body = await answer({
        noteId: note.id,
        answer: 'permanent_note_written',
        producedNoteId: written.body.note.id,
      });

      expect(body.reviewAnswer).toMatchObject({
        answer: 'permanent_note_written',
        producedLinkId: null,
        producedNoteId: written.body.note.id,
      });
    });

    it('appends rather than overwriting, so a note carries a history of Answers', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const other = await fileNote(aliceAgent, source.id);
      await answer({ noteId: note.id, answer: 'nothing_here' });
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: note.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);
      await answer({
        noteId: note.id,
        answer: 'link_made',
        producedLinkId: link.body.link.id,
      });

      const history = await listReviewAnswersByNoteIds({ noteIds: [note.id] });

      expect(history.map((row) => row.answer)).toEqual(['nothing_here', 'link_made']);
    });

    it('offers no way to rewrite or remove an Answer', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const body = await answer({ noteId: note.id, answer: 'nothing_here' });

      await aliceAgent
        .patch(`/api/review/answers/${body.reviewAnswer.id}`)
        .send({ answer: 'nothing_here' })
        .expect(404);
      await aliceAgent.delete(`/api/review/answers/${body.reviewAnswer.id}`).expect(404);

      expect(await listReviewAnswersByNoteIds({ noteIds: [note.id] })).toHaveLength(1);
    });

    it("refuses an Answer on a Permanent note's id", async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const written = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking.',
          body: 'Because the sentence is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where I read it.' }],
        })
        .expect(201);

      await answer({ noteId: written.body.note.id, answer: 'nothing_here' }, 404);
    });

    it("refuses an Answer on another user's note", async () => {
      const theirs = await createSource(bobAgent);
      const note = await fileNote(bobAgent, theirs.id);

      await answer({ noteId: note.id, answer: 'nothing_here' }, 404);
    });

    it("refuses an Answer naming another user's Link", async () => {
      const mine = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, mine.id);
      const theirs = await createSource(bobAgent);
      const first = await fileNote(bobAgent, theirs.id);
      const second = await fileNote(bobAgent, theirs.id);
      const link = await bobAgent
        .post('/api/links')
        .send({ originNoteId: first.id, targetNoteId: second.id, reason: 'Same point.' })
        .expect(201);

      const body = await answer(
        { noteId: note.id, answer: 'link_made', producedLinkId: link.body.link.id },
        400,
      );

      expect(body.error).toBe('That connection could not be found.');
      expect(await listReviewAnswersByNoteIds({ noteIds: [note.id] })).toHaveLength(0);
    });

    it('refuses an Answer that claims to have produced something that is not there', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);

      await answer({ noteId: note.id, answer: 'link_made', producedLinkId: 9999 }, 400);
      await answer(
        { noteId: note.id, answer: 'permanent_note_written', producedNoteId: 9999 },
        400,
      );
    });

    it('refuses an Answer whose produced reference is not the kind that Answer can produce', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const other = await fileNote(aliceAgent, source.id);
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: note.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);
      const written = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking.',
          body: 'Because the sentence is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where I read it.' }],
        })
        .expect(201);

      // Each Answer may name only what it could have produced, and "nothing of mine here" may
      // name nothing at all.
      await answer(
        { noteId: note.id, answer: 'link_made', producedNoteId: written.body.note.id },
        400,
      );
      await answer(
        {
          noteId: note.id,
          answer: 'permanent_note_written',
          producedLinkId: link.body.link.id,
        },
        400,
      );
      await answer(
        { noteId: note.id, answer: 'nothing_here', producedLinkId: link.body.link.id },
        400,
      );
      await answer({ noteId: note.id, answer: 'link_made' }, 400);
      await answer({ noteId: note.id, answer: 'permanent_note_written' }, 400);
    });

    it('refuses an Answer that is not one of the three', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);

      await answer({ noteId: note.id, answer: 'come_back_sooner' }, 400);
      await answer({ noteId: note.id }, 400);
      await answer({ answer: 'nothing_here' }, 400);
    });
  });

  describe('what an Answer produced, once that is deleted', () => {
    it('keeps the Answer and nulls out the Link it named', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const other = await fileNote(aliceAgent, source.id);
      const link = await aliceAgent
        .post('/api/links')
        .send({ originNoteId: note.id, targetNoteId: other.id, reason: 'Same point.' })
        .expect(201);
      await answer({
        noteId: note.id,
        answer: 'link_made',
        producedLinkId: link.body.link.id,
      });

      await aliceAgent.delete(`/api/links/${link.body.link.id}`).expect(204);

      const history = await listReviewAnswersByNoteIds({ noteIds: [note.id] });
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ answer: 'link_made', producedLinkId: null });
    });

    it('keeps the Answer and nulls out the Permanent note it named', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      const written = await aliceAgent
        .post('/api/notes/permanent')
        .send({
          title: 'Writing is thinking.',
          body: 'Because the sentence is where the thought is finished.',
          links: [{ targetNoteId: note.id, reason: 'This is where I read it.' }],
        })
        .expect(201);
      await answer({
        noteId: note.id,
        answer: 'permanent_note_written',
        producedNoteId: written.body.note.id,
      });

      // Deleting a Permanent note has no endpoint yet - the orphan guard that would front one
      // is #86 - so the deletion is made directly against the table the constraint is on.
      await db.delete(notes).where(eq(notes.id, written.body.note.id));

      const history = await listReviewAnswersByNoteIds({ noteIds: [note.id] });
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        answer: 'permanent_note_written',
        producedNoteId: null,
      });
    });

    it("takes a note's own Answers with it when the note itself is deleted", async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id);
      await answer({ noteId: note.id, answer: 'nothing_here' });

      await aliceAgent.delete(`/api/notes/${note.id}`).expect(204);

      expect(await db.select().from(reviewAnswers)).toHaveLength(0);
    });
  });

  describe('the open-question flag', () => {
    it('is cleared through the note itself, without recording an Answer', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id, { openQuestion: true });

      const res = await aliceAgent
        .patch(`/api/notes/${note.id}`)
        .send({
          body: 'A note of my own.',
          section: 'Ch. 1',
          position: null,
          excerpt: null,
          openQuestion: false,
        })
        .expect(200);

      expect(res.body.note.openQuestion).toBe(false);
      expect(await listReviewAnswersByNoteIds({ noteIds: [note.id] })).toHaveLength(0);
      expect(await dueCount()).toBe(1);
    });

    it('is left alone by answering, since no Answer resolves it', async () => {
      const source = await createSource(aliceAgent);
      const note = await fileNote(aliceAgent, source.id, { openQuestion: true });

      await answer({ noteId: note.id, answer: 'nothing_here' });

      const body = await queue();
      expect(body.notes[0]).toMatchObject({ note: { openQuestion: true } });
    });
  });
});
