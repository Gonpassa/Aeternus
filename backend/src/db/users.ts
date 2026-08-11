import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { users, User, NewUser } from './schema';

const SALT_ROUNDS = 10;

export class DuplicateUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateUserError';
  }
}

export type PublicUser = Omit<User, 'password'>;

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: unknown }).code === '23505';

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const createUser = async (
  username: string,
  email: string,
  password: string,
): Promise<PublicUser> => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser: NewUser = {
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hashedPassword,
  };

  try {
    const [created] = await db.insert(users).values(newUser).returning();
    if (!created) {
      throw new Error('Insert did not return a row');
    }
    return toPublicUser(created);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DuplicateUserError('Username or email already exists');
    }
    throw err;
  }
};

export const findByUsername = async (username: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
  return user;
};

export const verifyPassword = async (user: User, candidatePassword: string): Promise<boolean> =>
  bcrypt.compare(candidatePassword, user.password);

export const findByIdPublic = async (id: number): Promise<PublicUser | undefined> => {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));
  return user;
};
