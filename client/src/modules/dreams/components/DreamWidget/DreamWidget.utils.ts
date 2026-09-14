import { formatDistanceToNowStrict } from 'date-fns';
import { parseIsoDate } from '../../../../utils/isoDate.ts';

// Phrased about the dream, never the recording: eligibility runs on when the
// Dream was written down, but the displayed age comes from the night dreamt,
// and those can differ for a back-dated Dream (#62).
export const dreamAgePhrase = (isoDate: string): string =>
  `A dream from ${formatDistanceToNowStrict(parseIsoDate(isoDate), { addSuffix: true })}`;
