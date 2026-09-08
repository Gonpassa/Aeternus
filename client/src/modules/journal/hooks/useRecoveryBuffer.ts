import {
  useRecoveryBuffer as useRecoveryBufferFor,
  type UseRecoveryBufferResult,
} from '../../../hooks/useRecoveryBuffer.ts';
import type { EntryFormValues } from '../components/EntryForm/EntryForm.utils.ts';

const STORAGE_PREFIX = 'journal:entryForm:recoveryBuffer:';

// Structural only - not entrySchema's submission-validity rules (e.g. a required
// primaryMood), since a legitimate in-progress draft commonly hasn't picked a mood yet.
// This exists to reject a buffer left over from a since-changed EntryFormValues shape,
// not to reject an incomplete-but-valid draft.
function isEntryFormValues(value: unknown): value is EntryFormValues {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<keyof EntryFormValues, unknown>;
  return (
    typeof v.date === 'string' &&
    typeof v.title === 'string' &&
    (v.primaryMood === null || typeof v.primaryMood === 'string') &&
    (v.specificEmotion === null || typeof v.specificEmotion === 'string') &&
    typeof v.content === 'string'
  );
}

// `key` distinguishes an in-progress new entry from an in-progress edit of a specific
// Entry (see the spec's "Keying" decision) - null disables the buffer entirely (e.g.
// before a stable key is known).
export function useRecoveryBuffer(key: string | null): UseRecoveryBufferResult<EntryFormValues> {
  return useRecoveryBufferFor(STORAGE_PREFIX, key, isEntryFormValues);
}
