import { useState } from 'react';
import { Button } from '../Button/Button.tsx';
import { Input } from '../Input/Input.tsx';
import { Stack } from '../Stack/Stack.tsx';

const MAX_SUGGESTIONS = 5;

export interface VocabularyInputProps {
  // The terms the user has already used, cased as they first typed them.
  vocabulary: string[];
  // Accessible name for the field, naming the kind of term being entered.
  label: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (term: string) => void | Promise<void>;
  onCancel: () => void;
}

// Entry for a controlled-but-growing per-user vocabulary: suggestions come from the
// terms already used, matched case-insensitively on any part of the name, while free
// typing creates a new term. Submitted terms are trimmed and keep the casing of
// whichever name produced them - the stored one when a suggestion is picked, the typed
// one when a term is new - leaving the caller to decide how a name resolves to a record.
export function VocabularyInput({
  vocabulary,
  label,
  placeholder,
  submitLabel = 'Add',
  onSubmit,
  onCancel,
}: VocabularyInputProps) {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmed = query.trim();
  const suggestions =
    trimmed.length > 0
      ? vocabulary
          .filter((term) => term.toLowerCase().includes(trimmed.toLowerCase()))
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const submit = async (term: string) => {
    const cleaned = term.trim();
    if (!cleaned || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(cleaned);
    } catch {
      // Failures aren't field-attributable here; the global toast interceptor in
      // api/client.ts already surfaced them - staying open lets the user retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack direction="column" position="relative" gap="1">
      <Input
        size="sm"
        value={query}
        aria-label={label}
        placeholder={placeholder}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the input appears in direct
        // response to the user asking to enter a term; focusing it is the expected flow.
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit(query);
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Stack direction="row" gap="1">
        <Button type="button" size="xs" loading={isSubmitting} onClick={() => submit(query)}>
          {submitLabel}
        </Button>
        <Button type="button" size="xs" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
      {suggestions.length > 0 && (
        <Stack
          direction="column"
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="1"
          zIndex="dropdown"
          bg="paperCard"
          borderWidth="1px"
          borderColor="line"
          borderRadius="md"
          boxShadow="md"
          overflow="hidden"
        >
          {suggestions.map((term) => (
            <Button
              key={term}
              type="button"
              size="sm"
              variant="ghost"
              justifyContent="flex-start"
              borderRadius="0"
              disabled={isSubmitting}
              onClick={() => submit(term)}
            >
              {term}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
