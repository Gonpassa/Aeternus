// PROTOTYPE - the chosen Links of a Permanent note being written, each with its required
// reason line, plus the search-across-all-notes fallback (#69). The sitting's one-click
// targets are NOT here: how those are offered is the thing each variant disagrees about.
import { useState } from 'react';
import { X } from 'lucide-react';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { IconButton } from '../../../atoms/IconButton/IconButton.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import type { LinkDraft, NotesState } from '../prototypeNotesData.ts';
import { identify, searchNotes } from '../prototypeNotesData.ts';

export function LinkPicker({
  state,
  drafts,
  onChange,
  compact = false,
}: {
  state: NotesState;
  drafts: LinkDraft[];
  onChange: (drafts: LinkDraft[]) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState('');
  const chosen = new Set(drafts.map((d) => d.targetId));
  const results = searchNotes(state, query, chosen);

  const setReason = (targetId: string, reason: string) =>
    onChange(drafts.map((d) => (d.targetId === targetId ? { ...d, reason } : d)));
  const remove = (targetId: string) => onChange(drafts.filter((d) => d.targetId !== targetId));
  const add = (targetId: string) => {
    onChange([...drafts, { targetId, reason: '' }]);
    setQuery('');
  };

  return (
    <Stack direction="column" gap="3">
      <Stack justify="space-between" align="baseline">
        <Text textStyle="label" color={drafts.length ? 'inkSoft' : 'rust'}>
          Links {drafts.length === 0 && '· at least one'}
        </Text>
      </Stack>
      {drafts.map((draft) => {
        const other = identify(state, draft.targetId);
        return (
          <RuledNote key={draft.targetId} rule={draft.reason.trim() ? 'moss' : 'rust'}>
            <Stack justify="space-between" align="flex-start" gap="2">
              <Stack direction="column" gap="0">
                <Text textStyle={compact ? 'body' : 'cardTitle'} color="ink">
                  {other.headline}
                </Text>
                {other.detail && (
                  <Text textStyle="body" color="inkSoft" fontStyle="italic">
                    {other.detail}
                  </Text>
                )}
              </Stack>
              <IconButton
                icon={X}
                aria-label="Remove link"
                size="xs"
                variant="ghost"
                onClick={() => remove(draft.targetId)}
              />
            </Stack>
            <Input
              mt="2"
              size="sm"
              placeholder="Why do these belong together?"
              value={draft.reason}
              onChange={(e) => setReason(draft.targetId, e.target.value)}
            />
          </RuledNote>
        );
      })}
      <Stack direction="column" gap="1" position="relative">
        <Input
          size="sm"
          placeholder="Search all notes to link an older one…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <Stack
            direction="column"
            position="absolute"
            top="100%"
            left="0"
            right="0"
            zIndex="10"
            bg="paper"
            borderWidth="1px"
            borderColor="line"
            boxShadow="md"
            mt="1"
          >
            {results.map((r) => (
              <Button
                key={r.id}
                variant="ghost"
                h="auto"
                textTransform="none"
                letterSpacing="normal"
                py="2"
                px="3"
                justifyContent="flex-start"
                whiteSpace="normal"
                textAlign="left"
                borderBottomWidth="1px"
                borderColor="line"
                _hover={{ bg: 'paperCard', textDecoration: 'none' }}
                onClick={() => add(r.id)}
              >
                <Stack direction="column" gap="0" align="flex-start">
                  <Text textStyle="body" color="ink">
                    {r.headline}
                  </Text>
                  {r.detail && (
                    <Text
                      textStyle="label"
                      color="inkSoft"
                      textTransform="none"
                      letterSpacing="normal"
                    >
                      {r.detail}
                    </Text>
                  )}
                </Stack>
              </Button>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
