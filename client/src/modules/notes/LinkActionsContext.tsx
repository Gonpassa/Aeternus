import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';
import type { CreateLinkRequest } from '@nee3/shared-types';

// Everything making and unmaking a Link needs, and all of it identical for every card and
// every row on the page - which is what puts it in a context rather than in props drilled from
// the reading page down through the stream, a card, its connections view, and each row of it.
// What varies per instance - the note a panel is opened from, the Link a row is showing -
// stays a prop.
export interface LinkActions {
  // A Link between two notes that both already exist. The server answers with the Link whether
  // it made one or added this end's reason to the one already there (ADR 0013).
  link: (input: CreateLinkRequest) => Promise<void>;
  // A reason rewritten by the end that wrote it: `fromNoteId` is which end is speaking, since
  // a Link carries two reasons and neither end may edit the other's.
  editReason: (linkId: number, fromNoteId: number, reason: string) => Promise<void>;
  // Refused outright when it would leave a Permanent note with no Links at all, in which case
  // this rejects and the refusal names that note (ADR 0014).
  removeLink: (linkId: number) => Promise<void>;
}

const LinkActionsContext = createContext<LinkActions | null>(null);

export function LinkActionsProvider({
  value,
  children,
}: PropsWithChildren<{ value: LinkActions }>): ReactNode {
  return <LinkActionsContext.Provider value={value}>{children}</LinkActionsContext.Provider>;
}

// Null outside a provider, which is a surface that reads notes without offering to change
// their Links rather than a mistake: a connections view reached from another row is read, not
// edited, and the affordances are simply not offered there.
export function useLinkActionsContext(): LinkActions | null {
  return useContext(LinkActionsContext);
}
