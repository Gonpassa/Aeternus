/** PROTOTYPE — throwaway code, never ship. In-memory state + mutation stubs. */
import { useState } from 'react';

import { initialDream, nextId, type PAnchor, type PDreamState } from './prototypeData';

export type PrototypeDreamApi = {
  dream: PDreamState;
  /** Creates an anchor for a selected range (or reuses an overlapping one) and returns its id. */
  ensureAnchor: (paragraphIndex: number, start: number, end: number) => string;
  addBeat: (anchorId: string, label: string) => void;
  editBeat: (beatId: string, label: string) => void;
  deleteBeat: (beatId: string) => void;
  tagSymbol: (anchorId: string, symbolName: string) => void;
  untagSymbol: (symbolAttachmentId: string) => void;
  addAssociation: (
    symbolAttachmentId: string,
    content: string,
    kind: 'personal' | 'cultural',
  ) => void;
  editAssociation: (associationId: string, content: string) => void;
  deleteAssociation: (associationId: string) => void;
  addPass: (type: 'analytic' | 'synthetic', content: string, anchorId: string | null) => void;
};

const now = () => new Date().toISOString();

export const usePrototypeDream = (): PrototypeDreamApi => {
  const [dream, setDream] = useState<PDreamState>(initialDream);

  const ensureAnchor = (paragraphIndex: number, start: number, end: number): string => {
    const overlapping = dream.anchors.find(
      (a) => a.paragraphIndex === paragraphIndex && a.start < end && start < a.end,
    );
    if (overlapping) return overlapping.id;
    const anchor: PAnchor = {
      id: nextId('anchor'),
      paragraphIndex,
      start,
      end,
      createdAt: now(),
    };
    setDream((d) => ({ ...d, anchors: [...d.anchors, anchor] }));
    return anchor.id;
  };

  const addBeat = (anchorId: string, label: string) =>
    setDream((d) => ({
      ...d,
      beats: [...d.beats, { id: nextId('beat'), anchorId, label, createdAt: now() }],
    }));

  const editBeat = (beatId: string, label: string) =>
    setDream((d) => ({
      ...d,
      beats: d.beats.map((b) => (b.id === beatId ? { ...b, label } : b)),
    }));

  const deleteBeat = (beatId: string) =>
    setDream((d) => ({ ...d, beats: d.beats.filter((b) => b.id !== beatId) }));

  const tagSymbol = (anchorId: string, rawName: string) =>
    setDream((d) => {
      // Case-insensitive resolution against the vocabulary, per issue #48.
      const existing = d.symbolVocabulary.find((v) => v.toLowerCase() === rawName.toLowerCase());
      const symbolName = existing ?? rawName;
      const alreadyTagged = d.symbolAttachments.some(
        (sa) =>
          sa.anchorId === anchorId && sa.symbolName.toLowerCase() === symbolName.toLowerCase(),
      );
      if (alreadyTagged) return d;
      return {
        ...d,
        symbolVocabulary: existing ? d.symbolVocabulary : [...d.symbolVocabulary, symbolName],
        symbolAttachments: [
          ...d.symbolAttachments,
          { id: nextId('sa'), anchorId, symbolName, createdAt: now() },
        ],
      };
    });

  const untagSymbol = (symbolAttachmentId: string) =>
    setDream((d) => ({
      ...d,
      symbolAttachments: d.symbolAttachments.filter((sa) => sa.id !== symbolAttachmentId),
      associations: d.associations.filter((a) => a.symbolAttachmentId !== symbolAttachmentId),
    }));

  const addAssociation = (
    symbolAttachmentId: string,
    content: string,
    kind: 'personal' | 'cultural',
  ) =>
    setDream((d) => ({
      ...d,
      associations: [
        ...d.associations,
        { id: nextId('assoc'), symbolAttachmentId, content, kind, createdAt: now() },
      ],
    }));

  const editAssociation = (associationId: string, content: string) =>
    setDream((d) => ({
      ...d,
      associations: d.associations.map((a) => (a.id === associationId ? { ...a, content } : a)),
    }));

  const deleteAssociation = (associationId: string) =>
    setDream((d) => ({
      ...d,
      associations: d.associations.filter((a) => a.id !== associationId),
    }));

  const addPass = (type: 'analytic' | 'synthetic', content: string, anchorId: string | null) =>
    setDream((d) => ({
      ...d,
      passes: [
        ...d.passes,
        {
          id: nextId('pass'),
          type,
          // Synthetic passes are always whole-dream, per issue #49.
          anchorId: type === 'analytic' ? anchorId : null,
          content,
          createdAt: now(),
        },
      ],
    }));

  return {
    dream,
    ensureAnchor,
    addBeat,
    editBeat,
    deleteBeat,
    tagSymbol,
    untagSymbol,
    addAssociation,
    editAssociation,
    deleteAssociation,
    addPass,
  };
};
