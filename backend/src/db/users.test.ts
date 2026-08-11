import { sql } from 'drizzle-orm';
import { runMigrations } from './migrate';
import { db, pool } from './index';
import {
  createUser,
  findByUsername,
  verifyPassword,
  findByIdPublic,
  DuplicateUserError,
} from './users';

describe('user service', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('hashes the password on create and never returns it', async () => {
    const user = await createUser('Alice', 'alice@example.com', 'secret123');
    expect(user.username).toBe('alice');
    expect(user.email).toBe('alice@example.com');
    expect((user as unknown as { password?: string }).password).toBeUndefined();
  });

  it('finds a user by username case-insensitively', async () => {
    await createUser('Bob', 'bob@example.com', 'secret123');
    const found = await findByUsername('BOB');
    expect(found?.username).toBe('bob');
  });

  it('verifies a correct password and rejects an incorrect one', async () => {
    await createUser('carol', 'carol@example.com', 'correct-password');
    const user = await findByUsername('carol');
    expect(user).toBeDefined();
    if (!user) return;
    await expect(verifyPassword(user, 'correct-password')).resolves.toBe(true);
    await expect(verifyPassword(user, 'wrong-password')).resolves.toBe(false);
  });

  it('throws DuplicateUserError when the username already exists', async () => {
    await createUser('dave', 'dave@example.com', 'secret123');
    await expect(createUser('dave', 'someone-else@example.com', 'secret123')).rejects.toThrow(
      DuplicateUserError,
    );
  });

  it('finds a public user by id without the password field', async () => {
    const created = await createUser('erin', 'erin@example.com', 'secret123');
    const found = await findByIdPublic(created.id);
    expect(found?.username).toBe('erin');
    expect((found as unknown as { password?: string })?.password).toBeUndefined();
  });
});
