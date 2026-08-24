import { useEffect, useRef } from 'react';

interface UseExternalChangeOptions<T> {
  // Suppress the change check entirely for this render (e.g. while an async lookup
  // that could produce `value` is still in flight, so a transient state doesn't
  // masquerade as a real external change).
  skip?: boolean;
  isEqual?: (a: T, b: T) => boolean;
}

interface UseExternalChangeResult<T> {
  // Call when this component itself is the source of the next `value` (e.g. right
  // before calling a field's own onChange), so that value's eventual echo back
  // through props/state isn't mistaken for a genuine external change.
  notify: (value: T) => void;
}

const defaultIsEqual = <T>(a: T, b: T): boolean => a === b;

// Distinguishes "this value changed because something external reset it" from
// "this value changed because I just told it to" - the two ref-and-effect patterns
// duplicated between EntryForm's collision-prefill and MoodPicker's local-state
// resync, extracted after the same bug (a resync firing on a component's own echo)
// shipped in one of them but not the other.
export function useExternalChange<T>(
  value: T,
  onExternalChange: (value: T) => void,
  options: UseExternalChangeOptions<T> = {},
): UseExternalChangeResult<T> {
  const { skip = false, isEqual = defaultIsEqual } = options;
  const lastKnown = useRef(value);

  useEffect(() => {
    if (skip) return;
    if (isEqual(lastKnown.current, value)) return;
    lastKnown.current = value;
    onExternalChange(value);
    // onExternalChange and isEqual are read fresh via closure on whichever render
    // actually changes `value`/`skip` - including them would re-run this on every
    // render of the calling component instead of only on a real value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, skip]);

  const notify = (next: T) => {
    lastKnown.current = next;
  };

  return { notify };
}
