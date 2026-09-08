import type { Association } from '@nee3/shared-types';

// The one margin-note form open at a time, lifted to DreamAnalysis so opening a form
// anywhere closes any other.
export type MarginFormState =
  | { kind: 'addBeat'; anchorId: number }
  | { kind: 'addSymbol'; anchorId: number }
  | { kind: 'addAssociation'; symbolAttachmentId: number }
  | { kind: 'editAssociation'; association: Association };
