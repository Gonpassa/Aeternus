import {
  useRecoveryBuffer as useRecoveryBufferFor,
  type UseRecoveryBufferResult,
} from '../../../hooks/useRecoveryBuffer.ts';
import type { DreamFormValues } from '../components/DreamForm/DreamForm.utils.ts';

const STORAGE_PREFIX = 'dreams:dreamForm:recoveryBuffer:';

// Structural only - see journal's useRecoveryBuffer.ts for the same rationale: this
// guards against a buffer left over from a since-changed DreamFormValues shape, not
// against an incomplete-but-valid draft.
function isDreamFormValues(value: unknown): value is DreamFormValues {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<keyof DreamFormValues, unknown>;
  return typeof v.date === 'string' && typeof v.narrative === 'string';
}

// `key` distinguishes an in-progress dream recording - there is only ever one
// in-progress "new dream" composition per browser, so a fixed slot is enough (see
// journal's equivalent hook for the same "new" convention).
export function useRecoveryBuffer(key: string | null): UseRecoveryBufferResult<DreamFormValues> {
  return useRecoveryBufferFor(STORAGE_PREFIX, key, isDreamFormValues);
}
