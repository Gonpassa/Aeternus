import { format } from 'date-fns';

// A Source with no Literature notes is invited to have one, not reported as empty: "Not
// started" would describe a lifecycle the Source does not have.
export const lastNoteLabel = (lastNoteAt: string | null): string =>
  lastNoteAt
    ? `Last note ${format(new Date(lastNoteAt), 'MMM d, yyyy')}`
    : 'Nothing written from this yet';
