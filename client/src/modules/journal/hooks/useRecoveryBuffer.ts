import { useRef } from 'react';
import type { EntryFormValues } from '../components/EntryForm/EntryForm.utils.ts';

const STORAGE_PREFIX = 'journal:entryForm:recoveryBuffer:';
// Recovery buffer (see CONTEXT.md) - an abandoned buffer this old is dropped rather than
// resurfaced, per ADR-0005 and the grilled "expire after a short window" decision.
const EXPIRY_MS = 36 * 60 * 60 * 1000;

interface RecoveryBufferRecord {
  values: EntryFormValues;
  savedAt: number;
}

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

function isRecord(value: unknown): value is RecoveryBufferRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'values' in value &&
    'savedAt' in value &&
    typeof (value as Record<'savedAt', unknown>).savedAt === 'number' &&
    isEntryFormValues((value as Record<'values', unknown>).values)
  );
}

export interface UseRecoveryBufferResult {
  read: () => EntryFormValues | null;
  write: (values: EntryFormValues) => void;
  clear: () => void;
}

// `key` distinguishes an in-progress new entry from an in-progress edit of a specific
// Entry (see the spec's "Keying" decision) - null disables the buffer entirely (e.g.
// before a stable key is known).
export function useRecoveryBuffer(key: string | null): UseRecoveryBufferResult {
  const keyRef = useRef(key);
  keyRef.current = key;

  const storageKey = () => (keyRef.current ? `${STORAGE_PREFIX}${keyRef.current}` : null);

  const read = (): EntryFormValues | null => {
    const storedKey = storageKey();
    if (!storedKey) return null;
    const raw = window.localStorage.getItem(storedKey);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isRecord(parsed)) return null;
    if (Date.now() - parsed.savedAt > EXPIRY_MS) {
      window.localStorage.removeItem(storedKey);
      return null;
    }
    return parsed.values;
  };

  const write = (values: EntryFormValues) => {
    const storedKey = storageKey();
    if (!storedKey) return;
    const record: RecoveryBufferRecord = { values, savedAt: Date.now() };
    window.localStorage.setItem(storedKey, JSON.stringify(record));
  };

  const clear = () => {
    const storedKey = storageKey();
    if (!storedKey) return;
    window.localStorage.removeItem(storedKey);
  };

  return { read, write, clear };
}
