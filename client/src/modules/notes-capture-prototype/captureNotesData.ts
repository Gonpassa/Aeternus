// PROTOTYPE - in-memory data for the capture prototype (issue #73). No API, no persistence:
// state lives in a useState store and resets on reload. Shapes follow the resolutions of
// #68 (Literature note: two-part Locator, own-words body, optional excerpt), #69 (Links),
// #70 (Source), #71 (Topics), plus the open-question flag decided in #67.
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
  // Flagged while reading as something left unresolved (#67). Cleared explicitly.
  openQuestion: boolean;
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

export interface CaptureInput {
  section: string | null;
  position: string | null;
  body: string;
  excerpt: string | null;
  openQuestion: boolean;
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
    {
      id: 'lit-1',
      sourceId: 'src-1',
      section: 'Ch. 1 Tideline',
      position: '12',
      body: 'The tideline is described as a boundary that moves twice a day, so any map of it is already a lie by the time it is printed.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(4, 21, 10),
    },
    {
      id: 'lit-2',
      sourceId: 'src-1',
      section: 'Ch. 1 Tideline',
      position: '19',
      body: 'Neap, spring, slack water: the vocabulary is about timing, not places. The coast is named by when, not where.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(4, 21, 32),
    },
    {
      id: 'lit-3',
      sourceId: 'src-1',
      section: 'Ch. 2 Mudflats',
      position: '41',
      body: 'Mud is treated as a character with intentions. It does not receive the tide, it negotiates with it.',
      excerpt: 'The mud does not merely receive the tide, it negotiates with it.',
      openQuestion: false,
      createdAt: daysAgo(1, 20, 5),
    },
    {
      id: 'lit-4',
      sourceId: 'src-1',
      section: 'Ch. 2 Mudflats',
      position: '47',
      body: 'Worms and bivalves are the mudflat’s architects: the surface texture is their work, not the water’s.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(1, 20, 24),
    },
    {
      id: 'lit-5',
      sourceId: 'src-1',
      section: 'Ch. 2 Mudflats',
      position: '52',
      body: 'Is the burrowing really what holds the flat together, or is that the author reaching for the agency move again? He does not say what happens where the worms are gone.',
      excerpt: null,
      openQuestion: true,
      createdAt: daysAgo(1, 20, 51),
    },
    {
      id: 'lit-6',
      sourceId: 'src-1',
      section: 'Ch. 3 Estuary',
      position: '63',
      body: 'The estuary chapter keeps circling back to thresholds: where fresh water gives up is not a line but a zone that breathes with the season.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(0, 8, 15),
    },
    {
      id: 'lit-7',
      sourceId: 'src-1',
      section: 'Ch. 3 Estuary',
      position: '71',
      body: 'Salinity gradients sort species the way a bookshelf sorts by height: crude, but everything ends up somewhere it can stand.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(0, 8, 40),
    },
    {
      id: 'lit-8',
      sourceId: 'src-2',
      section: null,
      position: 'para 6',
      body: 'A marsh is defined by how often it floods, not by how wet it is. Frequency, not quantity, is the classifier.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(1, 22, 40),
    },
    {
      id: 'lit-9',
      sourceId: 'src-3',
      section: 'Sediment sources',
      position: '12:30',
      body: 'A sediment budget is bookkeeping: inputs from rivers and cliffs, outputs to the deep shelf, and the beach is the running balance.',
      excerpt: null,
      openQuestion: false,
      createdAt: daysAgo(0, 13, 5),
    },
    {
      id: 'lit-10',
      sourceId: 'src-3',
      section: 'Sediment sources',
      position: '21:14',
      body: 'Cutting off one input (a dammed river) does not shrink the beach at once. The deficit shows up years later, downdrift.',
      excerpt: null,
      openQuestion: false,
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
      targetId: 'lit-8',
      reason: 'Frequency-as-classifier is lifted straight from here.',
    },
  ],
};

let nextId = 100;
const newId = (prefix: string) => {
  nextId += 1;
  return `${prefix}-${nextId}`;
};

export function useCaptureNotesStore() {
  const [state, setState] = useState<NotesState>(SEED);

  const addLiteratureNote = useCallback((sourceId: string, input: CaptureInput) => {
    const note: LiteratureNote = {
      ...input,
      sourceId,
      id: newId('lit'),
      createdAt: new Date(),
    };
    setState((s) => ({ ...s, literatureNotes: [...s.literatureNotes, note] }));
    return note;
  }, []);

  const updateLiteratureNote = useCallback((id: string, patch: Partial<CaptureInput>) => {
    setState((s) => ({
      ...s,
      literatureNotes: s.literatureNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  }, []);

  // Deleting a card takes its links with it: a link to a card that no longer exists is not a
  // connection, and the prototype has no undo to fall back on.
  const deleteLiteratureNote = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      literatureNotes: s.literatureNotes.filter((n) => n.id !== id),
      links: s.links.filter((l) => l.originId !== id && l.targetId !== id),
    }));
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
    () => ({
      state,
      addLiteratureNote,
      updateLiteratureNote,
      deleteLiteratureNote,
      addPermanentNote,
      addLink,
    }),
    [
      state,
      addLiteratureNote,
      updateLiteratureNote,
      deleteLiteratureNote,
      addPermanentNote,
      addLink,
    ],
  );
}

export type CaptureStore = ReturnType<typeof useCaptureNotesStore>;

// ---- Derived helpers (pure, over NotesState) ----

export const sourceById = (state: NotesState, id: string) =>
  state.sources.find((s) => s.id === id) as Source;

export const literatureById = (state: NotesState, id: string) =>
  state.literatureNotes.find((n) => n.id === id);

export const permanentById = (state: NotesState, id: string) =>
  state.permanentNotes.find((n) => n.id === id);

// The append-only reading stream: creation order, oldest first (#68).
export const notesForSource = (state: NotesState, sourceId: string) =>
  state.literatureNotes
    .filter((n) => n.sourceId === sourceId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

export const lastNoteFor = (state: NotesState, sourceId: string): LiteratureNote | null => {
  const notes = notesForSource(state, sourceId);
  return notes[notes.length - 1] ?? null;
};

// Section suggestions are the distinct sections of this Source's notes (#68), most
// recently used first, which is also the order a reader moves through them.
export const sectionsForSource = (state: NotesState, sourceId: string): string[] => {
  const seen: string[] = [];
  [...notesForSource(state, sourceId)].reverse().forEach((n) => {
    if (n.section && !seen.includes(n.section)) seen.push(n.section);
  });
  return seen;
};

export const openQuestionsFor = (state: NotesState, sourceId: string) =>
  notesForSource(state, sourceId).filter((n) => n.openQuestion);

export const linksOf = (state: NotesState, noteId: string) =>
  state.links.filter((l) => l.originId === noteId || l.targetId === noteId);

export const linkCount = (state: NotesState, noteId: string) => linksOf(state, noteId).length;

// Everything this note is already linked to, so the panel never offers a duplicate.
export const connectedIds = (state: NotesState, noteId: string) =>
  linksOf(state, noteId).map((l) => (l.originId === noteId ? l.targetId : l.originId));

// A digits-only position renders as "p. N" and is stored raw (#68).
export const renderPosition = (position: string | null) => {
  if (!position) return null;
  return /^\d+$/.test(position) ? `p. ${position}` : position;
};

export const renderLocator = (note: Pick<LiteratureNote, 'section' | 'position'>) =>
  [note.section, renderPosition(note.position)].filter(Boolean).join(' · ');

export const openingWords = (body: string, words = 9) => {
  const parts = body.split(/\s+/);
  const head = parts.slice(0, words).join(' ');
  return parts.length > words ? `${head}…` : head;
};

export const timeLabel = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const dayLabel = (date: Date) => {
  const today = dayKey(new Date());
  const yesterday = dayKey(daysAgo(1, 12));
  const key = dayKey(date);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

export interface NoteIdentity {
  kind: 'literature' | 'permanent';
  id: string;
  // The one-line name a note goes by away from its home (#68/#69).
  headline: string;
  // A second line: the opening words for a Literature note, nothing for a Permanent one.
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

export const topicsOf = (state: NotesState, noteId: string): string[] => {
  const lit = literatureById(state, noteId);
  if (lit) return sourceById(state, lit.sourceId).topics;
  return permanentById(state, noteId)?.topics ?? [];
};

// The browsable link panel's three groups (#67): this Source's other notes, then notes
// sharing a Topic, then full-text search. No dropdown that depends on remembered wording.
export const sameSourceCandidates = (state: NotesState, noteId: string) => {
  const lit = literatureById(state, noteId);
  if (!lit) return [];
  return notesForSource(state, lit.sourceId)
    .filter((n) => n.id !== noteId)
    .reverse()
    .map((n) => identify(state, n.id));
};

export const sameTopicCandidates = (state: NotesState, noteId: string) => {
  const topics = new Set(topicsOf(state, noteId));
  const lit = literatureById(state, noteId);
  return [
    ...state.permanentNotes.map((p) => p.id),
    ...state.literatureNotes.filter((n) => n.sourceId !== lit?.sourceId).map((n) => n.id),
  ]
    .filter((id) => id !== noteId && topicsOf(state, id).some((t) => topics.has(t)))
    .map((id) => identify(state, id));
};

export const searchCandidates = (state: NotesState, query: string, noteId: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return [...state.permanentNotes.map((p) => p.id), ...state.literatureNotes.map((n) => n.id)]
    .filter((id) => id !== noteId)
    .map((id) => identify(state, id))
    .filter((n) => `${n.headline} ${n.detail ?? ''}`.toLowerCase().includes(q))
    .slice(0, 8);
};

export interface Connection {
  link: NoteLink;
  other: NoteIdentity;
}

// Both directions at once. The reading page only needs "what is this tied to", not the
// Connects to / Connected from split that a note's own connections view uses (#69).
export const connectionsOf = (state: NotesState, noteId: string): Connection[] =>
  linksOf(state, noteId).map((link) => ({
    link,
    other: identify(state, link.originId === noteId ? link.targetId : link.originId),
  }));

// Permanent notes written from this Literature note, so the reading page can show what
// came of it without leaving for Review.
export const permanentsFor = (state: NotesState, noteId: string) =>
  connectionsOf(state, noteId)
    .filter((c) => c.other.kind === 'permanent')
    .map((c) => c.other);

export const KIND_LABEL: Record<SourceKind, string> = {
  book: 'Book',
  article: 'Article',
  video: 'Video',
  other: 'Other',
};

export const linkLabel = (state: NotesState, id: string): string => {
  const n = linkCount(state, id);
  return `${n} ${n === 1 ? 'link' : 'links'}`;
};
