import { useState } from 'react';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Input } from '../../../../atoms/Input/Input.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';

const MAX_SUGGESTIONS = 5;

export interface SymbolAutocompleteInputProps {
  // The user's existing Symbol vocabulary (all dreams), already-cased as first typed.
  vocabulary: string[];
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// Free-text symbol entry with case-insensitive suggestions from the user's prior
// vocabulary. Picking a suggestion or typing a name that matches one case-insensitively
// resolves to the same Symbol server-side (the backend keys symbols on lowercased name).
export function SymbolAutocompleteInput({
  vocabulary,
  onSubmit,
  onCancel,
  submitLabel = 'Tag',
}: SymbolAutocompleteInputProps) {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmed = query.trim();
  const suggestions =
    trimmed.length > 0
      ? vocabulary
          .filter((name) => name.toLowerCase().includes(trimmed.toLowerCase()))
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const submit = async (name: string) => {
    const cleaned = name.trim();
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
        aria-label="Symbol name"
        placeholder="Symbol name…"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the input appears in direct
        // response to the user asking to tag a symbol; focusing it is the expected flow.
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
          {suggestions.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant="ghost"
              justifyContent="flex-start"
              borderRadius="0"
              disabled={isSubmitting}
              onClick={() => submit(name)}
            >
              {name}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
