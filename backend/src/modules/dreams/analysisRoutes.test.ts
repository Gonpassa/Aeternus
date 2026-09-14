import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createSymbolAttachment } from '../../db/symbolAttachments';
import { isUniqueViolation } from '../../db/errors';
import { createApp } from '../../app';

describe('dream analysis routes (integration)', () => {
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await runMigrations();

    // Other integration test files share this database and may leave residual
    // rows (e.g. a lingering 'alice' user) since they only truncate in their own
    // beforeEach. Start from a clean slate before seeding this file's fixtures.
    await db.execute(
      sql`TRUNCATE TABLE dreams, anchors, emotional_beats, symbols, symbol_attachments, associations, analysis_passes, users RESTART IDENTITY CASCADE`,
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
      sql`TRUNCATE TABLE dreams, anchors, emotional_beats, symbols, symbol_attachments, associations, analysis_passes RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const validPayload = {
    date: '2026-08-01',
    narrative: '<p>I was flying over a city made of glass.</p>',
  };

  const createDreamWithAnchor = async (agent: ReturnType<typeof request.agent>) => {
    const dreamRes = await agent.post('/api/dreams').send(validPayload);
    const dreamId: number = dreamRes.body.dream.id;
    const anchorRes = await agent.post(`/api/dreams/${dreamId}/anchors`).send({});
    const anchorId: number = anchorRes.body.anchor.id;
    return { dreamId, anchorId };
  };

  describe('POST /api/anchors/:anchorId/symbols', () => {
    it('tags the anchor with a new symbol, preserving the typed casing', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent.post(`/api/anchors/${anchorId}/symbols`).send({ name: 'Water' });
      expect(res.status).toBe(201);
      expect(res.body.symbolAttachment).toEqual(
        expect.objectContaining({ anchorId, symbolName: 'Water' }),
      );
    });

    it('resolves a case-insensitive match to the existing symbol, keeping its first-typed casing', async () => {
      const first = await createDreamWithAnchor(aliceAgent);
      const second = await createDreamWithAnchor(aliceAgent);
      const firstRes = await aliceAgent
        .post(`/api/anchors/${first.anchorId}/symbols`)
        .send({ name: 'Water' });
      const secondRes = await aliceAgent
        .post(`/api/anchors/${second.anchorId}/symbols`)
        .send({ name: 'water' });

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.symbolAttachment.symbolId).toBe(
        firstRes.body.symbolAttachment.symbolId,
      );
      expect(secondRes.body.symbolAttachment.symbolName).toBe('Water');
    });

    it("does not resolve to another user's symbol of the same name", async () => {
      const aliceSetup = await createDreamWithAnchor(aliceAgent);
      const bobSetup = await createDreamWithAnchor(bobAgent);
      const aliceRes = await aliceAgent
        .post(`/api/anchors/${aliceSetup.anchorId}/symbols`)
        .send({ name: 'Water' });
      const bobRes = await bobAgent
        .post(`/api/anchors/${bobSetup.anchorId}/symbols`)
        .send({ name: 'water' });

      expect(bobRes.status).toBe(201);
      expect(bobRes.body.symbolAttachment.symbolId).not.toBe(
        aliceRes.body.symbolAttachment.symbolId,
      );
      expect(bobRes.body.symbolAttachment.symbolName).toBe('water');
    });

    it('returns 400 for a blank name', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent.post(`/api/anchors/${anchorId}/symbols`).send({ name: '   ' });
      expect(res.status).toBe(400);
    });

    it('returns the existing tag instead of duplicating when the symbol is tagged again', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const first = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: first.body.symbolAttachment.id });

      const again = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'water' });

      expect(again.status).toBe(200);
      expect(again.body.symbolAttachment.id).toBe(first.body.symbolAttachment.id);
      expect(again.body.symbolAttachment.associations).toEqual([
        expect.objectContaining({ content: 'depth' }),
      ]);

      const detail = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(detail.body.anchors[0].symbolAttachments).toHaveLength(1);
    });

    it('recognizes a real duplicate-insert error as a unique violation (race fallback)', async () => {
      // The controller's race fallback cannot be triggered over HTTP (the pre-check wins),
      // so prove its premise directly: a duplicate insert through the same DB layer must
      // satisfy isUniqueViolation despite Drizzle wrapping the pg error as `cause`.
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const first = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      let thrown: unknown;
      try {
        await createSymbolAttachment({
          symbolId: first.body.symbolAttachment.symbolId,
          anchorId,
        });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeDefined();
      expect(isUniqueViolation(thrown)).toBe(true);
      expect(isUniqueViolation(new Error('unrelated'))).toBe(false);
    });

    it("404s when tagging another user's anchor", async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await bobAgent.post(`/api/anchors/${anchorId}/symbols`).send({ name: 'Water' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/symbols', () => {
    it("lists only the requester's symbol vocabulary", async () => {
      const aliceSetup = await createDreamWithAnchor(aliceAgent);
      const bobSetup = await createDreamWithAnchor(bobAgent);
      await aliceAgent.post(`/api/anchors/${aliceSetup.anchorId}/symbols`).send({ name: 'Water' });
      await bobAgent.post(`/api/anchors/${bobSetup.anchorId}/symbols`).send({ name: 'Fire' });

      const res = await aliceAgent.get('/api/symbols');
      expect(res.status).toBe(200);
      expect(res.body.symbols.map((s: { name: string }) => s.name)).toEqual(['Water']);
    });

    it('matches the q filter case-insensitively', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      await aliceAgent.post(`/api/anchors/${anchorId}/symbols`).send({ name: 'Water' });
      await aliceAgent.post(`/api/anchors/${anchorId}/symbols`).send({ name: 'Glass tower' });

      const res = await aliceAgent.get('/api/symbols').query({ q: 'wAt' });
      expect(res.status).toBe(200);
      expect(res.body.symbols.map((s: { name: string }) => s.name)).toEqual(['Water']);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).get('/api/symbols');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/symbol-attachments/:id', () => {
    it('removes the tag and cascades its associations', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const attachmentId = tagRes.body.symbolAttachment.id;
      const assocRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'The lake at my grandparents house', symbolAttachmentId: attachmentId });
      const associationId = assocRes.body.association.id;

      const deleteRes = await aliceAgent.delete(`/api/symbol-attachments/${attachmentId}`);
      expect(deleteRes.status).toBe(204);

      const updateRes = await aliceAgent
        .patch(`/api/associations/${associationId}`)
        .send({ content: 'still here?' });
      expect(updateRes.status).toBe(404);
    });

    it('keeps the symbol in the vocabulary after its last tag is removed', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      await aliceAgent.delete(`/api/symbol-attachments/${tagRes.body.symbolAttachment.id}`);

      const res = await aliceAgent.get('/api/symbols');
      expect(res.body.symbols.map((s: { name: string }) => s.name)).toEqual(['Water']);
    });

    it("404s when removing another user's tag", async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const res = await bobAgent.delete(
        `/api/symbol-attachments/${tagRes.body.symbolAttachment.id}`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/anchors/:anchorId/associations', () => {
    it('creates a personal, anchor-level association by default, with no symbol tag', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);

      const res = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'Something charged I cannot yet name' });
      expect(res.status).toBe(201);
      expect(res.body.association).toEqual(
        expect.objectContaining({
          anchorId,
          symbolAttachmentId: null,
          content: 'Something charged I cannot yet name',
          kind: 'personal',
        }),
      );
    });

    it('creates a cultural association when marked as one', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);

      const res = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'The unconscious, in the alchemical bath', kind: 'cultural' });
      expect(res.status).toBe(201);
      expect(res.body.association.kind).toBe('cultural');
    });

    it('also names a Symbol tag when a symbolAttachmentId is given', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });

      const res = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: tagRes.body.symbolAttachment.id });
      expect(res.status).toBe(201);
      expect(res.body.association).toEqual(
        expect.objectContaining({
          anchorId,
          symbolAttachmentId: tagRes.body.symbolAttachment.id,
        }),
      );
    });

    it('returns 400 for blank content or an unknown kind', async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);

      const blankRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: '  ' });
      expect(blankRes.status).toBe(400);

      const kindRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'fine', kind: 'archetypal' });
      expect(kindRes.status).toBe(400);
    });

    it('returns 400 when the symbolAttachmentId names a tag on a different anchor', async () => {
      const first = await createDreamWithAnchor(aliceAgent);
      const second = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${first.anchorId}/symbols`)
        .send({ name: 'Water' });

      const res = await aliceAgent
        .post(`/api/anchors/${second.anchorId}/associations`)
        .send({ content: 'drifted', symbolAttachmentId: tagRes.body.symbolAttachment.id });
      expect(res.status).toBe(400);
    });

    it("404s when attaching to another user's anchor", async () => {
      const { anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await bobAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'hijacked' });
      expect(res.status).toBe(404);
    });

    it("400s when the symbolAttachmentId names another user's tag", async () => {
      const aliceSetup = await createDreamWithAnchor(aliceAgent);
      const bobSetup = await createDreamWithAnchor(bobAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${aliceSetup.anchorId}/symbols`)
        .send({ name: 'Water' });

      const res = await bobAgent
        .post(`/api/anchors/${bobSetup.anchorId}/associations`)
        .send({ content: 'hijacked', symbolAttachmentId: tagRes.body.symbolAttachment.id });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/associations/:id and DELETE /api/associations/:id', () => {
    const createAssociation = async () => {
      const { anchorId, dreamId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const assocRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'The lake', symbolAttachmentId: tagRes.body.symbolAttachment.id });
      return { dreamId, associationId: assocRes.body.association.id as number };
    };

    it('updates content and kind', async () => {
      const { associationId } = await createAssociation();
      const res = await aliceAgent
        .patch(`/api/associations/${associationId}`)
        .send({ content: 'Baptism', kind: 'cultural' });
      expect(res.status).toBe(200);
      expect(res.body.association).toEqual(
        expect.objectContaining({ content: 'Baptism', kind: 'cultural' }),
      );
    });

    it('keeps the existing kind when the update omits it', async () => {
      const { associationId } = await createAssociation();
      await aliceAgent
        .patch(`/api/associations/${associationId}`)
        .send({ content: 'Baptism', kind: 'cultural' });
      const res = await aliceAgent
        .patch(`/api/associations/${associationId}`)
        .send({ content: 'Baptism, revised' });
      expect(res.status).toBe(200);
      expect(res.body.association.kind).toBe('cultural');
    });

    it('deletes the association', async () => {
      const { dreamId, associationId } = await createAssociation();
      const res = await aliceAgent.delete(`/api/associations/${associationId}`);
      expect(res.status).toBe(204);

      const dreamRes = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(dreamRes.body.anchors[0].symbolAttachments[0].associations).toEqual([]);
    });

    it("404s when updating or deleting another user's association", async () => {
      const { associationId } = await createAssociation();
      const updateRes = await bobAgent
        .patch(`/api/associations/${associationId}`)
        .send({ content: 'hijacked' });
      expect(updateRes.status).toBe(404);
      const deleteRes = await bobAgent.delete(`/api/associations/${associationId}`);
      expect(deleteRes.status).toBe(404);
    });
  });

  describe('POST /api/dreams/:dreamId/analysis-passes', () => {
    it('creates an analytic pass tied to an anchor', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'analytic', content: 'The glass city is my workplace.', anchorId });
      expect(res.status).toBe(201);
      expect(res.body.analysisPass).toEqual(
        expect.objectContaining({ dreamId, anchorId, type: 'analytic' }),
      );
    });

    it('creates an unanchored analytic pass (whole-dream reduction)', async () => {
      const { dreamId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'analytic', content: 'The whole dream replays the interview.' });
      expect(res.status).toBe(201);
      expect(res.body.analysisPass.anchorId).toBeNull();
    });

    it('creates a synthetic pass, always whole-dream', async () => {
      const { dreamId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'The dream points toward leaving.' });
      expect(res.status).toBe(201);
      expect(res.body.analysisPass).toEqual(
        expect.objectContaining({ type: 'synthetic', anchorId: null }),
      );
    });

    it('rejects an anchored synthetic pass', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'Anchored, wrongly.', anchorId });
      expect(res.status).toBe(400);
    });

    it('rejects blank content and unknown types', async () => {
      const { dreamId } = await createDreamWithAnchor(aliceAgent);
      const blankRes = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'analytic', content: '  ' });
      expect(blankRes.status).toBe(400);
      const typeRes = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'reductive', content: 'fine' });
      expect(typeRes.status).toBe(400);
    });

    it('404s for an anchor that does not belong to the dream', async () => {
      const first = await createDreamWithAnchor(aliceAgent);
      const second = await createDreamWithAnchor(aliceAgent);
      const res = await aliceAgent
        .post(`/api/dreams/${first.dreamId}/analysis-passes`)
        .send({ type: 'analytic', content: 'Cross-dream anchor.', anchorId: second.anchorId });
      expect(res.status).toBe(404);
    });

    it("404s for another user's dream", async () => {
      const { dreamId } = await createDreamWithAnchor(aliceAgent);
      const res = await bobAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'hijacked' });
      expect(res.status).toBe(404);
    });

    it('offers no update or delete route - passes are append-only by design', async () => {
      const { dreamId } = await createDreamWithAnchor(aliceAgent);
      const created = await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'Immutable.' });
      const passId = created.body.analysisPass.id;

      const patchRes = await aliceAgent
        .patch(`/api/analysis-passes/${passId}`)
        .send({ content: 'rewritten' });
      expect(patchRes.status).toBe(404);
      const deleteRes = await aliceAgent.delete(`/api/analysis-passes/${passId}`);
      expect(deleteRes.status).toBe(404);
    });
  });

  describe('GET /api/dreams/:dreamId with analysis data', () => {
    it('includes symbol attachments with associations, and analysis passes', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      await aliceAgent.post(`/api/anchors/${anchorId}/associations`).send({
        content: 'The lake',
        kind: 'personal',
        symbolAttachmentId: tagRes.body.symbolAttachment.id,
      });
      await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'synthetic', content: 'Toward the open.' });

      const res = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(res.status).toBe(200);
      expect(res.body.anchors[0].symbolAttachments).toEqual([
        expect.objectContaining({
          symbolName: 'Water',
          associations: [expect.objectContaining({ content: 'The lake', kind: 'personal' })],
        }),
      ]);
      expect(res.body.analysisPasses).toEqual([
        expect.objectContaining({ type: 'synthetic', content: 'Toward the open.' }),
      ]);
    });

    it('lists anchor-level associations above symbol attachments, separate from named ones', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'Raw material, not yet named' });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: tagRes.body.symbolAttachment.id });

      const res = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(res.body.anchors[0].associations).toEqual([
        expect.objectContaining({
          content: 'Raw material, not yet named',
          symbolAttachmentId: null,
        }),
      ]);
      expect(res.body.anchors[0].symbolAttachments[0].associations).toEqual([
        expect.objectContaining({ content: 'depth' }),
      ]);
    });

    it('keeps associations in creation order after one is edited', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const attachmentId: number = tagRes.body.symbolAttachment.id;
      const first = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: attachmentId });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'the lake', symbolAttachmentId: attachmentId });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'drowning', symbolAttachmentId: attachmentId });

      // A PATCH rewrites the row's physical tuple; without an explicit ORDER BY the
      // edited association would jump to the end of the refetched list.
      await aliceAgent
        .patch(`/api/associations/${first.body.association.id}`)
        .send({ content: 'depth, revised' });

      const res = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(
        res.body.anchors[0].symbolAttachments[0].associations.map(
          (association: { content: string }) => association.content,
        ),
      ).toEqual(['depth, revised', 'the lake', 'drowning']);
    });

    it('deleting an anchor cascades its symbol attachments and all its associations, but keeps its passes, unanchored', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const anchorAssocRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'Unnamed as yet' });
      const symbolAssocRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: tagRes.body.symbolAttachment.id });
      await aliceAgent
        .post(`/api/dreams/${dreamId}/analysis-passes`)
        .send({ type: 'analytic', content: 'Anchored reading.', anchorId });

      await aliceAgent.delete(`/api/anchors/${anchorId}`);

      const attachmentRes = await aliceAgent.delete(
        `/api/symbol-attachments/${tagRes.body.symbolAttachment.id}`,
      );
      expect(attachmentRes.status).toBe(404);
      expect(
        (
          await aliceAgent.patch(`/api/associations/${anchorAssocRes.body.association.id}`).send({
            content: 'still here?',
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await aliceAgent.patch(`/api/associations/${symbolAssocRes.body.association.id}`).send({
            content: 'still here?',
          })
        ).status,
      ).toBe(404);

      const dreamRes = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(dreamRes.body.anchors).toEqual([]);
      expect(dreamRes.body.analysisPasses).toEqual([
        expect.objectContaining({ content: 'Anchored reading.', anchorId: null }),
      ]);
    });

    it('deleting a Symbol tag removes only the associations that named it, leaving anchor-level ones', async () => {
      const { dreamId, anchorId } = await createDreamWithAnchor(aliceAgent);
      const tagRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/symbols`)
        .send({ name: 'Water' });
      const anchorAssocRes = await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'Unnamed as yet' });
      await aliceAgent
        .post(`/api/anchors/${anchorId}/associations`)
        .send({ content: 'depth', symbolAttachmentId: tagRes.body.symbolAttachment.id });

      const deleteRes = await aliceAgent.delete(
        `/api/symbol-attachments/${tagRes.body.symbolAttachment.id}`,
      );
      expect(deleteRes.status).toBe(204);

      const dreamRes = await aliceAgent.get(`/api/dreams/${dreamId}`);
      expect(dreamRes.body.anchors[0].symbolAttachments).toEqual([]);
      expect(dreamRes.body.anchors[0].associations).toEqual([
        expect.objectContaining({
          id: anchorAssocRes.body.association.id,
          content: 'Unnamed as yet',
        }),
      ]);
    });
  });
});
