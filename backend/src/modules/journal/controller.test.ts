import { Request, Response } from 'express';
import {
  listEntries,
  getEntry,
  getEntryByDate,
  createEntry,
  updateEntry,
  deleteEntry,
} from './controller';
import * as entryService from '../../db/entries';
import { DuplicateEntryError } from '../../db/entries';

jest.mock('../../db/entries', () => ({
  ...jest.requireActual('../../db/entries'),
  createEntry: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  findEntryById: jest.fn(),
  findEntryByDate: jest.fn(),
  listEntriesByUser: jest.fn(),
}));

const mocked = entryService as jest.Mocked<typeof entryService>;

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

const fakeEntry = {
  id: 1,
  userId: 7,
  date: '2026-08-01',
  title: 'A good day',
  primaryMood: 'happy' as const,
  specificEmotion: 'content' as const,
  content: '<p>Hello</p>',
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
};

const reqAs = (userId: number, overrides: Partial<Request> = {}): Request =>
  ({ user: { id: userId }, params: {}, query: {}, body: {}, ...overrides }) as unknown as Request;

describe('listEntries', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns a paginated envelope scoped to the requester', async () => {
    mocked.listEntriesByUser.mockResolvedValue({ entries: [fakeEntry], total: 1 });
    const req = reqAs(7, { query: { page: '2', pageSize: '5' } });
    const res = buildRes();

    await listEntries(req, res, jest.fn());

    expect(mocked.listEntriesByUser).toHaveBeenCalledWith({ userId: 7, page: 2, pageSize: 5 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entries: [fakeEntry], page: 2, pageSize: 5, total: 1 });
  });
});

describe('getEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.findEntryById.mockResolvedValue(undefined);
    const req = reqAs(7, { params: { id: '99' } });
    const res = buildRes();

    await getEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the entry on success', async () => {
    mocked.findEntryById.mockResolvedValue(fakeEntry);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await getEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entry: fakeEntry });
  });
});

describe('getEntryByDate', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when no entry exists for the date', async () => {
    mocked.findEntryByDate.mockResolvedValue(undefined);
    const req = reqAs(7, { params: { date: '2026-08-01' } });
    const res = buildRes();

    await getEntryByDate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('createEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for invalid input without calling the db layer', async () => {
    const req = reqAs(7, { body: {} });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocked.createEntry).not.toHaveBeenCalled();
  });

  it('returns 409 when the db layer reports a duplicate date', async () => {
    mocked.createEntry.mockRejectedValue(
      new DuplicateEntryError('An entry already exists for this date'),
    );
    const req = reqAs(7, {
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p>',
      },
    });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('sanitizes content and returns 201 on success', async () => {
    mocked.createEntry.mockResolvedValue(fakeEntry);
    const req = reqAs(7, {
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p><script>alert(1)</script>',
      },
    });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(mocked.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, content: '<p>Hi</p>' }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.updateEntry.mockResolvedValue(undefined);
    const req = reqAs(7, {
      params: { id: '1' },
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p>',
      },
    });
    const res = buildRes();

    await updateEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.deleteEntry.mockResolvedValue(false);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await deleteEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 204 on success', async () => {
    mocked.deleteEntry.mockResolvedValue(true);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await deleteEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
