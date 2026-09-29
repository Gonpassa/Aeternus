// PROTOTYPE - Variant B: "Write on the card". A desk with one working surface. The form is not a
// form: it is a blank index card, the same object the note becomes, so nothing is translated
// between writing and reading. The section is the card's die-cut tab, the position is its catalog
// number in the bottom-right, the body is the card's face, and the author's words are a slip
// tucked under it. Filing the card moves it into the stack on the right and hands you a fresh
// blank with the tab still set. Acting on a filed card takes over the desk rather than opening
// inside the stack. See NotesCapturePrototype.tsx for the shared, already-settled pieces.
import { useState } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { DieCutTab } from '../../atoms/DieCutTab/DieCutTab.tsx';
import { IndexCard } from '../../atoms/IndexCard/IndexCard.tsx';
import { SourceHeader } from './shared/SourceHeader.tsx';
import { SourceSwitcher } from './shared/SourceSwitcher.tsx';
import { SectionSuggestions } from './shared/SectionSuggestions.tsx';
import { LinkFlow } from './shared/LinkFlow.tsx';
import { PermanentComposer } from './shared/PermanentComposer.tsx';
import { NoteConnections } from './shared/NoteConnections.tsx';
import type { CaptureInput, CaptureStore, LinkDraft } from './captureNotesData.ts';
import {
  dayLabel,
  lastNoteFor,
  notesForSource,
  renderPosition,
  sameDay,
  sectionsForSource,
  sourceById,
  timeLabel,
} from './captureNotesData.ts';

type Acting = { noteId: string; mode: 'link' } | { noteId: string; mode: 'permanent' };

// The blank card. Everything on it is typed where it will be read: tab, catalog number, face.
function BlankCardB({
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
  const [editingPosition, setEditingPosition] = useState(false);
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(false);
  const canSave = body.trim().length > 0 && Boolean(section.trim() || position.trim());

  return (
    <Stack direction="column" gap="3">
      <Card position="relative" pt="6" px="5" pb="8" borderStyle="dashed">
        <DieCutTab
          position="absolute"
          top="-3.5"
          left="8"
          color={openQuestion ? 'inkBlue' : 'rust'}
          pr="2"
        >
          <Input
            size="xs"
            h="5"
            px="1"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="Section"
            aria-label="Section"
            bg="transparent"
            borderWidth="0"
            borderRadius="0"
            color="paper"
            textStyle="label"
            w="12rem"
            _placeholder={{ color: 'paper' }}
            _focusVisible={{ boxShadow: 'none', outline: 'none', bg: 'paper/20' }}
          />
        </DieCutTab>
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A few sentences on one point, written closed-book."
          bg="transparent"
          borderWidth="0"
          borderRadius="0"
          px="0"
          resize="none"
          _focusVisible={{ boxShadow: 'none', outline: 'none', bg: 'paper/50' }}
        />
        <Stack position="absolute" bottom="3" right="4" align="baseline" justify="flex-end">
          {/* The catalog slot holds one thing: the number as it will be read, or the field that
              sets it. Typing digits and seeing "p. 80" appear beside them reads as two positions. */}
          {editingPosition || !position.trim() ? (
            <Input
              size="xs"
              h="5"
              px="1"
              w="6rem"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              onBlur={() => setEditingPosition(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setEditingPosition(false);
                }
              }}
              placeholder="Position"
              aria-label="Position"
              autoFocus={focusPosition || editingPosition}
              textAlign="right"
              bg="transparent"
              borderWidth="0"
              borderBottomWidth="1px"
              borderColor="line"
              borderRadius="0"
              textStyle="label"
              _focusVisible={{ boxShadow: 'none', outline: 'none', borderColor: 'moss' }}
            />
          ) : (
            <Button
              variant="link"
              size="xs"
              aria-label="Position"
              onClick={() => setEditingPosition(true)}
            >
              {renderPosition(position.trim())}
            </Button>
          )}
        </Stack>
      </Card>
      {excerptOpen ? (
        <Card ml="5" bg="paper" padding="sm">
          <Text textStyle="label" color="inkSoft" mb="1">
            The author&rsquo;s exact words
          </Text>
          <Textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            fontStyle="italic"
            bg="transparent"
            borderWidth="0"
            borderRadius="0"
            px="0"
            resize="none"
            autoFocus
            _focusVisible={{ boxShadow: 'none', outline: 'none', bg: 'paper/50' }}
          />
        </Card>
      ) : (
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          ml="5"
          onClick={() => setExcerptOpen(true)}
        >
          Add the author&rsquo;s exact words
        </Button>
      )}
      <SectionSuggestions sections={sections} value={section} onPick={setSection} label="Tab it" />
      <Stack justify="space-between" align="center" wrap="wrap" gap="3" pt="1">
        <Button
          variant={openQuestion ? 'default' : 'outline'}
          size="xs"
          onClick={() => setOpenQuestion((v) => !v)}
        >
          {openQuestion ? 'Filing it open' : 'File it as open'}
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
          File this card
        </Button>
      </Stack>
    </Stack>
  );
}

export function VariantB({ store }: { store: CaptureStore }) {
  const { state } = store;
  const [sourceId, setSourceId] = useState('src-1');
  const [saves, setSaves] = useState(0);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [acting, setActing] = useState<Acting | null>(null);
  const [prelink, setPrelink] = useState<LinkDraft[]>([]);

  const source = sourceById(state, sourceId);
  const notes = notesForSource(state, sourceId);
  const last = lastNoteFor(state, sourceId);
  const actingNote = acting ? notes.find((n) => n.id === acting.noteId) : undefined;

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

  return (
    <Stack direction="column" gap="6" maxW="71rem">
      <SourceSwitcher state={state} sourceId={sourceId} onOpen={openSource} />
      <SourceHeader
        state={state}
        source={source}
        onClearOpenQuestion={(id) => store.updateLiteratureNote(id, { openQuestion: false })}
      />
      <Stack gap="10" align="flex-start" direction={{ base: 'column', lg: 'row' }} pt="2">
        <Stack
          direction="column"
          gap="4"
          w={{ base: 'full', lg: '30rem' }}
          flexShrink="0"
          position={{ lg: 'sticky' }}
          top="4"
        >
          {acting && actingNote ? (
            <Stack direction="column" gap="3">
              <Stack justify="space-between" align="baseline">
                <Text textStyle="label" color="rust">
                  {acting.mode === 'link' ? 'Linking' : 'Writing from'}
                </Text>
                <Button variant="link" size="xs" onClick={() => setActing(null)}>
                  Back to the blank card
                </Button>
              </Stack>
              <Card bg="paper" padding="sm">
                <Text textStyle="label" color="inkSoft">
                  {[actingNote.section, renderPosition(actingNote.position)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text textStyle="body" color="ink">
                  {actingNote.body}
                </Text>
              </Card>
              <Card>
                {acting.mode === 'link' ? (
                  <LinkFlow
                    state={state}
                    noteId={actingNote.id}
                    onLink={(targetId, reason) => store.addLink(actingNote.id, targetId, reason)}
                    onDone={() => setActing(null)}
                    onOutgrown={(targetId) =>
                      startPermanent(actingNote.id, [
                        { targetId: actingNote.id, reason: '' },
                        { targetId, reason: '' },
                      ])
                    }
                  />
                ) : (
                  <PermanentComposer
                    state={state}
                    fromNoteId={actingNote.id}
                    initialLinks={prelink}
                    onSave={(input, links) => {
                      store.addPermanentNote(input, links);
                      setActing(null);
                    }}
                    onCancel={() => setActing(null)}
                  />
                )}
              </Card>
            </Stack>
          ) : (
            <Stack direction="column" gap="6">
              <Text textStyle="label" color="rust">
                Blank card
              </Text>
              <BlankCardB
                key={`${sourceId}-${saves}`}
                sections={sectionsForSource(state, sourceId)}
                prefilledSection={last?.section ?? ''}
                focusPosition={saves > 0}
                onSave={(input) => {
                  const created = store.addLiteratureNote(sourceId, input);
                  setJustSaved(created.id);
                  setSaves((s) => s + 1);
                }}
              />
            </Stack>
          )}
        </Stack>

        <Stack direction="column" gap="7" flex="1" minW="0" maxW="38rem">
          <Text textStyle="label" color="inkSoft">
            Filed from this Source
          </Text>
          {notes.length === 0 && (
            <Text textStyle="body" color="inkSoft" fontStyle="italic">
              The stack is empty. Write the first card.
            </Text>
          )}
          {notes.map((note, i) => {
            const previous = notes[i - 1];
            const newDay = !previous || !sameDay(previous.createdAt, note.createdAt);
            return (
              <Stack direction="column" gap="3" key={note.id}>
                {newDay && (
                  <Text textStyle="label" color="inkSoft" mb="3">
                    {dayLabel(note.createdAt)}
                  </Text>
                )}
                <IndexCard
                  label={note.section ?? 'No section'}
                  catalogNumber={renderPosition(note.position) ?? 'No position'}
                  accent={note.openQuestion ? 'inkBlue' : 'rust'}
                  pt="6"
                  pb="8"
                >
                  <Stack direction="column" gap="2">
                    {note.id === justSaved && (
                      <Text textStyle="label" color="moss">
                        Filed just now
                      </Text>
                    )}
                    {note.openQuestion && (
                      <Text textStyle="label" color="inkBlue">
                        Open question
                      </Text>
                    )}
                    <Text textStyle="body" color="ink">
                      {note.body}
                    </Text>
                    {note.excerpt && (
                      <Text textStyle="body" color="inkSoft" fontStyle="italic">
                        &ldquo;{note.excerpt}&rdquo;
                      </Text>
                    )}
                    <NoteConnections state={state} noteId={note.id} />
                  </Stack>
                </IndexCard>
                <Stack gap="3" align="center" wrap="wrap" pl="5">
                  <Text textStyle="label" color="inkSoft">
                    {timeLabel(note.createdAt)}
                  </Text>
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
                    Permanent note from this
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
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
