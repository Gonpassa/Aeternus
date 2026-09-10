import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';
import type { Association, AssociationKind, EmotionalBeat } from '@nee3/shared-types';

// The one margin-note form open at a time - lifted to the page so opening a form anywhere
// closes any other.
export type MarginFormState =
  | { kind: 'addBeat'; anchorId: number }
  | { kind: 'addSymbol'; anchorId: number }
  | { kind: 'addAssociation'; symbolAttachmentId: number }
  | { kind: 'editAssociation'; association: Association };

// Everything a margin note needs that is the same for every margin note. What varies per
// note - the Anchor itself and its excerpt - stays a prop, so this context is a bounded,
// named surface rather than a second copy of the page's state.
export interface AnchorAttachments {
  // The Anchor the manuscript is currently highlighting, if any.
  activeAnchorId: number | null;
  toggleAnchor: (anchorId: number) => void;
  // The one inline form open anywhere in the margin, if any.
  form: MarginFormState | null;
  openForm: (form: MarginFormState) => void;
  closeForm: () => void;
  // Symbol names the user has already used, for the tag input's suggestions.
  symbolVocabulary: string[];
  addBeat: (anchorId: number, label: string) => Promise<void>;
  editBeat: (beat: EmotionalBeat) => void;
  deleteBeat: (beatId: number) => void;
  tagSymbol: (anchorId: number, name: string) => Promise<void>;
  untagSymbol: (symbolAttachmentId: number) => void;
  addAssociation: (
    symbolAttachmentId: number,
    content: string,
    kind: AssociationKind,
  ) => Promise<void>;
  updateAssociation: (
    association: Association,
    content: string,
    kind: AssociationKind,
  ) => Promise<void>;
  deleteAssociation: (associationId: number) => void;
}

const AnchorAttachmentsContext = createContext<AnchorAttachments | null>(null);

export function AnchorAttachmentsProvider({
  value,
  children,
}: PropsWithChildren<{ value: AnchorAttachments }>): ReactNode {
  return (
    <AnchorAttachmentsContext.Provider value={value}>{children}</AnchorAttachmentsContext.Provider>
  );
}

export function useAnchorAttachmentsContext(): AnchorAttachments {
  const context = useContext(AnchorAttachmentsContext);
  if (!context) {
    throw new Error('Margin notes must be rendered inside an AnchorAttachmentsProvider');
  }
  return context;
}
