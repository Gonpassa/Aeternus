// PROTOTYPE - Variant B: "Sources / Sittings". One rail entry, "Notes", with three tabs
// inside: Sources, Sittings, Topics. A sitting is a first-class dated thing you open, laid
// out as a manuscript to re-read; the Permanent-note invitation is a ghost line under each
// Literature note that expands into a composer anchored to that note (already linked, reason
// first). Permanent notes written from the sitting sit in the margin. See NotesPrototype.tsx.
import { useState } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { Dot } from '../../atoms/Dot/Dot.tsx';
import { RuledNote } from '../../atoms/RuledNote/RuledNote.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { FieldLabel } from '../../atoms/FieldLabel/FieldLabel.tsx';
import { Tabs } from '../../atoms/Tabs/Tabs.tsx';
import { Tab } from '../../atoms/Tab/Tab.tsx';
import { RailPreview } from './shared/RailPreview.tsx';
import { TopicTag } from './shared/TopicTag.tsx';
import { CaptureForm } from './shared/CaptureForm.tsx';
import { LinkPicker } from './shared/LinkPicker.tsx';
import { ConnectionsView } from './shared/ConnectionsView.tsx';
import { TopicView } from './shared/TopicView.tsx';
import { usePermanentDraft } from './shared/usePermanentDraft.ts';
import type { LiteratureNote, NotesStore, Sitting } from './prototypeNotesData.ts';
import {
  KIND_LABEL,
  lastNoteDate,
  linkLabel,
  notesForSource,
  permanentById,
  renderLocator,
  sittingLabel,
  sittings,
  sourceById,
  sourcesByRecency,
} from './prototypeNotesData.ts';

type TabKey = 'sources' | 'sittings' | 'topics';
type Screen =
  | { kind: 'sources' }
  | { kind: 'source'; id: string }
  | { kind: 'sittings' }
  | { kind: 'sitting'; key: string; openPermanent: string | null }
  | { kind: 'permanent'; id: string }
  | { kind: 'topics' }
  | { kind: 'topic'; name: string };

const tabOf = (screen: Screen): TabKey => {
  if (screen.kind === 'sources' || screen.kind === 'source') return 'sources';
  if (screen.kind === 'topics' || screen.kind === 'topic') return 'topics';
  return 'sittings';
};

// One sitting opened: the manuscript of that day's Literature notes, grouped by Source, with
// the composer inline under whichever note the user is answering. The margin holds what has
// been written from this sitting, and opens a note's connections in place.
function SittingB({
  store,
  sitting,
  openPermanentId,
  onOpenPermanent,
  onBack,
  onOpenSource,
  onOpenTopic,
}: {
  store: NotesStore;
  sitting: Sitting;
  openPermanentId: string | null;
  onOpenPermanent: (id: string | null) => void;
  onBack: () => void;
  onOpenSource: (id: string) => void;
  onOpenTopic: (name: string) => void;
}) {
  const { state } = store;
  const [answering, setAnswering] = useState<string | null>(null);
  const draft = usePermanentDraft();

  const startAnswer = (note: LiteratureNote) => {
    draft.reset([{ targetId: note.id, reason: '' }]);
    setAnswering(note.id);
  };
  const save = () => {
    const created = store.addPermanentNote(
      { title: draft.title.trim(), body: draft.body.trim(), topics: draft.topics },
      draft.links,
    );
    draft.reset();
    setAnswering(null);
    onOpenPermanent(created.id);
  };

  const bySource = new Map<string, LiteratureNote[]>();
  sitting.notes.forEach((n) => bySource.set(n.sourceId, [...(bySource.get(n.sourceId) ?? []), n]));
  const openNote = openPermanentId ? permanentById(state, openPermanentId) : undefined;

  return (
    <Stack direction="column" gap="6">
      <Stack justify="space-between" align="baseline">
        <Button variant="link" size="xs" onClick={onBack}>
          &larr; Sittings
        </Button>
        <Text textStyle="label" color="inkSoft">
          {sitting.notes.length} notes &middot; {sitting.written.length} written
        </Text>
      </Stack>
      <Stack direction="column" gap="0">
        <Text variant="eyebrow" color="rust">
          Sitting
        </Text>
        <Heading as="h2" variant="section">
          {sittingLabel(sitting.date)}
        </Heading>
      </Stack>
      <Stack gap="10" align="flex-start" direction={{ base: 'column', lg: 'row' }}>
        <Stack direction="column" gap="8" flex="1" minW="0" maxW="42rem">
          {[...bySource.entries()].map(([sourceId, notes]) => (
            <Stack key={sourceId} direction="column" gap="4">
              <Button
                variant="ghost"
                h="auto"
                textTransform="none"
                letterSpacing="normal"
                px="0"
                py="0"
                justifyContent="flex-start"
                textStyle="label"
                color="rust"
                _hover={{ textDecoration: 'underline' }}
                onClick={() => onOpenSource(sourceId)}
              >
                {sourceById(state, sourceId).title}
              </Button>
              {notes.map((note) => {
                const isAnswering = answering === note.id;
                const writtenFrom = state.permanentNotes.filter((p) =>
                  state.links.some((l) => l.originId === p.id && l.targetId === note.id),
                );
                return (
                  <Stack
                    key={note.id}
                    direction="column"
                    gap="2"
                    borderBottomWidth="1px"
                    borderColor="line"
                    pb="4"
                  >
                    <Text textStyle="label" color="inkSoft">
                      {renderLocator(note)}
                    </Text>
                    <Text textStyle="body" color="ink">
                      {note.body}
                    </Text>
                    {note.excerpt && (
                      <Text textStyle="body" color="inkSoft" fontStyle="italic">
                        &ldquo;{note.excerpt}&rdquo;
                      </Text>
                    )}
                    {writtenFrom.map((p) => (
                      <Button
                        key={p.id}
                        variant="link"
                        size="xs"
                        alignSelf="flex-start"
                        color="moss"
                        onClick={() => onOpenPermanent(p.id)}
                      >
                        &rarr; {p.title}
                      </Button>
                    ))}
                    {!isAnswering && (
                      <Button
                        variant="ghost"
                        size="xs"
                        alignSelf="flex-start"
                        px="0"
                        color="inkSoft"
                        fontStyle="italic"
                        fontFamily="body"
                        textTransform="none"
                        letterSpacing="normal"
                        fontSize="1rem"
                        _hover={{ color: 'moss', textDecoration: 'none' }}
                        onClick={() => startAnswer(note)}
                      >
                        What does this mean for what you already think?
                      </Button>
                    )}
                    {isAnswering && (
                      <RuledNote rule="moss" mt="2">
                        <Stack direction="column" gap="3">
                          <Text textStyle="label" color="moss">
                            A Permanent note, from this
                          </Text>
                          <Input
                            variant="title"
                            placeholder="State the idea as a full sentence."
                            value={draft.title}
                            onChange={(e) => draft.setTitle(e.target.value)}
                            autoFocus
                          />
                          <Textarea
                            rows={4}
                            placeholder="One idea, for someone who has not read the Source."
                            value={draft.body}
                            onChange={(e) => draft.setBody(e.target.value)}
                          />
                          <LinkPicker
                            state={state}
                            drafts={draft.links}
                            onChange={draft.setLinks}
                            compact
                          />
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
                            <Button size="sm" disabled={!draft.canSave} onClick={save}>
                              Save Permanent note
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAnswering(null)}>
                              Not now
                            </Button>
                          </Stack>
                        </Stack>
                      </RuledNote>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          ))}
        </Stack>
        <Stack
          direction="column"
          gap="4"
          w={{ base: 'full', lg: '20rem' }}
          flexShrink="0"
          position={{ lg: 'sticky' }}
          top="4"
        >
          {openNote ? (
            <Card>
              <Stack direction="column" gap="3">
                <Button
                  variant="link"
                  size="xs"
                  alignSelf="flex-start"
                  onClick={() => onOpenPermanent(null)}
                >
                  &larr; Written from this sitting
                </Button>
                <Heading as="h3" variant="card">
                  {openNote.title}
                </Heading>
                <Text textStyle="body" color="ink">
                  {openNote.body}
                </Text>
                <Stack gap="1.5" wrap="wrap">
                  {openNote.topics.map((t) => (
                    <TopicTag key={t} topic={t} onOpen={onOpenTopic} />
                  ))}
                </Stack>
                <ConnectionsView
                  state={state}
                  noteId={openNote.id}
                  onOpenNote={(other) =>
                    permanentById(state, other) ? onOpenPermanent(other) : undefined
                  }
                  onAddLink={() => {}}
                />
              </Stack>
            </Card>
          ) : (
            <>
              <Text textStyle="label" color="inkSoft">
                Written from this sitting
              </Text>
              {sitting.written.length === 0 && (
                <Text textStyle="body" color="inkSoft" fontStyle="italic">
                  Nothing yet. Answer a note on the left to write one.
                </Text>
              )}
              {sitting.written.map((p) => (
                <RuledNote key={p.id} rule="moss">
                  <Button
                    variant="ghost"
                    h="auto"
                    textTransform="none"
                    letterSpacing="normal"
                    px="0"
                    py="0"
                    whiteSpace="normal"
                    textAlign="left"
                    justifyContent="flex-start"
                    textStyle="cardTitle"
                    fontFamily="heading"
                    color="ink"
                    onClick={() => onOpenPermanent(p.id)}
                  >
                    {p.title}
                  </Button>
                  <Text textStyle="label" color="inkSoft" mt="1">
                    {linkLabel(state, p.id)}
                  </Text>
                </RuledNote>
              ))}
            </>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

export function VariantB({ store }: { store: NotesStore }) {
  const { state } = store;
  const [screen, setScreen] = useState<Screen>({ kind: 'sources' });
  const [newTitle, setNewTitle] = useState('');
  const openTopic = (name: string) => setScreen({ kind: 'topic', name });
  const openPermanent = (id: string) => setScreen({ kind: 'permanent', id });
  const openSource = (id: string) => setScreen({ kind: 'source', id });
  const all = sittings(state);
  const unwritten = all.filter((s) => s.written.length === 0).length;

  const renderSources = () => (
    <Stack direction="column" gap="5">
      <Stack direction="column" borderTopWidth="1px" borderColor="line">
        {sourcesByRecency(state).map((source) => {
          const count = notesForSource(state, source.id).length;
          const last = lastNoteDate(state, source.id);
          return (
            <Button
              key={source.id}
              variant="ghost"
              h="auto"
              textTransform="none"
              letterSpacing="normal"
              px="0"
              py="4"
              borderBottomWidth="1px"
              borderColor="line"
              borderRadius="0"
              justifyContent="flex-start"
              whiteSpace="normal"
              textAlign="left"
              _hover={{ bg: 'paperCard', textDecoration: 'none' }}
              onClick={() => openSource(source.id)}
            >
              <Stack w="full" gap="4" align="baseline">
                <Stack direction="column" gap="0.5" flex="1">
                  <Text textStyle="cardTitle" fontFamily="heading" color="ink">
                    {source.title}
                  </Text>
                  <Text textStyle="label" color="inkSoft">
                    {KIND_LABEL[source.kind]}
                    {source.author ? ` · ${source.author}` : ''}
                  </Text>
                </Stack>
                <Text textStyle="label" color="inkSoft" textAlign="right">
                  {count
                    ? `${count} ${count === 1 ? 'note' : 'notes'} · ${sittingLabel(last as Date)}`
                    : 'Not started'}
                </Text>
              </Stack>
            </Button>
          );
        })}
      </Stack>
      <Stack gap="3" align="flex-end">
        <FieldLabel eyebrow flex="1">
          New Source
          <Input
            size="sm"
            value={newTitle}
            placeholder="Title"
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </FieldLabel>
        <Button
          size="sm"
          variant="outline"
          disabled={!newTitle.trim()}
          onClick={() => {
            const s = store.addSource({
              title: newTitle.trim(),
              kind: 'book',
              author: null,
              url: null,
              topics: [],
            });
            setNewTitle('');
            openSource(s.id);
          }}
        >
          Open it
        </Button>
      </Stack>
    </Stack>
  );

  const renderSource = (id: string) => {
    const source = sourceById(state, id);
    const notes = notesForSource(state, id);
    return (
      <Stack direction="column" gap="6">
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setScreen({ kind: 'sources' })}
        >
          &larr; All Sources
        </Button>
        <Stack justify="space-between" align="flex-end" gap="6" wrap="wrap">
          <Stack direction="column" gap="1">
            <Heading as="h2" variant="section">
              {source.title}
            </Heading>
            <Text textStyle="label" color="inkSoft">
              {KIND_LABEL[source.kind]}
              {source.author ? ` · ${source.author}` : ''} &middot; {notes.length} notes
            </Text>
          </Stack>
          <Stack gap="1.5" wrap="wrap">
            {source.topics.map((t) => (
              <TopicTag key={t} topic={t} onOpen={openTopic} />
            ))}
          </Stack>
        </Stack>
        <Card>
          <CaptureForm
            key={notes.length}
            lastNote={notes[notes.length - 1] ?? null}
            onSave={(input) => store.addLiteratureNote({ ...input, sourceId: id })}
          />
        </Card>
        <Stack direction="column" gap="0" borderTopWidth="1px" borderColor="line">
          {[...notes].reverse().map((note) => (
            <Stack
              key={note.id}
              gap="5"
              py="4"
              borderBottomWidth="1px"
              borderColor="line"
              align="flex-start"
            >
              <Text textStyle="label" color="inkSoft" minW="9rem" pt="1">
                {renderLocator(note)}
              </Text>
              <Stack direction="column" gap="1" flex="1">
                <Text textStyle="body" color="ink">
                  {note.body}
                </Text>
                {note.excerpt && (
                  <Text textStyle="body" color="inkSoft" fontStyle="italic">
                    &ldquo;{note.excerpt}&rdquo;
                  </Text>
                )}
              </Stack>
              <Text textStyle="label" color="inkSoft" pt="1">
                {sittingLabel(note.createdAt)}
              </Text>
            </Stack>
          ))}
        </Stack>
        <Text textStyle="label" color="inkSoft">
          Newest first. Re-reading happens in Sittings, not here.
        </Text>
      </Stack>
    );
  };

  const renderSittings = () => (
    <Stack direction="column" gap="5">
      <Text textStyle="body" color="inkSoft">
        Each day you read is a sitting. Come back within a day and sit with what you wrote.
      </Text>
      <Stack direction="column" borderTopWidth="1px" borderColor="line">
        {all.map((s) => {
          const sourceCount = new Set(s.notes.map((n) => n.sourceId)).size;
          return (
            <Button
              key={s.key}
              variant="ghost"
              h="auto"
              textTransform="none"
              letterSpacing="normal"
              px="0"
              py="4"
              borderBottomWidth="1px"
              borderColor="line"
              borderRadius="0"
              justifyContent="flex-start"
              whiteSpace="normal"
              textAlign="left"
              _hover={{ bg: 'paperCard', textDecoration: 'none' }}
              onClick={() => setScreen({ kind: 'sitting', key: s.key, openPermanent: null })}
            >
              <Stack w="full" gap="4" align="center">
                <Dot color={s.written.length ? 'moss' : 'rust'} size="2.5" />
                <Stack direction="column" gap="0.5" flex="1">
                  <Text textStyle="cardTitle" fontFamily="heading" color="ink">
                    {sittingLabel(s.date)}
                  </Text>
                  <Text textStyle="label" color="inkSoft">
                    {s.notes.length} notes across {sourceCount}{' '}
                    {sourceCount === 1 ? 'source' : 'sources'}
                  </Text>
                </Stack>
                <Text textStyle="label" color={s.written.length ? 'moss' : 'rust'}>
                  {s.written.length
                    ? `${s.written.length} Permanent ${s.written.length === 1 ? 'note' : 'notes'}`
                    : 'Not sat with yet'}
                </Text>
              </Stack>
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );

  const renderPermanent = (id: string) => {
    const note = permanentById(state, id);
    if (!note) return null;
    return (
      <Stack direction="column" gap="6">
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setScreen({ kind: 'sittings' })}
        >
          &larr; Sittings
        </Button>
        <Stack direction="column" gap="2">
          <Text variant="eyebrow" color="rust">
            Permanent note
          </Text>
          <Heading as="h2" variant="section">
            {note.title}
          </Heading>
          <Text textStyle="body" color="ink">
            {note.body}
          </Text>
          <Stack gap="1.5" wrap="wrap">
            {note.topics.map((t) => (
              <TopicTag key={t} topic={t} onOpen={openTopic} />
            ))}
          </Stack>
        </Stack>
        <ConnectionsView
          state={state}
          noteId={id}
          onOpenNote={(other) => (permanentById(state, other) ? openPermanent(other) : undefined)}
          onAddLink={() => {}}
        />
      </Stack>
    );
  };

  const renderTopics = () => (
    <Stack direction="column" borderTopWidth="1px" borderColor="line">
      {state.topics.map((t) => (
        <Button
          key={t}
          variant="ghost"
          h="auto"
          textTransform="none"
          letterSpacing="normal"
          px="0"
          py="3"
          borderBottomWidth="1px"
          borderColor="line"
          borderRadius="0"
          justifyContent="space-between"
          _hover={{ bg: 'paperCard', textDecoration: 'none' }}
          onClick={() => openTopic(t)}
        >
          <Text textStyle="cardTitle" fontFamily="heading" color="ink">
            {t}
          </Text>
          <Text textStyle="label" color="inkSoft">
            {state.permanentNotes.filter((p) => p.topics.includes(t)).length} permanent &middot;{' '}
            {state.sources.filter((s) => s.topics.includes(t)).length} sources
          </Text>
        </Button>
      ))}
    </Stack>
  );

  const inSitting = screen.kind === 'sitting';

  return (
    <Stack gap="10" align="flex-start" direction={{ base: 'column', md: 'row' }}>
      <RailPreview
        entries={[{ key: 'notes', label: unwritten ? `Notes · ${unwritten}` : 'Notes' }]}
        active="notes"
        onSelect={() => setScreen({ kind: 'sources' })}
      />
      <Stack direction="column" flex="1" minW="0" gap="6" maxW={inSitting ? undefined : '42rem'}>
        <Stack direction="column" gap="1">
          <Heading as="h1" variant="page">
            Notes
          </Heading>
        </Stack>
        <Tabs
          value={tabOf(screen)}
          onChange={(v) => setScreen({ kind: v as TabKey })}
          aria-label="Notes sections"
        >
          <Tab value="sources" label="Sources" />
          <Tab
            value="sittings"
            label={unwritten ? `Sittings · ${unwritten} waiting` : 'Sittings'}
          />
          <Tab value="topics" label="Topics" />
        </Tabs>
        {screen.kind === 'sources' && renderSources()}
        {screen.kind === 'source' && renderSource(screen.id)}
        {screen.kind === 'sittings' && renderSittings()}
        {screen.kind === 'sitting' && (
          <SittingB
            store={store}
            sitting={all.find((s) => s.key === screen.key) as Sitting}
            openPermanentId={screen.openPermanent}
            onOpenPermanent={(pid) => setScreen({ ...screen, openPermanent: pid })}
            onBack={() => setScreen({ kind: 'sittings' })}
            onOpenSource={openSource}
            onOpenTopic={openTopic}
          />
        )}
        {screen.kind === 'permanent' && renderPermanent(screen.id)}
        {screen.kind === 'topics' && renderTopics()}
        {screen.kind === 'topic' && (
          <Stack direction="column" gap="4">
            <Button
              variant="link"
              size="xs"
              alignSelf="flex-start"
              onClick={() => setScreen({ kind: 'topics' })}
            >
              &larr; All Topics
            </Button>
            <TopicView
              state={state}
              topic={screen.name}
              onOpenPermanent={openPermanent}
              onOpenSource={openSource}
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
