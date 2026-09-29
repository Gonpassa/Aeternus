// PROTOTYPE - Variant B: "Write on the card". A desk with one working surface. The form is not a
// form: it is a blank index card, the same object the note becomes, so nothing is translated
// between writing and reading. The section is the card's die-cut tab, the position is its catalog
// number in the bottom-right, the body is the card's face, and the quote is a slip clipped
// beneath it. Filing the card moves it into the stack on the right and hands you a fresh blank
// with the tab still set. A filed card carries its own tray of actions, attached to its bottom
// edge so the row can never be read as belonging to the card below. Acting on a filed card takes
// over the desk rather than opening inside the stack. See NotesCapturePrototype.tsx for the shared, already-settled pieces.
import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Dialog } from '../../atoms/Dialog/Dialog.tsx';
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
  // A card with no position cannot be found again in the Source, so the catalog number is
  // required. The card says so itself, in the slot, and only once there is a body to file.
  const canSave = body.trim().length > 0 && position.trim().length > 0;
  const positionMissing = body.trim().length > 0 && position.trim().length === 0;

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
          resize="vertical"
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
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              onBlur={() => setEditingPosition(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setEditingPosition(false);
                }
              }}
              placeholder={positionMissing ? 'Position needed' : 'Position'}
              aria-label="Position"
              aria-required="true"
              autoFocus={focusPosition || editingPosition}
              textAlign="right"
              bg="transparent"
              borderWidth="0"
              borderBottomWidth="1px"
              borderColor={positionMissing ? 'rust' : 'line'}
              borderRadius="0"
              textStyle="label"
              w={positionMissing ? '9rem' : '6rem'}
              _placeholder={positionMissing ? { color: 'rust' } : undefined}
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
        <Card position="relative" bg="paper" padding="sm">
          <IconButton
            icon={X}
            aria-label="Discard the quote"
            variant="ghost"
            size="xs"
            position="absolute"
            top="1"
            right="1"
            onClick={() => {
              setExcerpt('');
              setExcerptOpen(false);
            }}
          />
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
            resize="vertical"
            autoFocus
            _focusVisible={{ boxShadow: 'none', outline: 'none', bg: 'paper/50' }}
          />
        </Card>
      ) : (
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          ml="-2"
          onClick={() => setExcerptOpen(true)}
        >
          Add quote
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
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const source = sourceById(state, sourceId);
  const notes = notesForSource(state, sourceId);
  const last = lastNoteFor(state, sourceId);
  const actingNote = acting ? notes.find((n) => n.id === acting.noteId) : undefined;
  const doomedNote = pendingDelete ? notes.find((n) => n.id === pendingDelete) : undefined;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (acting?.noteId === pendingDelete) setActing(null);
    if (justSaved === pendingDelete) setJustSaved(null);
    store.deleteLiteratureNote(pendingDelete);
    setPendingDelete(null);
  };

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

        {/* No heading over the stack: the first day label sits where the blank card's own label
            sits, so the first filed card lines up with the blank card at the top of the page. */}
        <Stack direction="column" gap="8" flex="1" minW="0" maxW="38rem">
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
                <Stack direction="column" gap="0">
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
                  {/* The actions sit in a tray attached to the bottom of the card they act on -
                      no gap, the card's own border carried down - so a row between two cards can
                      never be read as belonging to the one below it. */}
                  <Stack
                    justify="space-between"
                    align="center"
                    gap="2"
                    bg="paper"
                    borderWidth="1px"
                    borderTopWidth="0"
                    borderColor="line"
                    px="4"
                    py="2"
                  >
                    <Stack gap="2" align="center" wrap="wrap">
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
                    <IconButton
                      icon={Trash2}
                      aria-label="Delete this card"
                      variant="destructive"
                      size="xs"
                      flexShrink="0"
                      onClick={() => setPendingDelete(note.id)}
                    />
                  </Stack>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
      {/* Deleting is the one move here with no undo, so it is interruptive and names the card
          being binned by its tab and catalog number rather than saying "this card". */}
      <Dialog
        open={doomedNote !== undefined}
        onClose={() => setPendingDelete(null)}
        variant="small"
        role="alertdialog"
        header={{ title: 'Delete this card?' }}
        footer={{
          secondary: { label: 'Keep it', onClick: () => setPendingDelete(null) },
          primary: { label: 'Delete', variant: 'destructive', onClick: confirmDelete },
        }}
      >
        <Stack direction="column" gap="2">
          <Text textStyle="label" color="inkSoft">
            {[doomedNote?.section, renderPosition(doomedNote?.position ?? null)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text textStyle="body" color="ink">
            {doomedNote?.body}
          </Text>
          <Text textStyle="body" color="inkSoft">
            The card goes, and its links go with it. This cannot be undone.
          </Text>
        </Stack>
      </Dialog>
    </Stack>
  );
}
