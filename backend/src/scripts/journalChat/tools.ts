import { JournalEntry } from './snapshot';

const MAX_LISTED = 200;
const MAX_SEARCH_RESULTS = 20;
const MAX_READ = 10;
const SNIPPET_RADIUS = 120;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_entries',
      description:
        'List journal entries as date, title and mood, newest first. Use to see what exists in a period or with a mood.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Earliest date, YYYY-MM-DD' },
          to: { type: 'string', description: 'Latest date, YYYY-MM-DD' },
          mood: { type: 'string', description: 'happy, calm, sad, anxious, angry or steady' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_entries',
      description:
        'Find entries containing any of the given words, best matches first, with a snippet of each. Matching is literal, so include synonyms and related words.',
      parameters: {
        type: 'object',
        properties: {
          terms: { type: 'array', items: { type: 'string' } },
          from: { type: 'string', description: 'Earliest date, YYYY-MM-DD' },
          to: { type: 'string', description: 'Latest date, YYYY-MM-DD' },
        },
        required: ['terms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_entries',
      description: `Read the full text of entries by date, up to ${MAX_READ} at a time.`,
      parameters: {
        type: 'object',
        properties: { dates: { type: 'array', items: { type: 'string' } } },
        required: ['dates'],
      },
    },
  },
];

type Args = Record<string, unknown>;

const stringArg = (args: Args, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const stringsArg = (args: Args, key: string): string[] => {
  const value = args[key];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return typeof value === 'string' ? [value] : [];
};

const inRange = (entry: JournalEntry, args: Args): boolean => {
  const from = stringArg(args, 'from');
  const to = stringArg(args, 'to');
  return (!from || entry.date >= from) && (!to || entry.date <= to);
};

const heading = (entry: JournalEntry): string =>
  `${entry.date} | ${entry.title} | ${entry.mood}${entry.emotion ? ` (${entry.emotion})` : ''}`;

const listEntries = (entries: JournalEntry[], args: Args): string => {
  const mood = stringArg(args, 'mood');
  const matches = entries
    .filter((entry) => inRange(entry, args) && (!mood || entry.mood === mood))
    .reverse();
  if (matches.length === 0) return 'No entries match.';
  const shown = matches.slice(0, MAX_LISTED).map(heading).join('\n');
  return matches.length > MAX_LISTED
    ? `${shown}\n(${matches.length - MAX_LISTED} older matches not shown; narrow the dates.)`
    : shown;
};

const snippet = (text: string, position: number): string => {
  const start = Math.max(0, position - SNIPPET_RADIUS);
  const end = Math.min(text.length, position + SNIPPET_RADIUS);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
};

const searchEntries = (entries: JournalEntry[], args: Args): string => {
  const terms = stringsArg(args, 'terms').map((term) => term.toLowerCase());
  if (terms.length === 0) return 'Give at least one search term.';

  const scored = entries
    .filter((entry) => inRange(entry, args))
    .map((entry) => {
      const haystack = `${entry.title}\n${entry.text}`.toLowerCase();
      const hits = terms.map((term) => haystack.indexOf(term)).filter((index) => index >= 0);
      return { entry, score: hits.length, position: Math.min(...hits) - entry.title.length - 1 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.entry.date.localeCompare(a.entry.date));

  if (scored.length === 0) return 'No entries contain those words. Try related words.';
  return scored
    .slice(0, MAX_SEARCH_RESULTS)
    .map(
      ({ entry, position }) => `${heading(entry)}\n${snippet(entry.text, Math.max(0, position))}`,
    )
    .join('\n\n');
};

const readEntries = (entries: JournalEntry[], args: Args): string => {
  const dates = stringsArg(args, 'dates').slice(0, MAX_READ);
  if (dates.length === 0) return 'Give at least one date.';
  return dates
    .map((date) => {
      const entry = entries.find((candidate) => candidate.date === date);
      return entry ? `${heading(entry)}\n${entry.text}` : `${date} | no entry on this date`;
    })
    .join('\n\n---\n\n');
};

export const runTool = (entries: JournalEntry[], name: string, args: Args): string => {
  switch (name) {
    case 'list_entries':
      return listEntries(entries, args);
    case 'search_entries':
      return searchEntries(entries, args);
    case 'read_entries':
      return readEntries(entries, args);
    default:
      return `Unknown tool: ${name}`;
  }
};
