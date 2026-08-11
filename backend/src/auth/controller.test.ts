import { Request, Response, NextFunction } from 'express';
import { register, logout, me } from './controller';
import * as userService from '../db/users';
import { DuplicateUserError } from '../db/users';

jest.mock('../db/users', () => ({
  ...jest.requireActual('../db/users'),
  createUser: jest.fn(),
}));

const mockedCreateUser = userService.createUser as jest.MockedFunction<
  typeof userService.createUser
>;

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
