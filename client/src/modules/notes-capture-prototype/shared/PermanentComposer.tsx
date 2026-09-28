// PROTOTYPE - the Permanent-note path #67 asked the reading page to carry: the user's own
// thinking happens while reading, not only in Review, so a Permanent note can be written here,
// pre-linked to the Literature note just written. Fields are settled (#69); its placement on
// the page is what each variant disagrees about.
import { useState } from 'react';
import { X } from 'lucide-react';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { Button } from '../../../atoms/Button/Button.tsx';
import { IconButton } from '../../../atoms/IconButton/IconButton.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Textarea } from '../../../atoms/Textarea/Textarea.tsx';
import { FieldLabel } from '../../../atoms/FieldLabel/FieldLabel.tsx';
import { RuledNote } from '../../../atoms/RuledNote/RuledNote.tsx';
import { LinkPanel } from './LinkPanel.tsx';
import { usePermanentDraft } from './usePermanentDraft.ts';
import type { LinkDraft, NotesState } from '../captureNotesData.ts';
import { identify } from '../captureNotesData.ts';

export function PermanentComposer({
  state,
  fromNoteId,
  initialLinks,
  onSave,
  onCancel,
}: {
  state: NotesState;
  // The note the invitation came from: the pre-linked target, and the anchor of the panel.
  fromNoteId: string;
  initialLinks: LinkDraft[];
  onSave: (input: { title: string; body: string; topics: string[] }, links: LinkDraft[]) => void;
  onCancel: () => void;
}) {
  const draft = usePermanentDraft(initialLinks);
  const [adding, setAdding] = useState(false);
  const chosen = new Set(draft.links.map((l) => l.targetId));

  const setReason = (targetId: string, reason: string) =>
    draft.setLinks(draft.links.map((l) => (l.targetId === targetId ? { ...l, reason } : l)));
  const remove = (targetId: string) =>
    draft.setLinks(draft.links.filter((l) => l.targetId !== targetId));

  return (
    <Stack direction="column" gap="4">
      <Stack justify="space-between" align="baseline">
        <Text textStyle="label" color="moss">
          What is yours in this?
        </Text>
        <Button variant="link" size="xs" onClick={onCancel}>
          Not now
        </Button>
      </Stack>
      <Input
        variant="title"
        placeholder="State the idea as a full sentence."
        value={draft.title}
        onChange={(e) => draft.setTitle(e.target.value)}
        autoFocus
      />
      <Textarea
        rows={5}
        placeholder="One idea, for someone who has not read the Source."
        value={draft.body}
        onChange={(e) => draft.setBody(e.target.value)}
      />
      <Stack direction="column" gap="2">
        <Text textStyle="label" color={draft.links.length ? 'inkSoft' : 'rust'}>
          Links {draft.links.length === 0 && '· at least one'}
        </Text>
        {draft.links.map((link) => {
          const other = identify(state, link.targetId);
          return (
            <RuledNote key={link.targetId} rule={link.reason.trim() ? 'moss' : 'rust'}>
              <Stack justify="space-between" align="flex-start" gap="2">
                <Stack direction="column" gap="0">
                  <Text textStyle="label" color="inkSoft">
                    {other.kind === 'permanent' ? 'Permanent note' : other.headline}
                  </Text>
                  <Text textStyle="body" color="ink">
                    {other.kind === 'permanent' ? other.headline : other.detail}
                  </Text>
                </Stack>
                <IconButton
                  icon={X}
                  aria-label="Remove link"
                  size="xs"
                  variant="ghost"
                  onClick={() => remove(link.targetId)}
                />
              </Stack>
              <Input
                mt="2"
                size="sm"
                placeholder="Why do these belong together?"
                value={link.reason}
                onChange={(e) => setReason(link.targetId, e.target.value)}
              />
            </RuledNote>
          );
        })}
        {adding ? (
          <Stack
            direction="column"
            gap="3"
            borderWidth="1px"
            borderColor="line"
            bg="paper"
            p="3"
            mt="1"
          >
            <Stack justify="space-between" align="baseline">
              <Text textStyle="label" color="inkSoft">
                Link something else
              </Text>
              <Button variant="link" size="xs" onClick={() => setAdding(false)}>
                Close
              </Button>
            </Stack>
            <LinkPanel
              state={state}
              noteId={fromNoteId}
              exclude={chosen}
              onPick={(id) => {
                draft.setLinks([...draft.links, { targetId: id, reason: '' }]);
                setAdding(false);
              }}
              limit={3}
            />
          </Stack>
        ) : (
          <Button variant="link" size="xs" alignSelf="flex-start" onClick={() => setAdding(true)}>
            Link something else
          </Button>
        )}
      </Stack>
      <FieldLabel eyebrow>
        Topics
        <Input
          size="sm"
          placeholder="Only what the note is about"
          value={draft.topicsText}
          onChange={(e) => draft.setTopicsText(e.target.value)}
        />
      </FieldLabel>
      <Stack gap="3">
        <Button
          disabled={!draft.canSave}
          onClick={() =>
            onSave(
              { title: draft.title.trim(), body: draft.body.trim(), topics: draft.topics },
              draft.links,
            )
          }
        >
          Put it in the box
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Back to reading
        </Button>
      </Stack>
    </Stack>
  );
}
