import { useRef } from 'react';

// Recovery buffer (see CONTEXT.md) - an abandoned buffer this old is dropped rather than
// resurfaced, per ADR-0005 and the grilled "expire after a short window" decision.
const EXPIRY_MS = 36 * 60 * 60 * 1000;

interface RecoveryBufferRecord<T> {
  values: T;
  savedAt: number;
}

function isRecord<T>(
  value: unknown,
  isValues: (value: unknown) => value is T,
): value is RecoveryBufferRecord<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'values' in value &&
    'savedAt' in value &&
    typeof (value as Record<'savedAt', unknown>).savedAt === 'number' &&
    isValues((value as Record<'values', unknown>).values)
  );
}

export interface UseRecoveryBufferResult<T> {
  read: () => T | null;
  write: (values: T) => void;
  clear: () => void;
}

// `storagePrefix` namespaces buffers by the form shape they hold (e.g. one prefix per
// module's record type), so distinct forms never collide in localStorage even if their
// `key`s happen to match. `key` distinguishes an in-progress record from another (e.g. a
// specific id being edited vs. a fixed "new" slot) - null disables the buffer entirely
// (e.g. before a stable key is known). `isValues` is structural only, guarding against a
// buffer left over from a since-changed values shape, not against an incomplete-but-valid
// draft.
export function useRecoveryBuffer<T>(
  storagePrefix: string,
  key: string | null,
  isValues: (value: unknown) => value is T,
): UseRecoveryBufferResult<T> {
  const keyRef = useRef(key);
  keyRef.current = key;

  const storageKey = () => (keyRef.current ? `${storagePrefix}${keyRef.current}` : null);

  const read = (): T | null => {
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
    if (!isRecord(parsed, isValues)) return null;
    if (Date.now() - parsed.savedAt > EXPIRY_MS) {
      window.localStorage.removeItem(storedKey);
      return null;
    }
    return parsed.values;
  };

  const write = (values: T) => {
    const storedKey = storageKey();
    if (!storedKey) return;
    const record: RecoveryBufferRecord<T> = { values, savedAt: Date.now() };
    window.localStorage.setItem(storedKey, JSON.stringify(record));
  };

  const clear = () => {
    const storedKey = storageKey();
    if (!storedKey) return;
    window.localStorage.removeItem(storedKey);
  };

  return { read, write, clear };
}
