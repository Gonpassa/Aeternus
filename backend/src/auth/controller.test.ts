import { Request, Response, NextFunction } from 'express';
import { register, login, logout, me } from './controller';
import * as userService from '../db/users';
import { DuplicateUserError } from '../db/users';
import passport from '../config/passport';

jest.mock('../db/users', () => ({
  ...jest.requireActual('../db/users'),
  createUser: jest.fn(),
}));

jest.mock('../config/passport', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
  },
}));

const mockedCreateUser = userService.createUser as jest.MockedFunction<
  typeof userService.createUser
>;

type AuthenticateCallback = (err: unknown, user: unknown, info: unknown) => void;

const mockedAuthenticate = passport.authenticate as unknown as jest.Mock<
  () => void,
  [string, AuthenticateCallback]
>;

const mockAuthenticateResult = (err: unknown, user: unknown, info: unknown): void => {
  mockedAuthenticate.mockImplementation((_strategy, callback) => () => {
    callback(err, user, info);
  });
};

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const fakeUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('register', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for invalid input without calling createUser', async () => {
    const req = { body: { username: '', email: '', password: '' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('returns 409 when createUser throws DuplicateUserError', async () => {
    mockedCreateUser.mockRejectedValue(new DuplicateUserError('Username or email already exists'));
    const req = {
      body: { username: 'alice', email: 'alice@example.com', password: 'abcd' },
      logIn: jest.fn((_user, cb: (err?: unknown) => void) => cb()),
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username or email already exists' });
  });

  it('logs the user in and returns 201 on success', async () => {
    mockedCreateUser.mockResolvedValue(fakeUser);
    const logIn = jest.fn((_user, cb: (err?: unknown) => void) => cb());
    const req = {
      body: { username: 'alice', email: 'alice@example.com', password: 'abcd' },
      logIn,
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(logIn).toHaveBeenCalledWith(fakeUser, expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });

  it('calls next with the error when req.logIn fails', async () => {
    mockedCreateUser.mockResolvedValue(fakeUser);
    const loginErr = new Error('logIn failed');
    const logIn = jest.fn((_user, cb: (err?: unknown) => void) => cb(loginErr));
    const req = {
      body: { username: 'alice', email: 'alice@example.com', password: 'abcd' },
      logIn,
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(loginErr);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for invalid input without calling passport.authenticate', () => {
    const req = { body: { username: '', password: '' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedAuthenticate).not.toHaveBeenCalled();
  });

  it('calls next with the error when passport.authenticate reports an err', () => {
    const authErr = new Error('strategy blew up');
    mockAuthenticateResult(authErr, false, undefined);
    const req = { body: { username: 'alice', password: 'abcd' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(next).toHaveBeenCalledWith(authErr);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 with info.message when authentication fails with info', () => {
    mockAuthenticateResult(null, false, { message: 'Invalid password' });
    const req = { body: { username: 'alice', password: 'wrong' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid password' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with the fallback message when authentication fails with no info', () => {
    mockAuthenticateResult(null, false, undefined);
    const req = { body: { username: 'alice', password: 'wrong' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
    expect(next).not.toHaveBeenCalled();
  });

  it('logs the user in and returns 200 on success', () => {
    const logIn = jest.fn((_user, cb: (err?: unknown) => void) => cb());
    mockAuthenticateResult(null, fakeUser, undefined);
    const req = { body: { username: 'alice', password: 'abcd' }, logIn } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(logIn).toHaveBeenCalledWith(fakeUser, expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });

  it('calls next with the error when req.logIn fails after successful authentication', () => {
    const loginErr = new Error('logIn failed');
    const logIn = jest.fn((_user, cb: (err?: unknown) => void) => cb(loginErr));
    mockAuthenticateResult(null, fakeUser, undefined);
    const req = { body: { username: 'alice', password: 'abcd' }, logIn } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    login(req, res, next);

    expect(next).toHaveBeenCalledWith(loginErr);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('returns 401 when not authenticated', () => {
    const req = {
      isAuthenticated: () => false,
    } as unknown as Request;
    const res = buildRes();

    logout(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('destroys the session and returns 200 when authenticated', () => {
    const logoutFn = jest.fn((cb: (err?: unknown) => void) => cb());
    const destroy = jest.fn((cb: (err?: unknown) => void) => cb());
    const req = {
      isAuthenticated: () => true,
      logout: logoutFn,
      session: { destroy },
    } as unknown as Request;
    const res = buildRes();

    logout(req, res, jest.fn());

    expect(logoutFn).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('calls next with the error and does not destroy the session when req.logout fails', () => {
    const logoutErr = new Error('logout failed');
    const logoutFn = jest.fn((cb: (err?: unknown) => void) => cb(logoutErr));
    const destroy = jest.fn((cb: (err?: unknown) => void) => cb());
    const req = {
      isAuthenticated: () => true,
      logout: logoutFn,
      session: { destroy },
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    logout(req, res, next);

    expect(next).toHaveBeenCalledWith(logoutErr);
    expect(destroy).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next with the error when session.destroy fails', () => {
    const destroyErr = new Error('destroy failed');
    const logoutFn = jest.fn((cb: (err?: unknown) => void) => cb());
    const destroy = jest.fn((cb: (err?: unknown) => void) => cb(destroyErr));
    const req = {
      isAuthenticated: () => true,
      logout: logoutFn,
      session: { destroy },
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    logout(req, res, next);

    expect(next).toHaveBeenCalledWith(destroyErr);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('me', () => {
  it('returns 401 when not authenticated', () => {
    const req = { isAuthenticated: () => false } as unknown as Request;
    const res = buildRes();

    me(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });

  it('returns the user when authenticated', () => {
    const req = { isAuthenticated: () => true, user: fakeUser } as unknown as Request;
    const res = buildRes();

    me(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });
});
