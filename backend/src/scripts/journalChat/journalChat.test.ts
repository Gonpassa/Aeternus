import { mkdtemp, readFile, stat } from 'fs/promises';
import os from 'os';
import path from 'path';
import { runTurn } from './conversation';
import { assertLocalModel, ChatMessage, StreamChat } from './ollama';
import { assertLoopbackUrl } from './pull';
import { htmlToText, JournalEntry, JournalSnapshot, writeSnapshot } from './snapshot';
import { runTool } from './tools';

const entry = (date: string, title: string, mood: string, text: string): JournalEntry => ({
  date,
  title,
  mood,
  emotion: null,
  text,
});

const ENTRIES = [
  entry('2026-01-01', 'New year', 'happy', 'Fireworks with friends.'),
  entry('2026-01-02', 'Worry', 'anxious', 'Could not sleep before the review.'),
  entry('2026-02-01', 'Sleep again', 'anxious', 'Slept badly, worry about the review.'),
];

describe('htmlToText', () => {
  it('keeps paragraph breaks, list markers and literal characters', () => {
    expect(htmlToText('<p>Tom &amp; me</p><ul><li>a &lt; b</li></ul>')).toBe('Tom & me\n- a < b');
  });
});

describe('writeSnapshot', () => {
  it('creates a file only the owner can read', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'journal-chat-'));
    const file = path.join(dir, 'nested', 'snapshot.json');
    await writeSnapshot({ pulledAt: 'now', entries: ENTRIES }, file);

    expect((await stat(file)).mode % 0o1000).toBe(0o600);
    expect((await stat(path.dirname(file))).mode % 0o1000).toBe(0o700);
    expect(JSON.parse(await readFile(file, 'utf8')).entries).toHaveLength(3);
  });
});

describe('assertLoopbackUrl', () => {
  it('accepts a tunnel and refuses a remote host', () => {
    expect(() => assertLoopbackUrl('postgres://u:p@localhost:5433/db')).not.toThrow();
    expect(() => assertLoopbackUrl('postgres://u:p@db.example.com:5432/db')).toThrow(/localhost/);
  });
});

describe('assertLocalModel', () => {
  const mockShow = (body: object): void => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(body)));
  };

  it('accepts a local model with tools', async () => {
    mockShow({ capabilities: ['tools'] });
    await expect(assertLocalModel('qwen')).resolves.toBeUndefined();
  });

  it('refuses a model served remotely', async () => {
    mockShow({ capabilities: ['tools'], remote_host: 'https://ollama.com' });
    await expect(assertLocalModel('qwen')).rejects.toThrow(/cloud/);
  });

  it('refuses a model without tool calling', async () => {
    mockShow({ capabilities: ['completion'] });
    await expect(assertLocalModel('qwen')).rejects.toThrow(/tool calling/);
  });
});

describe('runTool', () => {
  it('lists newest first and filters by mood and date', () => {
    const result = runTool(ENTRIES, 'list_entries', { mood: 'anxious', from: '2026-01-15' });
    expect(result).toBe('2026-02-01 | Sleep again | anxious');
  });

  it('ranks entries matching more terms first, case-insensitively', () => {
    const result = runTool(ENTRIES, 'search_entries', { terms: ['WORRY', 'slept'] });
    expect(result.indexOf('2026-02-01')).toBeLessThan(result.indexOf('2026-01-02'));
    expect(result).not.toContain('2026-01-01');
  });

  it('reads full text and reports a missing date', () => {
    const result = runTool(ENTRIES, 'read_entries', { dates: ['2026-01-01', '2026-03-03'] });
    expect(result).toContain('Fireworks with friends.');
    expect(result).toContain('2026-03-03 | no entry on this date');
  });
});

describe('runTurn', () => {
  const snapshot: JournalSnapshot = { pulledAt: 'now', entries: ENTRIES };
  const handlers = { onText: jest.fn(), onToolCall: jest.fn() };
  const search = {
    function: { name: 'search_entries', arguments: { terms: ['review'] } },
  };

  it('feeds tool results back until the model answers', async () => {
    const chat = jest
      .fn<ReturnType<StreamChat>, Parameters<StreamChat>>()
      .mockResolvedValueOnce({ role: 'assistant', content: '', tool_calls: [search] })
      .mockResolvedValueOnce({ role: 'assistant', content: 'You worried about it.' });
    const messages: ChatMessage[] = [{ role: 'user', content: 'What about the review?' }];

    await runTurn(messages, snapshot, chat, handlers);

    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    expect(messages[2]?.content).toContain('2026-02-01');
  });

  it('withholds tools eventually so a looping model must answer', async () => {
    const chat = jest.fn<ReturnType<StreamChat>, Parameters<StreamChat>>(async (_m, tools) =>
      tools.length > 0
        ? { role: 'assistant', content: '', tool_calls: [search] }
        : { role: 'assistant', content: 'Done.' },
    );

    await runTurn([{ role: 'user', content: 'Loop' }], snapshot, chat, handlers);

    expect(chat.mock.calls.at(-1)?.[1]).toEqual([]);
  });
});
