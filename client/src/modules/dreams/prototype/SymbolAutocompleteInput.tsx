/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Symbol-name input with case-insensitive autocomplete from the user's
 * prior symbol vocabulary (issue #48 behavior, stubbed locally).
 */
import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';

export interface SymbolAutocompleteInputProps {
  vocabulary: string[];
  onSubmit: (name: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function SymbolAutocompleteInput({
  vocabulary,
  onSubmit,
  onCancel,
  autoFocus = false,
}: SymbolAutocompleteInputProps) {
  const [query, setQuery] = useState('');
  const suggestions =
    query.trim().length > 0
      ? vocabulary.filter((v) => v.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
      : [];

  const submit = (name: string) => {
    if (!name.trim()) return;
    onSubmit(name.trim());
    setQuery('');
  };

  return (
    <Box position="relative">
      <Stack gap="2">
        <Input
          size="sm"
          value={query}
          autoFocus={autoFocus}
          placeholder="Symbol name…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(query);
            if (e.key === 'Escape') onCancel?.();
          }}
        />
        <Button size="xs" onClick={() => submit(query)}>
          Tag
        </Button>
        {onCancel && (
          <Button size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Stack>
      {suggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="1"
          zIndex="10"
          bg="paperCard"
          borderWidth="1px"
          borderColor="line"
          borderRadius="md"
          boxShadow="md"
        >
          {suggestions.map((s) => (
            <Box
              key={s}
              as="button"
              display="block"
              width="100%"
              textAlign="left"
              px="3"
              py="2"
              cursor="pointer"
              _hover={{ bg: 'moss/15' }}
              onClick={() => submit(s)}
            >
              <Text as="span" textStyle="label">
                {s}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
