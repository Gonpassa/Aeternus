# Phase 2 — Account/Session Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backend's Mongo/Mongoose data layer with PostgreSQL/Drizzle, add a `users` table and user service, and wire session handling (express-session + connect-pg-simple) and Passport's local strategy into the app, so Phase 3 only needs to add login/register routes and flip `ensureAuth` from its stub.

**Architecture:** A new `src/db/` package owns the Postgres connection, Drizzle schema, migrations, and the user service (hash/verify/lookup). `src/config/passport.ts` and `src/config/session.ts` wire auth/session middleware that `app.ts` mounts ahead of the existing routes. Nothing in this plan adds HTTP routes beyond the existing `/api/health`.

**Tech Stack:** PostgreSQL (local, natively installed), `pg`, `drizzle-orm` + `drizzle-kit`, `bcrypt`, `passport` + `passport-local`, `express-session` + `connect-pg-simple`, `express-rate-limit`. Test runner stays Jest (`ts-jest`) + `supertest`, now running against a real local Postgres test database.

## Global Constraints

- bcrypt cost factor: 10 (matches Harmonee).
- `SESSION_SECRET` is required; the app must fail fast (thrown error, no silent default) in every environment if it's missing.
- Session cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` only in production, `maxAge` of 7 days (`7 * 24 * 60 * 60 * 1000` ms).
- Rate limiter uses the default in-memory store — no Redis or other external store.
- Postgres is provisioned natively (Homebrew or equivalent), not via Docker.
- `deserializeUser` must never expose the `password` column on `req.user`.
- Backend ESLint has `no-console` as an error — use `// eslint-disable-next-line no-console` for the existing startup/error logs, don't add a logging library.
- All new backend code extends the existing `tsconfig.base.json` strict settings already in place.
- Journal/writing/calendar/AI-learning data models are out of scope — this plan only touches `users` and session infrastructure.

---

### Task 1: Dependency swap and local Postgres setup

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env.example`
- Create: `backend/.env.test.example`
- Modify: `README.md` (repo root)

**Interfaces:**
- Produces: `DATABASE_URL`, `SESSION_SECRET`, `PORT` env vars documented in `.env.example`; `TEST_DATABASE_URL`-equivalent (a second `.env.test` file, not a var) documented for test runs.

- [ ] **Step 1: Remove `mongoose`, add the new dependencies**

Edit `backend/package.json`:

```diff
   "dependencies": {
     "@nee3/shared-types": "^1.0.0",
+    "bcrypt": "^5.1.1",
+    "connect-pg-simple": "^10.0.0",
     "cors": "^2.8.5",
     "dotenv": "^16.4.5",
+    "drizzle-orm": "^0.36.0",
     "express": "^4.19.2",
-    "mongoose": "^8.5.3"
+    "express-rate-limit": "^7.4.1",
+    "express-session": "^1.18.1",
+    "passport": "^0.7.0",
+    "passport-local": "^1.0.0",
+    "pg": "^8.13.0"
   },
   "devDependencies": {
     "@types/cors": "^2.8.17",
+    "@types/bcrypt": "^5.0.2",
+    "@types/connect-pg-simple": "^7.0.3",
     "@types/express": "^4.17.21",
+    "@types/express-session": "^1.18.0",
     "@types/jest": "^29.5.12",
     "@types/node": "^22.3.0",
+    "@types/passport": "^1.0.16",
+    "@types/passport-local": "^1.0.38",
+    "@types/pg": "^8.11.10",
     "@types/supertest": "^6.0.2",
+    "drizzle-kit": "^0.28.0",
     "eslint": "^8.57.1",
     "eslint-config-prettier": "^9.1.0",
     "jest": "^29.7.0",
     "nodemon": "^3.1.4",
     "supertest": "^7.0.0",
     "ts-jest": "^29.2.4",
     "ts-node": "^10.9.2",
     "typescript-eslint": "^8.7.0"
   }
```

Also add two npm scripts to the same file's `"scripts"` block:

```diff
   "scripts": {
     "start": "ts-node src/index.ts",
     "dev": "nodemon src/index.ts",
     "lint": "eslint 'src/**/*.ts'",
-    "test": "jest"
+    "test": "jest",
+    "db:generate": "drizzle-kit generate",
+    "db:migrate": "ts-node src/db/migrate.ts"
   },
```

- [ ] **Step 2: Install dependencies and verify**

Run: `cd backend && npm install`
Expected: install succeeds with no errors. Run `npm ls mongoose` afterward and expect it to report mongoose is not installed (not found / empty).

- [ ] **Step 3: Install Postgres locally and create the dev and test databases**

Run (macOS/Homebrew):
```bash
brew install postgresql@16
brew services start postgresql@16
createdb nee3
createdb nee3_test
```
Expected: both `createdb` commands succeed with no output (or report the DB already exists if re-run).

- [ ] **Step 4: Update env file templates**

Replace the contents of `backend/.env.example`:

```
PORT=3000
DATABASE_URL=postgres://localhost:5432/nee3
SESSION_SECRET=replace-with-a-long-random-string
```

Create `backend/.env.test.example`:

```
PORT=3001
DATABASE_URL=postgres://localhost:5432/nee3_test
SESSION_SECRET=test-secret
```

Then create your real, gitignored local copies:
```bash
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
```
Edit `backend/.env`'s `SESSION_SECRET` to an actual random value (e.g. `openssl rand -hex 32`).

- [ ] **Step 5: Document local Postgres setup in the README**

Add a new subsection under Aeternus.3's `## Commands` section in `README.md` (repo root), after the existing command blocks:

```markdown
### Local Postgres setup

Backend tests and the dev server require a local PostgreSQL instance (installed natively, e.g. via Homebrew — not Docker):

\`\`\`sh
brew install postgresql@16
brew services start postgresql@16
createdb nee3        # dev database
createdb nee3_test   # test database
\`\`\`

Copy `backend/.env.example` to `backend/.env` and `backend/.env.test.example` to `backend/.env.test`, then set a real `SESSION_SECRET` in `backend/.env`. Both files are gitignored.
```

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example backend/.env.test.example README.md
git commit -m "chore: swap Mongo deps for Postgres/Drizzle stack, document local Postgres setup"
```

---

### Task 2: Drizzle schema, migrations, and the Postgres client

**Files:**
- Create: `backend/drizzle.config.ts`
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/index.ts`
- Create: `backend/src/db/migrate.ts`
- Delete: `backend/src/config/database.ts`
- Modify: `backend/src/config/default.ts`
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `DATABASE_URL`, `SESSION_SECRET` from `backend/.env` / `backend/.env.test` (Task 1).
- Produces: `db` (Drizzle client) and `pool` (`pg.Pool`) exported from `src/db/index.ts`; `connectDB(): Promise<void>` exported from `src/db/index.ts`; `runMigrations(): Promise<void>` exported from `src/db/migrate.ts`; `users` table and `User`/`NewUser` types exported from `src/db/schema.ts`; `config.databaseUrl`, `config.sessionSecret`, `config.nodeEnv`, `config.port` exported from `src/config/default.ts`.

- [ ] **Step 1: Update config/default.ts for Postgres + required SESSION_SECRET**

Replace `backend/src/config/default.ts`:

```ts
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export default {
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/nee3',
  port: process.env.PORT || 3000,
  sessionSecret,
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

- [ ] **Step 2: Write the Drizzle schema**

Create `backend/src/db/schema.ts`:

```ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 3: Create the Drizzle client**

Create `backend/src/db/index.ts`:

```ts
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import config from '../config/default';

export const pool = new Pool({ connectionString: config.databaseUrl });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export const connectDB = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
};
```

- [ ] **Step 4: Create the Drizzle Kit config**

Create `backend/drizzle.config.ts`:

```ts
import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/nee3',
  },
});
```

- [ ] **Step 5: Create the migration runner**

Create `backend/src/db/migrate.ts`:

```ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';

export const runMigrations = async (): Promise<void> => {
  await migrate(db, { migrationsFolder: './src/db/migrations' });
};

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 6: Delete the old Mongo connection module**

Run: `rm backend/src/config/database.ts`

- [ ] **Step 7: Point index.ts at the new connectDB**

Edit `backend/src/index.ts`:

```diff
 import { createApp } from './app';
-import { connectDB } from './config/database';
+import { connectDB } from './db';
 import config from './config/default';
```

- [ ] **Step 8: Generate and run the migration against the dev database**

Run (from `backend/`):
```bash
npm run db:generate
npm run db:migrate
```
Expected: `db:generate` creates a SQL file under `src/db/migrations/` (and a `meta/` folder); `db:migrate` runs it with no errors.

- [ ] **Step 9: Verify the table exists**

Run: `psql nee3 -c '\d users'`
Expected: output lists columns `id`, `username`, `email`, `password`, `created_at`, `updated_at` with the types/constraints from the schema.

- [ ] **Step 10: Run the existing test suite to confirm nothing broke**

Run: `cd backend && npm test`
Expected: the existing `app.test.ts` health-check test still passes (it doesn't touch the DB yet).

- [ ] **Step 11: Commit**

```bash
git add backend/drizzle.config.ts backend/src/db backend/src/config/default.ts backend/src/index.ts
git commit -m "feat: add Postgres/Drizzle client, schema, and migrations for users"
```

---

### Task 3: User service (create, find, verify password)

**Files:**
- Create: `backend/src/db/users.ts`
- Test: `backend/src/db/users.test.ts`

**Interfaces:**
- Consumes: `db` from `./index` (Task 2), `users`, `User`, `NewUser` from `./schema` (Task 2), `runMigrations` from `./migrate` (Task 2, test-only).
- Produces: `createUser(username: string, email: string, password: string): Promise<PublicUser>`, `findByUsername(username: string): Promise<User | undefined>`, `verifyPassword(user: User, candidatePassword: string): Promise<boolean>`, `findByIdPublic(id: number): Promise<PublicUser | undefined>`, `PublicUser` type, `DuplicateUserError` class — all exported from `src/db/users.ts`.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/db/users.test.ts`:

```ts
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
    await expect(
      createUser('dave', 'someone-else@example.com', 'secret123'),
    ).rejects.toThrow(DuplicateUserError);
  });

  it('finds a public user by id without the password field', async () => {
    const created = await createUser('erin', 'erin@example.com', 'secret123');
    const found = await findByIdPublic(created.id);
    expect(found?.username).toBe('erin');
    expect((found as unknown as { password?: string })?.password).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/db/users.test.ts`
Expected: FAIL — `Cannot find module './users'` (the file doesn't exist yet).

- [ ] **Step 3: Implement the user service**

Create `backend/src/db/users.ts`:

```ts
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
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()));
  return user;
};

export const verifyPassword = async (
  user: User,
  candidatePassword: string,
): Promise<boolean> => bcrypt.compare(candidatePassword, user.password);

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/db/users.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/users.ts backend/src/db/users.test.ts
git commit -m "feat: add user service with bcrypt hashing and duplicate detection"
```

---

### Task 4: Passport local strategy

**Files:**
- Create: `backend/src/types/express.d.ts`
- Create: `backend/src/config/passport.ts`
- Test: `backend/src/config/passport.test.ts`

**Interfaces:**
- Consumes: `findByUsername`, `verifyPassword`, `findByIdPublic`, `PublicUser` from `../db/users` (Task 3).
- Produces: default export `passport` (configured `Authenticator` instance) from `src/config/passport.ts`; global `Express.User` type (= `PublicUser`) available to the rest of the backend.

- [ ] **Step 1: Add the Express.User type augmentation**

Create `backend/src/types/express.d.ts`:

```ts
import { PublicUser } from '../db/users';

declare global {
  namespace Express {
    interface User extends PublicUser {}
  }
}

export {};
```

- [ ] **Step 2: Write the failing tests**

Create `backend/src/config/passport.test.ts`:

```ts
import passport from './passport';
import * as userService from '../db/users';
import { User } from '../db/schema';

jest.mock('../db/users');

const mockedFindByUsername = userService.findByUsername as jest.MockedFunction<
  typeof userService.findByUsername
>;
const mockedVerifyPassword = userService.verifyPassword as jest.MockedFunction<
  typeof userService.verifyPassword
>;
const mockedFindByIdPublic = userService.findByIdPublic as jest.MockedFunction<
  typeof userService.findByIdPublic
>;

const fakeUser: User = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  password: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

type VerifyDone = (err: unknown, user: unknown, info?: unknown) => void;
type Strategy = { _verify: (username: string, password: string, done: VerifyDone) => void };

const runStrategy = (username: string, password: string): Promise<[unknown, unknown, unknown]> =>
  new Promise((resolve) => {
    const strategy = (passport as unknown as {
      _strategy: (name: string) => Strategy;
    })._strategy('local');
    strategy._verify(username, password, (err, user, info) => {
      resolve([err, user, info]);
    });
  });

describe('passport local strategy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('succeeds with a valid username and password', async () => {
    mockedFindByUsername.mockResolvedValue(fakeUser);
    mockedVerifyPassword.mockResolvedValue(true);

    const [err, user, info] = await runStrategy('alice', 'correct-password');

    expect(err).toBeNull();
    expect(user).toEqual(fakeUser);
    expect(info).toBeUndefined();
  });

  it('fails when the username is not found', async () => {
    mockedFindByUsername.mockResolvedValue(undefined);

    const [err, user, info] = await runStrategy('nobody', 'password');

    expect(err).toBeNull();
    expect(user).toBe(false);
    expect(info).toEqual({ message: 'Username nobody not found.' });
  });

  it('fails when the password is incorrect', async () => {
    mockedFindByUsername.mockResolvedValue(fakeUser);
    mockedVerifyPassword.mockResolvedValue(false);

    const [err, user, info] = await runStrategy('alice', 'wrong-password');

    expect(err).toBeNull();
    expect(user).toBe(false);
    expect(info).toEqual({ message: 'Invalid password' });
  });

  it('serializes a user to its id', () => {
    let serialized: unknown;
    passport.serializeUser(fakeUser, (_err, id) => {
      serialized = id;
    });
    expect(serialized).toBe(1);
  });

  it('deserializes an id back to a public user without a password', async () => {
    mockedFindByIdPublic.mockResolvedValue({
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      createdAt: fakeUser.createdAt,
      updatedAt: fakeUser.updatedAt,
    });

    const deserialized = await new Promise((resolve) => {
      passport.deserializeUser(1, (_err, user) => resolve(user));
    });

    expect(deserialized).toEqual(expect.objectContaining({ username: 'alice' }));
    expect((deserialized as { password?: string }).password).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && npx jest src/config/passport.test.ts`
Expected: FAIL — `Cannot find module './passport'`.

- [ ] **Step 4: Implement the Passport config**

Create `backend/src/config/passport.ts`:

```ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { findByUsername, findByIdPublic, verifyPassword } from '../db/users';

passport.use(
  new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const user = await findByUsername(username);
      if (!user) {
        done(null, false, { message: `Username ${username} not found.` });
        return;
      }
      const isMatch = await verifyPassword(user, password);
      if (!isMatch) {
        done(null, false, { message: 'Invalid password' });
        return;
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findByIdPublic(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npx jest src/config/passport.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/types/express.d.ts backend/src/config/passport.ts backend/src/config/passport.test.ts
git commit -m "feat: wire Passport local strategy against the user service"
```

---

### Task 5: Session middleware, rate limiter, and app wiring

**Files:**
- Create: `backend/src/config/session.ts`
- Test: `backend/src/config/session.test.ts`
- Create: `backend/src/middleware/rateLimit.ts`
- Test: `backend/src/middleware/rateLimit.test.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/__tests__/app.test.ts` (verify only, no code change expected)

**Interfaces:**
- Consumes: `pool` from `../db` (Task 2), `config` from `./default` (Task 2), `passport` from `./passport` (Task 4).
- Produces: default export session middleware (`RequestHandler`) from `src/config/session.ts`; `createRateLimiter(windowMs: number, max: number)` and `loginRateLimiter` from `src/middleware/rateLimit.ts`, ready for Phase 3 to attach to the login route.

- [ ] **Step 1: Write the failing session middleware tests**

Create `backend/src/config/session.test.ts`:

```ts
import express from 'express';
import request from 'supertest';
import sessionMiddleware from './session';
import { pool } from '../db';

describe('session middleware', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('attaches a session object to the request', async () => {
    const app = express();
    app.use(sessionMiddleware);
    app.get('/test', (req, res) => {
      res.json({ hasSession: typeof req.session === 'object' });
    });

    const response = await request(app).get('/test');
    expect(response.body.hasSession).toBe(true);
  });

  it('sets a session cookie once the session is modified', async () => {
    const app = express();
    app.use(sessionMiddleware);
    app.get('/test', (req, res) => {
      (req.session as unknown as Record<string, unknown>).visited = true;
      res.json({ ok: true });
    });

    const response = await request(app).get('/test');
    expect(response.headers['set-cookie']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/config/session.test.ts`
Expected: FAIL — `Cannot find module './session'`.

- [ ] **Step 3: Implement the session middleware**

Create `backend/src/config/session.ts`:

```ts
import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import config from './default';

const PgSession = connectPgSimple(session);

const sessionOptions: SessionOptions = {
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

export default session(sessionOptions);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/config/session.test.ts`
Expected: PASS, both tests green. (This also creates a `session` table in the test database via `createTableIfMissing` — expected, matches the disposable test-DB setup from Task 1.)

- [ ] **Step 5: Write the failing rate limiter test**

Create `backend/src/middleware/rateLimit.test.ts`:

```ts
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  it('allows requests under the limit and blocks the rest within the window', async () => {
    const app = express();
    app.use(createRateLimiter(60_000, 2));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const first = await request(app).get('/test');
    const second = await request(app).get('/test');
    const third = await request(app).get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd backend && npx jest src/middleware/rateLimit.test.ts`
Expected: FAIL — `Cannot find module './rateLimit'`.

- [ ] **Step 7: Implement the rate limiter**

Create `backend/src/middleware/rateLimit.ts`:

```ts
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

export const createRateLimiter = (windowMs: number, max: number): RateLimitRequestHandler =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

export const loginRateLimiter = createRateLimiter(15 * 60 * 1000, 10);
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && npx jest src/middleware/rateLimit.test.ts`
Expected: PASS.

- [ ] **Step 9: Wire session and Passport into the Express app**

Edit `backend/src/app.ts`:

```ts
import express, { Express } from 'express';
import cors from 'cors';
import sessionMiddleware from './config/session';
import passport from './config/passport';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};
```

- [ ] **Step 10: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS — the existing `app.test.ts` health-check test still passes with session/Passport middleware now in the chain, plus all tests from Tasks 3-5.

- [ ] **Step 11: Commit**

```bash
git add backend/src/config/session.ts backend/src/config/session.test.ts backend/src/middleware/rateLimit.ts backend/src/middleware/rateLimit.test.ts backend/src/app.ts
git commit -m "feat: wire session/Passport middleware into the app and add a reusable rate limiter"
```
