// PROTOTYPE - Variant C: "Reading position". The Locator leaves the form and becomes page state.
// A bar under the header says where you are reading and stays there while you scroll; every note
// captured is filed at whatever it reads. Capture is then a single line, because the where has
// already been answered - you touch the bar when you turn a page, not when you write a note.
//
// This is the variant that argues with a detail of #68: it resumes the position from the last
// note instead of leaving it empty and focused, on the theory that a reader picks up where they
// stopped and that consecutive notes on one page should cost nothing. If that turns out to file
// notes at stale positions, the blank-and-focused field wins and A or B is the answer.
//
// The stream is grouped under section headings, since the section is now the spine of the page
// rather than a field of each note. Acting on a note is select-then-act: click the note, and its
// affordances open under it. See NotesCapturePrototype.tsx for the shared, settled pieces.
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { SourceHeader } from './shared/SourceHeader.tsx';
import { SourceSwitcher } from './shared/SourceSwitcher.tsx';
import { SectionSuggestions } from './shared/SectionSuggestions.tsx';
import { LinkFlow } from './shared/LinkFlow.tsx';
import { PermanentComposer } from './shared/PermanentComposer.tsx';
import { NoteConnections } from './shared/NoteConnections.tsx';
import type { CaptureStore, LinkDraft, LiteratureNote } from './captureNotesData.ts';
import {
  lastNoteFor,
  notesForSource,
  renderPosition,
  sectionsForSource,
  sourceById,
  timeLabel,
} from './captureNotesData.ts';

type Acting = { noteId: string; mode: 'link' } | { noteId: string; mode: 'permanent' };

interface Group {
  section: string | null;
  notes: LiteratureNote[];
}

// Creation order is preserved (#68); the section headings are cut where it changes, so a
// section the reader returned to later simply appears twice.
const groupBySection = (notes: LiteratureNote[]): Group[] =>
  notes.reduce<Group[]>((groups, note) => {
    const current = groups[groups.length - 1];
    if (current && current.section === note.section) {
      current.notes.push(note);
      return groups;
    }
    return [...groups, { section: note.section, notes: [note] }];
  }, []);

function CaptureLineC({
  positionLabel,
  onSave,
}: {
  positionLabel: string;
  onSave: (body: string, excerpt: string | null, openQuestion: boolean) => void;
}) {
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState(false);
  const canSave = body.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    onSave(body.trim(), excerpt.trim() || null, openQuestion);
  };

  return (
    <Stack direction="column" gap="2">
      <Textarea
        rows={body.length > 160 ? 5 : 3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        placeholder="What is worth keeping? A few sentences on one point, written closed-book."
      />
      {excerptOpen && (
        <Textarea
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="The author’s exact words"
          fontStyle="italic"
          autoFocus
        />
      )}
      <Stack justify="space-between" align="center" wrap="wrap" gap="3">
        <Stack gap="3" align="center" wrap="wrap">
          {!excerptOpen && (
            <Button variant="link" size="xs" onClick={() => setExcerptOpen(true)}>
              Add the author&rsquo;s exact words
            </Button>
          )}
          <Button
            variant="link"
            size="xs"
            color={openQuestion ? 'rust' : undefined}
            onClick={() => setOpenQuestion((v) => !v)}
          >
            {openQuestion ? 'Leaving this open' : 'Leave this open'}
          </Button>
        </Stack>
        <Stack gap="3" align="center">
          <Text textStyle="label" color="inkSoft">
            Files at {positionLabel}
          </Text>
          <Button size="sm" disabled={!canSave} onClick={save}>
            Save note
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

export function VariantC({ store }: { store: CaptureStore }) {
  const { state } = store;
  const [sourceId, setSourceId] = useState('src-1');
  const [saves, setSaves] = useState(0);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [acting, setActing] = useState<Acting | null>(null);
  const [prelink, setPrelink] = useState<LinkDraft[]>([]);

  const source = sourceById(state, sourceId);
  const notes = notesForSource(state, sourceId);
  const last = lastNoteFor(state, sourceId);

  // The reading position: page state, seeded from where this Source was left.
  const [section, setSection] = useState(last?.section ?? '');
  const [position, setPosition] = useState(last?.position ?? '');
  const [editingSection, setEditingSection] = useState(false);
  const numeric = /^\d+$/.test(position.trim());
  const step = (delta: number) => setPosition(String(Math.max(0, Number(position.trim()) + delta)));
  const positionLabel = renderPosition(position.trim() || null) ?? 'no position';

  const openSource = (id: string) => {
    const lastOfNext = lastNoteFor(state, id);
    setSourceId(id);
    setSection(lastOfNext?.section ?? '');
    setPosition(lastOfNext?.position ?? '');
    setJustSaved(null);
    setSelected(null);
    setActing(null);
    setSaves(0);
  };

  const startPermanent = (noteId: string, links: LinkDraft[]) => {
    setPrelink(links);
    setActing({ noteId, mode: 'permanent' });
  };

  return (
    <Stack direction="column" gap="6" maxW="46rem">
      <SourceSwitcher state={state} sourceId={sourceId} onOpen={openSource} />
      <SourceHeader
        state={state}
        source={source}
        onClearOpenQuestion={(id) => store.updateLiteratureNote(id, { openQuestion: false })}
      />

      <Stack
        direction="column"
        gap="3"
        position="sticky"
        top="0"
        zIndex="5"
        bg="paper"
        borderTopWidth="1px"
        borderBottomWidth="1px"
        borderColor="line"
        py="3"
      >
        <Stack gap="3" align="center" wrap="wrap">
          <Text textStyle="label" color="rust">
            Reading
          </Text>
          {editingSection ? (
            <Input
              size="sm"
              w="16rem"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              onBlur={() => setEditingSection(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingSection(false);
              }}
              placeholder="Chapter, segment, heading"
              aria-label="Section"
              autoFocus
            />
          ) : (
            <Button variant="outline" size="xs" onClick={() => setEditingSection(true)}>
              {section.trim() || 'No section'}
            </Button>
          )}
          <Stack gap="1" align="center">
            {numeric && (
              <IconButton
                icon={Minus}
                aria-label="Back a page"
                size="xs"
                variant="outline"
                onClick={() => step(-1)}
              />
            )}
            <Input
              size="sm"
              w="7rem"
              textAlign="center"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Page, timestamp"
              aria-label="Position"
            />
            {numeric && (
              <IconButton
                icon={Plus}
                aria-label="Forward a page"
                size="xs"
                variant="outline"
                onClick={() => step(1)}
              />
            )}
          </Stack>
          <Text textStyle="label" color="inkSoft">
            {positionLabel}
          </Text>
        </Stack>
        <SectionSuggestions
          sections={sectionsForSource(state, sourceId)}
          value={section}
          onPick={setSection}
          label="Move to"
        />
      </Stack>

      <CaptureLineC
        key={`${sourceId}-${saves}`}
        positionLabel={[section.trim(), positionLabel].filter(Boolean).join(' · ')}
        onSave={(body, excerpt, openQuestion) => {
          const created = store.addLiteratureNote(sourceId, {
            section: section.trim() || null,
            position: position.trim() || null,
            body,
            excerpt,
            openQuestion,
          });
          setJustSaved(created.id);
          setSelected(null);
          setActing(null);
          setSaves((s) => s + 1);
        }}
      />

      <Stack direction="column" gap="7" pt="2">
        {notes.length === 0 && (
          <Text textStyle="body" color="inkSoft" fontStyle="italic">
            Nothing written from this yet.
          </Text>
        )}
        {groupBySection(notes).map((group) => (
          <Stack
            direction="column"
            gap="4"
            key={(group.notes[0] as LiteratureNote).id}
            borderTopWidth="1px"
            borderColor="line"
            pt="4"
          >
            <Heading as="h2" variant="card">
              {group.section ?? 'No section'}
            </Heading>
            {group.notes.map((note) => {
              const isSelected = selected === note.id;
              return (
                <Stack direction="column" gap="2" key={note.id} pl="1">
                  <Stack
                    gap="4"
                    align="flex-start"
                    cursor="pointer"
                    onClick={() => setSelected(isSelected ? null : note.id)}
                  >
                    <Text textStyle="label" color="rust" minW="4.5rem" pt="1">
                      {renderPosition(note.position) ?? '—'}
                    </Text>
                    <Stack direction="column" gap="1" flex="1" minW="0">
                      <Text textStyle="body" color="ink">
                        {note.body}
                      </Text>
                      {note.excerpt && (
                        <Text textStyle="body" color="inkSoft" fontStyle="italic">
                          &ldquo;{note.excerpt}&rdquo;
                        </Text>
                      )}
                      <Stack gap="3" align="center" wrap="wrap">
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
                      <NoteConnections state={state} noteId={note.id} />
                    </Stack>
                  </Stack>
                  {isSelected && (
                    <Stack direction="column" gap="3" pl="6.5rem">
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
                          onClick={() =>
                            startPermanent(note.id, [{ targetId: note.id, reason: '' }])
                          }
                        >
                          Write a Permanent note from this
                        </Button>
                        <Button
                          variant="link"
                          size="xs"
                          onClick={() =>
                            store.updateLiteratureNote(note.id, {
                              openQuestion: !note.openQuestion,
                            })
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
                              onLink={(targetId, reason) =>
                                store.addLink(note.id, targetId, reason)
                              }
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
                  )}
                </Stack>
              );
            })}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
