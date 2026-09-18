// PROTOTYPE - in-memory data for the Notes pages prototype (issue #67). No API, no
// persistence: state lives in a useState store and resets on reload. The shapes follow
// the resolutions of #68 (Literature note), #69 (Links), #70 (Source), #71 (Topics).
import { useCallback, useMemo, useState } from 'react';

export type SourceKind = 'book' | 'article' | 'video' | 'other';

export interface Source {
  id: string;
  title: string;
  kind: SourceKind;
  author: string | null;
  url: string | null;
  topics: string[];
}

export interface LiteratureNote {
  id: string;
  sourceId: string;
  section: string | null;
  position: string | null;
  body: string;
  excerpt: string | null;
  createdAt: Date;
}

export interface PermanentNote {
  id: string;
  title: string;
  body: string;
  topics: string[];
  createdAt: Date;
}

export interface NoteLink {
  id: string;
  originId: string;
  targetId: string;
  reason: string;
}

export interface NotesState {
  sources: Source[];
  literatureNotes: LiteratureNote[];
  permanentNotes: PermanentNote[];
  links: NoteLink[];
  topics: string[];
}

export interface LinkDraft {
  targetId: string;
  reason: string;
}

const daysAgo = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const SEED: NotesState = {
  topics: ['Coastlines', 'Agency', 'Thresholds', 'Sediment', 'Craft'],
  sources: [
    {
      id: 'src-1',
      title: 'The Living Coast',
      kind: 'book',
      author: 'M. Aldous',
      url: null,
      topics: ['Coastlines', 'Agency'],
    },
    {
      id: 'src-2',
      title: 'Salt marshes are not wetlands',
      kind: 'article',
      author: 'R. Okafor',
      url: 'https://example.org/salt-marshes',
      topics: ['Coastlines', 'Thresholds'],
    },
    {
      id: 'src-3',
      title: 'Sediment budgets, lecture 4',
      kind: 'video',
      author: null,
      url: 'https://example.org/sediment-4',
      topics: ['Sediment'],
    },
    {
      id: 'src-4',
      title: 'Notes on Sediment',
      kind: 'book',
      author: 'H. Vasquez',
      url: null,
      topics: ['Sediment', 'Craft'],
    },
  ],
  literatureNotes: [
    // Four days ago: two notes from the book.
    {
      id: 'lit-1',
      sourceId: 'src-1',
      section: 'Ch. 1 Tideline',
      position: '12',
      body: 'The tideline is described as a boundary that moves twice a day, so any map of it is already a lie by the time it is printed.',
      excerpt: null,
      createdAt: daysAgo(4, 21, 10),
    },
    {
      id: 'lit-2',
      sourceId: 'src-1',
      section: 'Ch. 1 Tideline',
      position: '19',
      body: 'Neap, spring, slack water: the vocabulary is about timing, not places. The coast is named by when, not where.',
      excerpt: null,
      createdAt: daysAgo(4, 21, 32),
    },
    // Yesterday: three notes across two Sources.
    {
      id: 'lit-3',
      sourceId: 'src-1',
      section: 'Ch. 2 Mudflats',
      position: '41',
      body: 'Mud is treated as a character with intentions. It does not receive the tide, it negotiates with it.',
      excerpt: 'The mud does not merely receive the tide, it negotiates with it.',
      createdAt: daysAgo(1, 20, 5),
    },
    {
      id: 'lit-4',
      sourceId: 'src-1',
      section: 'Ch. 2 Mudflats',
      position: '47',
      body: 'Worms and bivalves are the mudflat’s architects: the surface texture is their work, not the water’s.',
      excerpt: null,
      createdAt: daysAgo(1, 20, 24),
    },
    {
      id: 'lit-5',
      sourceId: 'src-2',
      section: null,
      position: 'para 6',
      body: 'A marsh is defined by how often it floods, not by how wet it is. Frequency, not quantity, is the classifier.',
      excerpt: null,
      createdAt: daysAgo(1, 22, 40),
    },
    // Today: four notes across two Sources. This is the sitting that has not been sat with.
    {
      id: 'lit-6',
      sourceId: 'src-1',
      section: 'Ch. 3 Estuary',
      position: '63',
      body: 'The estuary chapter keeps circling back to thresholds: where fresh water gives up is not a line but a zone that breathes with the season.',
      excerpt: null,
      createdAt: daysAgo(0, 8, 15),
    },
    {
      id: 'lit-7',
      sourceId: 'src-1',
      section: 'Ch. 3 Estuary',
      position: '71',
      body: 'Salinity gradients sort species the way a bookshelf sorts by height: crude, but everything ends up somewhere it can stand.',
      excerpt: null,
      createdAt: daysAgo(0, 8, 40),
    },
    {
      id: 'lit-8',
      sourceId: 'src-3',
      section: 'Sediment sources',
      position: '12:30',
      body: 'A sediment budget is bookkeeping: inputs from rivers and cliffs, outputs to the deep shelf, and the beach is the running balance.',
      excerpt: null,
      createdAt: daysAgo(0, 13, 5),
    },
    {
      id: 'lit-9',
      sourceId: 'src-3',
      section: 'Sediment sources',
      position: '21:14',
      body: 'Cutting off one input (a dammed river) does not shrink the beach at once. The deficit shows up years later, downdrift.',
      excerpt: null,
      createdAt: daysAgo(0, 13, 28),
    },
  ],
  permanentNotes: [
    {
      id: 'perm-1',
      title: 'A coastline is a schedule, not a shape.',
      body: 'Everything the book calls a place (tideline, marsh, mudflat) is really defined by a rhythm. If I want to describe a coast honestly I should describe when things happen to it, and let the where follow.',
      topics: ['Coastlines', 'Thresholds'],
      createdAt: daysAgo(3, 9, 0),
    },
    {
      id: 'perm-2',
      title: 'Giving a material agency is a craft move, not a scientific claim.',
      body: 'When the author lets mud negotiate, the sentence gets a subject that can want things. That is why the prose works. It is stealable for the essay as long as I do not confuse it with an explanation.',
      topics: ['Agency', 'Craft'],
      createdAt: daysAgo(1, 23, 10),
    },
    {
      id: 'perm-3',
      title: 'Classifying by frequency beats classifying by amount.',
      body: 'The marsh article sorts by how often, not how much. The same rule would fix how I sort journal entries: by cadence of return rather than by length.',
      topics: ['Thresholds'],
      createdAt: daysAgo(1, 23, 30),
    },
  ],
  links: [
    {
      id: 'link-1',
      originId: 'perm-1',
      targetId: 'lit-2',
      reason: 'The timing vocabulary is the evidence for the claim.',
    },
    {
      id: 'link-2',
      originId: 'perm-1',
      targetId: 'lit-1',
      reason: 'A moving boundary is the first hint that place is the wrong frame.',
    },
    {
      id: 'link-3',
      originId: 'perm-2',
      targetId: 'lit-3',
      reason: 'The negotiating-mud sentence is the example this is built on.',
    },
    {
      id: 'link-4',
      originId: 'perm-2',
      targetId: 'perm-1',
      reason: 'Both are about the frame the author chooses, not the facts.',
    },
    {
      id: 'link-5',
      originId: 'perm-3',
      targetId: 'lit-5',
      reason: 'Frequency-as-classifier is lifted straight from here.',
    },
    {
      id: 'link-6',
      originId: 'perm-3',
      targetId: 'perm-1',
      reason: 'A schedule is a frequency claim about a place.',
    },
  ],
};

let nextId = 100;
const newId = (prefix: string) => {
  nextId += 1;
  return `${prefix}-${nextId}`;
};

export function useNotesPrototypeStore() {
  const [state, setState] = useState<NotesState>(SEED);

  const addSource = useCallback((input: Omit<Source, 'id'>) => {
    const source: Source = { ...input, id: newId('src') };
    setState((s) => ({
      ...s,
      sources: [...s.sources, source],
      topics: [...new Set([...s.topics, ...input.topics])],
    }));
    return source;
  }, []);

  const addLiteratureNote = useCallback((input: Omit<LiteratureNote, 'id' | 'createdAt'>) => {
    const note: LiteratureNote = { ...input, id: newId('lit'), createdAt: new Date() };
    setState((s) => ({ ...s, literatureNotes: [...s.literatureNotes, note] }));
    return note;
  }, []);

  const addPermanentNote = useCallback(
    (input: Omit<PermanentNote, 'id' | 'createdAt'>, linkDrafts: LinkDraft[]) => {
      const note: PermanentNote = { ...input, id: newId('perm'), createdAt: new Date() };
      const links: NoteLink[] = linkDrafts.map((d) => ({
        id: newId('link'),
        originId: note.id,
        targetId: d.targetId,
        reason: d.reason,
      }));
      setState((s) => ({
        ...s,
        permanentNotes: [...s.permanentNotes, note],
        links: [...s.links, ...links],
        topics: [...new Set([...s.topics, ...input.topics])],
      }));
      return note;
    },
    [],
  );

  const addLink = useCallback((originId: string, targetId: string, reason: string) => {
    setState((s) => {
      const exists = s.links.some(
        (l) =>
          (l.originId === originId && l.targetId === targetId) ||
          (l.originId === targetId && l.targetId === originId),
      );
      if (exists) return s;
      return { ...s, links: [...s.links, { id: newId('link'), originId, targetId, reason }] };
    });
  }, []);

  return useMemo(
    () => ({ state, addSource, addLiteratureNote, addPermanentNote, addLink }),
    [state, addSource, addLiteratureNote, addPermanentNote, addLink],
  );
}

export type NotesStore = ReturnType<typeof useNotesPrototypeStore>;

// ---- Derived helpers (pure, over NotesState) ----

export const sourceById = (state: NotesState, id: string) =>
  state.sources.find((s) => s.id === id) as Source;

export const literatureById = (state: NotesState, id: string) =>
  state.literatureNotes.find((n) => n.id === id);

export const permanentById = (state: NotesState, id: string) =>
  state.permanentNotes.find((n) => n.id === id);

export const notesForSource = (state: NotesState, sourceId: string) =>
  state.literatureNotes
    .filter((n) => n.sourceId === sourceId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

export const lastNoteDate = (state: NotesState, sourceId: string): Date | null => {
  const notes = notesForSource(state, sourceId);
  return notes.length ? (notes[notes.length - 1] as LiteratureNote).createdAt : null;
};

// The #70 candidate ordering: most recent Literature note first, Sources without notes last.
export const sourcesByRecency = (state: NotesState) =>
  [...state.sources].sort((a, b) => {
    const da = lastNoteDate(state, a.id)?.getTime() ?? -1;
    const db = lastNoteDate(state, b.id)?.getTime() ?? -1;
    return db - da;
  });

export const linkCount = (state: NotesState, noteId: string) =>
  state.links.filter((l) => l.originId === noteId || l.targetId === noteId).length;

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface Sitting {
  key: string;
  date: Date;
  notes: LiteratureNote[];
  // Permanent notes that link to any Literature note of this sitting.
  written: PermanentNote[];
}

// A sitting is one calendar day's Literature notes, read off createdAt (#68). Newest first.
export const sittings = (state: NotesState): Sitting[] => {
  const byDay = new Map<string, LiteratureNote[]>();
  state.literatureNotes.forEach((n) => {
    const key = dayKey(n.createdAt);
    byDay.set(key, [...(byDay.get(key) ?? []), n]);
  });
  return [...byDay.entries()]
    .map(([key, notes]) => {
      const sorted = [...notes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const ids = new Set(sorted.map((n) => n.id));
      const written = state.permanentNotes.filter((p) =>
        state.links.some(
          (l) =>
            (l.originId === p.id && ids.has(l.targetId)) ||
            (l.targetId === p.id && ids.has(l.originId)),
        ),
      );
      return { key, date: (sorted[0] as LiteratureNote).createdAt, notes: sorted, written };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const sittingLabel = (date: Date) => {
  const today = dayKey(new Date());
  const yesterday = dayKey(daysAgo(1, 12));
  const key = dayKey(date);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const renderLocator = (note: Pick<LiteratureNote, 'section' | 'position'>) => {
  const position =
    note.position && /^\d+$/.test(note.position) ? `p. ${note.position}` : note.position;
  return [note.section, position].filter(Boolean).join(' · ');
};

export const openingWords = (body: string, words = 7) => {
  const parts = body.split(/\s+/);
  const head = parts.slice(0, words).join(' ');
  return parts.length > words ? `${head}…` : head;
};

export interface NoteIdentity {
  kind: 'literature' | 'permanent';
  id: string;
  // The one-line name a note goes by away from its home (#68/#69).
  headline: string;
  // A second line: Locator for a Literature note, nothing for a Permanent one.
  detail: string | null;
}

export const identify = (state: NotesState, noteId: string): NoteIdentity => {
  const lit = literatureById(state, noteId);
  if (lit) {
    return {
      kind: 'literature',
      id: lit.id,
      headline: `${sourceById(state, lit.sourceId).title}, ${renderLocator(lit)}`,
      detail: openingWords(lit.body),
    };
  }
  const perm = permanentById(state, noteId) as PermanentNote;
  return { kind: 'permanent', id: perm.id, headline: perm.title, detail: null };
};

export interface Connection {
  link: NoteLink;
  other: NoteIdentity;
}

export const connectionsOf = (state: NotesState, noteId: string) => ({
  connectsTo: state.links
    .filter((l) => l.originId === noteId)
    .map((link) => ({ link, other: identify(state, link.targetId) })),
  connectedFrom: state.links
    .filter((l) => l.targetId === noteId)
    .map((link) => ({ link, other: identify(state, link.originId) })),
});

export const searchNotes = (state: NotesState, query: string, exclude: Set<string>) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = [
    ...state.permanentNotes.map((p) => p.id),
    ...state.literatureNotes.map((l) => l.id),
  ].filter((id) => !exclude.has(id));
  return all
    .map((id) => identify(state, id))
    .filter((n) => `${n.headline} ${n.detail ?? ''}`.toLowerCase().includes(q))
    .slice(0, 6);
};

export const KIND_LABEL: Record<SourceKind, string> = {
  book: 'Book',
  article: 'Article',
  video: 'Video',
  other: 'Other',
};

export function linkLabel(state: NotesState, id: string): string {
  const n = linkCount(state, id);
  return `${n} ${n === 1 ? 'link' : 'links'}`;
}
