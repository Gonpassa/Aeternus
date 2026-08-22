import { Request, Response } from 'express';
import {
  listEntries,
  getEntry,
  getEntryByDate,
  getEntriesByRange,
  getJournalSummary,
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
  listEntriesByRange: jest.fn(),
  getJournalSummaryData: jest.fn(),
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

describe('getEntriesByRange', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for an invalid range without calling the db layer', async () => {
    const req = reqAs(7, { query: { start: 'not-a-date', end: '2026-08-31' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocked.listEntriesByRange).not.toHaveBeenCalled();
  });

  it('returns the range scoped to the requester as a bare array', async () => {
    mocked.listEntriesByRange.mockResolvedValue([fakeEntry]);
    const req = reqAs(7, { query: { start: '2026-08-01', end: '2026-08-31' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(mocked.listEntriesByRange).toHaveBeenCalledWith({
      userId: 7,
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([fakeEntry]);
  });

  it('returns an empty array with 200 when nothing matches', async () => {
    mocked.listEntriesByRange.mockResolvedValue([]);
    const req = reqAs(7, { query: { start: '2026-09-01', end: '2026-09-30' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
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

describe('getJournalSummary', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns recent entries, streak, and mood snapshot on the happy path', async () => {
    mocked.getJournalSummaryData.mockResolvedValue({
      recentEntries: [{ id: 1, date: '2026-08-01', title: 'A good day', primaryMood: 'happy' }],
      entryDates: ['2026-08-01'],
    });
    const req = reqAs(7, { query: { asOf: '2026-08-01' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      recentEntries: [{ id: 1, date: '2026-08-01', title: 'A good day', primaryMood: 'happy' }],
      streak: { current: 1 },
      moodSnapshot: { happy: 1, calm: 0, sad: 0, anxious: 0, angry: 0, steady: 0 },
    });
  });

  it('returns a uniform empty response for a user with zero entries', async () => {
    mocked.getJournalSummaryData.mockResolvedValue({ recentEntries: [], entryDates: [] });
    const req = reqAs(7, { query: { asOf: '2026-08-01' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      recentEntries: [],
      streak: { current: 0 },
      moodSnapshot: { happy: 0, calm: 0, sad: 0, anxious: 0, angry: 0, steady: 0 },
    });
  });

  it('breaks the streak at the first gap', async () => {
    mocked.getJournalSummaryData.mockResolvedValue({
      recentEntries: [],
      entryDates: ['2026-08-01', '2026-07-30'],
    });
    const req = reqAs(7, { query: { asOf: '2026-08-01' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ streak: { current: 1 } }));
  });

  it('stays unbroken across the asOf boundary when asOf has no entry yet', async () => {
    mocked.getJournalSummaryData.mockResolvedValue({
      recentEntries: [],
      entryDates: ['2026-08-01', '2026-07-31', '2026-07-30'],
    });
    const req = reqAs(7, { query: { asOf: '2026-08-02' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ streak: { current: 3 } }));
  });

  it('zero-fills mood keys absent from the recent set', async () => {
    mocked.getJournalSummaryData.mockResolvedValue({
      recentEntries: [
        { id: 1, date: '2026-08-01', title: 'Entry one', primaryMood: 'calm' },
        { id: 2, date: '2026-07-31', title: 'Entry two', primaryMood: 'calm' },
      ],
      entryDates: ['2026-08-01', '2026-07-31'],
    });
    const req = reqAs(7, { query: { asOf: '2026-08-01' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        moodSnapshot: { happy: 0, calm: 2, sad: 0, anxious: 0, angry: 0, steady: 0 },
      }),
    );
  });

  it('returns 400 for a malformed asOf without calling the db layer', async () => {
    const req = reqAs(7, { query: { asOf: 'not-a-date' } });
    const res = buildRes();

    await getJournalSummary(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocked.getJournalSummaryData).not.toHaveBeenCalled();
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
