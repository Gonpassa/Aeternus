// PROTOTYPE - Variant A: "Foot of the stream". One column, read top to bottom: the Source
// header, every note written from it so far in creation order, and the capture form as the last
// thing on the page. Capture therefore sits where reading left off, and the page grows downward
// under your hands. The Locator is a compact row at the top of the form - section carried over
// from the last note with the earlier sections one tap away, position empty and focused after
// each save. Acting on a note (Link it, write a Permanent note from it, flag it as an open
// question) happens in place: the row is loud on the note just written and quiet on the rest.
// See NotesCapturePrototype.tsx for the shared, already-settled pieces.
import { useState } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { FieldLabel } from '../../atoms/FieldLabel/FieldLabel.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { SourceHeader } from './shared/SourceHeader.tsx';
import { SourceSwitcher } from './shared/SourceSwitcher.tsx';
import { SectionSuggestions } from './shared/SectionSuggestions.tsx';
import { LinkFlow } from './shared/LinkFlow.tsx';
import { PermanentComposer } from './shared/PermanentComposer.tsx';
import { NoteConnections } from './shared/NoteConnections.tsx';
import type { CaptureInput, CaptureStore, LinkDraft, LiteratureNote } from './captureNotesData.ts';
import {
  dayLabel,
  lastNoteFor,
  notesForSource,
  renderLocator,
  sameDay,
  sectionsForSource,
  sourceById,
  timeLabel,
} from './captureNotesData.ts';

type Acting = { noteId: string; mode: 'link' } | { noteId: string; mode: 'permanent' };

function CaptureFormA({
  sections,
  prefilledSection,
  focusPosition,
  onSave,
}: {
  sections: string[];
  prefilledSection: string;
  focusPosition: boolean;
  onSave: (input: CaptureInput) => void;
}) {
  const [section, setSection] = useState(prefilledSection);
  const [position, setPosition] = useState('');
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(false);
  const canSave = body.trim().length > 0 && Boolean(section.trim() || position.trim());

  return (
    <Stack direction="column" gap="4" pt="6" borderTopWidth="1px" borderColor="line">
      <Stack justify="space-between" align="baseline" wrap="wrap" gap="3">
        <Text textStyle="label" color="rust">
          Keep reading
        </Text>
        <Text textStyle="body" color="inkSoft">
          Stop at the first thing worth keeping.
        </Text>
      </Stack>
      <Stack gap="3" wrap="wrap" align="flex-end">
        <FieldLabel eyebrow flex="1" minW="14rem">
          Section
          <Input
            size="sm"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="Chapter, segment, heading"
          />
        </FieldLabel>
        <FieldLabel eyebrow w="11rem">
          Position
          <Input
            size="sm"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Page or time"
            autoFocus={focusPosition}
          />
        </FieldLabel>
      </Stack>
      <SectionSuggestions sections={sections} value={section} onPick={setSection} />
      <FieldLabel eyebrow>
        In your own words
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A few sentences on one point, written closed-book."
        />
      </FieldLabel>
      {excerptOpen ? (
        <FieldLabel eyebrow>
          The author&rsquo;s exact words
          <Textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            fontStyle="italic"
            autoFocus
          />
        </FieldLabel>
      ) : (
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setExcerptOpen(true)}
        >
          Add the author&rsquo;s exact words
        </Button>
      )}
      <Stack justify="space-between" align="center" wrap="wrap" gap="3">
        <Button
          variant={openQuestion ? 'default' : 'outline'}
          size="xs"
          onClick={() => setOpenQuestion((v) => !v)}
        >
          {openQuestion ? 'Leaving this open' : 'Leave this open'}
        </Button>
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() =>
            onSave({
              section: section.trim() || null,
              position: position.trim() || null,
              body: body.trim(),
              excerpt: excerpt.trim() || null,
              openQuestion,
            })
          }
        >
          Save note
        </Button>
      </Stack>
    </Stack>
  );
}

export function VariantA({ store }: { store: CaptureStore }) {
  const { state } = store;
  const [sourceId, setSourceId] = useState('src-1');
  const [saves, setSaves] = useState(0);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [acting, setActing] = useState<Acting | null>(null);
  const [prelink, setPrelink] = useState<LinkDraft[]>([]);

  const source = sourceById(state, sourceId);
  const notes = notesForSource(state, sourceId);
  const last = lastNoteFor(state, sourceId);

  const openSource = (id: string) => {
    setSourceId(id);
    setJustSaved(null);
    setActing(null);
    setSaves(0);
  };

  const startPermanent = (noteId: string, links: LinkDraft[]) => {
    setPrelink(links);
    setActing({ noteId, mode: 'permanent' });
  };

  const renderActions = (note: LiteratureNote) => {
    const fresh = note.id === justSaved;
    return (
      <Stack
        direction="column"
        gap="3"
        data-actions
        opacity={fresh || acting?.noteId === note.id ? '1' : '0'}
        transition="opacity 150ms ease"
      >
        <Stack gap="3" align="center" wrap="wrap">
          <Button
            variant="link"
            size="xs"
            onClick={() => setActing({ noteId: note.id, mode: 'link' })}
          >
            Link this
          </Button>
          <Button
            variant="link"
            size="xs"
            onClick={() => startPermanent(note.id, [{ targetId: note.id, reason: '' }])}
          >
            Write a Permanent note from this
          </Button>
          <Button
            variant="link"
            size="xs"
            onClick={() =>
              store.updateLiteratureNote(note.id, { openQuestion: !note.openQuestion })
            }
          >
            {note.openQuestion ? 'Settled' : 'Leave open'}
          </Button>
        </Stack>
        {acting?.noteId === note.id && (
          <Card>
            {acting.mode === 'link' ? (
              <LinkFlow
                state={state}
                noteId={note.id}
                onLink={(targetId, reason) => store.addLink(note.id, targetId, reason)}
                onDone={() => setActing(null)}
                onOutgrown={(targetId) =>
                  startPermanent(note.id, [
                    { targetId: note.id, reason: '' },
                    { targetId, reason: '' },
                  ])
                }
              />
            ) : (
              <PermanentComposer
                state={state}
                fromNoteId={note.id}
                initialLinks={prelink}
                onSave={(input, links) => {
                  store.addPermanentNote(input, links);
                  setActing(null);
                }}
                onCancel={() => setActing(null)}
              />
            )}
          </Card>
        )}
      </Stack>
    );
  };

  return (
    <Stack direction="column" gap="6" maxW="44rem">
      <SourceSwitcher state={state} sourceId={sourceId} onOpen={openSource} />
      <SourceHeader
        state={state}
        source={source}
        onClearOpenQuestion={(id) => store.updateLiteratureNote(id, { openQuestion: false })}
      />
      <Stack direction="column" gap="0">
        {notes.length === 0 && (
          <Text textStyle="body" color="inkSoft" fontStyle="italic" py="4">
            Nothing written from this yet. The first note goes in below.
          </Text>
        )}
        {notes.map((note, i) => {
          const previous = notes[i - 1];
          const newDay = !previous || !sameDay(previous.createdAt, note.createdAt);
          return (
            <Stack direction="column" gap="0" key={note.id}>
              {newDay && (
                <Text textStyle="label" color="inkSoft" pt={i === 0 ? '0' : '6'} pb="2">
                  {dayLabel(note.createdAt)}
                </Text>
              )}
              <Stack
                direction="column"
                gap="2"
                py="4"
                borderTopWidth="1px"
                borderColor="line"
                _hover={{ '& [data-actions]': { opacity: '1' } }}
                _focusWithin={{ '& [data-actions]': { opacity: '1' } }}
              >
                <Stack gap="3" align="baseline" wrap="wrap">
                  <Text textStyle="label" color="rust">
                    {renderLocator(note)}
                  </Text>
                  <Text textStyle="label" color="inkSoft">
                    {timeLabel(note.createdAt)}
                  </Text>
                  {note.openQuestion && (
                    <Text textStyle="label" color="rust">
                      Open question
                    </Text>
                  )}
                  {note.id === justSaved && (
                    <Text textStyle="label" color="moss">
                      Just written
                    </Text>
                  )}
                </Stack>
                <Text textStyle="body" color="ink">
                  {note.body}
                </Text>
                {note.excerpt && (
                  <Text textStyle="body" color="inkSoft" fontStyle="italic">
                    &ldquo;{note.excerpt}&rdquo;
                  </Text>
                )}
                <NoteConnections state={state} noteId={note.id} />
                {renderActions(note)}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
      <CaptureFormA
        key={`${sourceId}-${saves}`}
        sections={sectionsForSource(state, sourceId)}
        prefilledSection={last?.section ?? ''}
        focusPosition={saves > 0}
        onSave={(input) => {
          const created = store.addLiteratureNote(sourceId, input);
          setJustSaved(created.id);
          setActing(null);
          setSaves((s) => s + 1);
        }}
      />
    </Stack>
  );
}
