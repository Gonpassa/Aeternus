/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 *
 * Three variants of the Dream Analysis experience (symbol tagging + associations
 * from issue #48, analytic/synthetic passes from issue #49), switchable via
 * `?variant=` on the throwaway /dreams/prototype-analysis route.
 *
 * All state is in-memory; mutations are local-state stubs. No API calls.
 */

export type PAnchor = {
  id: string;
  /** Index into the narrative paragraphs array. */
  paragraphIndex: number;
  /** Character offsets within the paragraph's plain text. */
  start: number;
  end: number;
  createdAt: string;
};

export type PEmotionalBeat = {
  id: string;
  anchorId: string;
  label: string;
  createdAt: string;
};

export type PSymbolAttachment = {
  id: string;
  anchorId: string;
  symbolName: string;
  createdAt: string;
};

export type PAssociation = {
  id: string;
  symbolAttachmentId: string;
  content: string;
  kind: 'personal' | 'cultural';
  createdAt: string;
};

export type PAnalysisPass = {
  id: string;
  type: 'analytic' | 'synthetic';
  anchorId: string | null;
  content: string;
  createdAt: string;
};

export type PDreamState = {
  date: string;
  paragraphs: string[];
  anchors: PAnchor[];
  beats: PEmotionalBeat[];
  symbolAttachments: PSymbolAttachment[];
  associations: PAssociation[];
  passes: PAnalysisPass[];
  /** The user's prior symbol vocabulary (for autocomplete). */
  symbolVocabulary: string[];
};

let idCounter = 100;
export const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}`;

export const initialDream: PDreamState = {
  date: '2026-09-04',
  paragraphs: [
    'I am standing in the house I grew up in, but the hallway is longer than it should be, stretching past doors I do not recognize. The wallpaper is my grandmother’s, the faded green one, and I can hear water running somewhere behind the walls.',
    'At the end of the hallway there is a staircase going down that was never there. I descend and find a flooded cellar. The water is dark but not frightening — it is warm, and something silver moves under the surface. I understand, in the dream, that I am supposed to catch it with my bare hands.',
    'A man I do not know is sitting on the cellar steps, watching me. He is wearing my father’s coat. He says nothing, but I feel he disapproves of the fishing. I wake just as my fingers close around the silver thing.',
  ],
  anchors: [
    {
      id: 'anchor-1',
      paragraphIndex: 0,
      start: 188,
      end: 239,
      createdAt: '2026-09-04T21:14:00Z',
    },
    {
      id: 'anchor-2',
      paragraphIndex: 1,
      start: 117,
      end: 213,
      createdAt: '2026-09-04T21:20:00Z',
    },
    {
      id: 'anchor-3',
      paragraphIndex: 2,
      start: 71,
      end: 95,
      createdAt: '2026-09-06T09:03:00Z',
    },
  ],
  beats: [
    {
      id: 'beat-1',
      anchorId: 'anchor-1',
      label: 'uneasy familiarity',
      createdAt: '2026-09-04T21:14:00Z',
    },
    {
      id: 'beat-2',
      anchorId: 'anchor-2',
      label: 'calm anticipation',
      createdAt: '2026-09-04T21:20:00Z',
    },
    {
      id: 'beat-3',
      anchorId: 'anchor-3',
      label: 'watched, judged',
      createdAt: '2026-09-06T09:03:00Z',
    },
  ],
  symbolAttachments: [
    {
      id: 'sa-1',
      anchorId: 'anchor-2',
      symbolName: 'Water',
      createdAt: '2026-09-06T09:05:00Z',
    },
    {
      id: 'sa-2',
      anchorId: 'anchor-3',
      symbolName: 'Unknown man',
      createdAt: '2026-09-06T09:10:00Z',
    },
  ],
  associations: [
    {
      id: 'assoc-1',
      symbolAttachmentId: 'sa-1',
      kind: 'personal',
      content:
        'The lake house summers — the only place I remember feeling unhurried. Warm dark water reads as inviting, not dangerous, which surprises me.',
      createdAt: '2026-09-06T09:06:00Z',
    },
    {
      id: 'assoc-2',
      symbolAttachmentId: 'sa-1',
      kind: 'cultural',
      content:
        'Water as the unconscious itself in the Jungian reading; fishing as retrieving contents from it.',
      createdAt: '2026-09-06T09:07:00Z',
    },
    {
      id: 'assoc-3',
      symbolAttachmentId: 'sa-2',
      kind: 'personal',
      content:
        'He wears my father’s coat but is not my father — authority without a face. The disapproval felt older than any specific person.',
      createdAt: '2026-09-06T09:11:00Z',
    },
  ],
  passes: [
    {
      id: 'pass-1',
      type: 'analytic',
      anchorId: 'anchor-2',
      content:
        'The flooded cellar sits directly under the childhood house — material from that period, submerged but warm. The instruction to fish bare-handed suggests the retrieval has to be direct, unmediated by tools or method.',
      createdAt: '2026-09-06T09:20:00Z',
    },
    {
      id: 'pass-2',
      type: 'synthetic',
      anchorId: null,
      content:
        'Read forward, the dream compensates a week spent entirely in planning mode: it insists the valuable thing is caught by hand, in the dark, under the watchful disapproval of an inherited authority I no longer need to obey. The dream ends at the moment of contact — the catch itself is what waking life is being pointed toward.',
      createdAt: '2026-09-07T08:41:00Z',
    },
  ],
  symbolVocabulary: [
    'Water',
    'Unknown man',
    'House',
    'Staircase',
    'Fish',
    'Grandmother',
    'Coat',
    'Mirror',
  ],
};

export const anchorExcerpt = (dream: PDreamState, anchor: PAnchor): string => {
  const paragraph = dream.paragraphs[anchor.paragraphIndex] ?? '';
  return paragraph.slice(anchor.start, anchor.end);
};

export const formatStamp = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
