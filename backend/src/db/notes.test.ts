import { sql } from 'drizzle-orm';
import { runMigrations } from './migrate';
import { db, pool } from './index';
import { createUser } from './users';
import { createSource } from './sources';
import { createLiteratureNote } from './notes';

// The per-kind requirements are the definitions of the two note kinds, so they are stated as
// CHECK constraints in the database rather than left to validation alone (ADR 0012). These
// tests go around the module's validation deliberately: they are what makes the constraints
// the floor under it instead of a second copy of it.
// Drizzle wraps driver errors in DrizzleQueryError and carries the pg error as `cause`, so
// the violated constraint's name is one level down (see db/errors.ts).
const expectConstraint = async (query: Promise<unknown>, constraint: string): Promise<void> => {
  await expect(query).rejects.toMatchObject({
    cause: expect.objectContaining({ code: '23514', constraint }),
  });
};

describe('notes table (integration)', () => {
  let userId: number;
  let sourceId: number;

  beforeAll(async () => {
    await runMigrations();
    await db.execute(sql`TRUNCATE TABLE notes, sources, users RESTART IDENTITY CASCADE`);
    const user = await createUser('schema-notes', 'schema-notes@example.com', 'secret123');
    userId = user.id;
    const source = await createSource({
      userId,
      title: 'How to Take Smart Notes',
      kind: 'book',
      author: null,
      url: null,
    });
    sourceId = source.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('stores a Literature note with one half of a Locator', async () => {
    const note = await createLiteratureNote({
      userId,
      sourceId,
      body: 'A point.',
      section: null,
      position: '42',
      excerpt: null,
      openQuestion: false,
    });

    expect(note).toEqual(
      expect.objectContaining({ kind: 'literature', sourceId, position: '42', section: null }),
    );
  });

  it('refuses a Literature note with neither half of a Locator', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, source_id, body)
        VALUES (${userId}, 'literature', ${sourceId}, 'A point with nowhere to be.')
      `),
      'notes_literature_shape',
    );
  });

  it('refuses a Literature note whose Locator halves are blank rather than absent', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, source_id, body, section, position)
        VALUES (${userId}, 'literature', ${sourceId}, 'A point.', '  ', '')
      `),
      'notes_literature_shape',
    );
  });

  it('refuses a Literature note bound to no Source', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, body, position)
        VALUES (${userId}, 'literature', 'A sourceless reading note.', '42')
      `),
      'notes_literature_shape',
    );
  });

  it('refuses a titled Literature note, since the Locator identifies it', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, source_id, title, body, position)
        VALUES (${userId}, 'literature', ${sourceId}, 'A claim', 'A point.', '42')
      `),
      'notes_literature_shape',
    );
  });

  it('refuses a Permanent note carrying a Source, a Locator or an excerpt', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, source_id, title, body)
        VALUES (${userId}, 'permanent', ${sourceId}, 'A claim.', 'The idea.')
      `),
      'notes_permanent_shape',
    );
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, title, body, position)
        VALUES (${userId}, 'permanent', 'A claim.', 'The idea.', '42')
      `),
      'notes_permanent_shape',
    );
  });

  it('refuses an untitled Permanent note', async () => {
    await expectConstraint(
      db.execute(sql`
        INSERT INTO notes (user_id, kind, body) VALUES (${userId}, 'permanent', 'The idea.')
      `),
      'notes_permanent_shape',
    );
  });

  // The composite foreign keys that later tables use to reference one kind specifically
  // need this index to point at - review_answers for literature, note_topics for permanent.
  it('carries the unique index on (id, kind) that later composite foreign keys need', async () => {
    const result = await db.execute(sql`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'notes' AND indexname = 'notes_id_kind_unique'
    `);

    expect(result.rows).toHaveLength(1);
    expect(String(result.rows[0]?.indexdef)).toMatch(/UNIQUE INDEX .* \(id, kind\)/);
  });

  it('indexes the reading stream it is read by', async () => {
    const result = await db.execute(sql`
      SELECT indexname FROM pg_indexes WHERE tablename = 'notes'
    `);

    expect(result.rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining(['notes_source_id_created_at_idx', 'notes_user_id_kind_idx']),
    );
  });
});
