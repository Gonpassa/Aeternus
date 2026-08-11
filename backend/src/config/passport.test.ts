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
const mockedToPublicUser = userService.toPublicUser as jest.MockedFunction<
  typeof userService.toPublicUser
>;
const { toPublicUser: actualToPublicUser } = jest.requireActual<typeof userService>('../db/users');

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
    const strategy = (
      passport as unknown as {
        _strategy: (name: string) => Strategy;
      }
    )._strategy('local');
    strategy._verify(username, password, (err, user, info) => {
      resolve([err, user, info]);
    });
  });

describe('passport local strategy', () => {
  beforeEach(() => {
    mockedToPublicUser.mockImplementation(actualToPublicUser);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('succeeds with a valid username and password', async () => {
    mockedFindByUsername.mockResolvedValue(fakeUser);
    mockedVerifyPassword.mockResolvedValue(true);

    const [err, user, info] = await runStrategy('alice', 'correct-password');

    expect(err).toBeNull();
    expect(user).toEqual({
      id: fakeUser.id,
      username: fakeUser.username,
      email: fakeUser.email,
      createdAt: fakeUser.createdAt,
      updatedAt: fakeUser.updatedAt,
    });
    expect((user as { password?: string }).password).toBeUndefined();
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

  it('deserializes to false (not undefined) when the user no longer exists', async () => {
    mockedFindByIdPublic.mockResolvedValue(undefined);

    const deserialized = await new Promise((resolve) => {
      passport.deserializeUser(999, (_err, user) => resolve(user));
    });

    expect(deserialized).toBe(false);
  });
});
