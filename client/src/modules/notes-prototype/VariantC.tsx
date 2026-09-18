// PROTOTYPE - Variant C: "Read / Review". Two rail entries under Notes. Read is a catalog of
// Source index cards (the demo's Research catalog), and a Source open puts capture beside
// the stream. Review is a guided pass: one Literature note at a time, "Nothing of mine here"
// or "Write a Permanent note from this", with a progress count and a closing summary. Topics
// have no rail entry: the index is a filter strip on the catalog. See NotesPrototype.tsx.
import { useState } from 'react';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Button } from '../../atoms/Button/Button.tsx';
import { Card } from '../../atoms/Card/Card.tsx';
import { IndexCard } from '../../atoms/IndexCard/IndexCard.tsx';
import { RuledNote } from '../../atoms/RuledNote/RuledNote.tsx';
import { Input } from '../../atoms/Input/Input.tsx';
import { Textarea } from '../../atoms/Textarea/Textarea.tsx';
import { FieldLabel } from '../../atoms/FieldLabel/FieldLabel.tsx';
import { Grid } from '../../atoms/Grid/Grid.tsx';
import { RailPreview } from './shared/RailPreview.tsx';
import { TopicTag } from './shared/TopicTag.tsx';
import { CaptureForm } from './shared/CaptureForm.tsx';
import { LinkPicker } from './shared/LinkPicker.tsx';
import { ConnectionsView } from './shared/ConnectionsView.tsx';
import { TopicView } from './shared/TopicView.tsx';
import { usePermanentDraft } from './shared/usePermanentDraft.ts';
import type { NotesStore, Sitting } from './prototypeNotesData.ts';
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

type Screen =
  | { kind: 'read' }
  | { kind: 'source'; id: string }
  | { kind: 'review' }
  | { kind: 'permanent'; id: string }
  | { kind: 'topic'; name: string };

const railKey = (screen: Screen) => {
  if (screen.kind === 'source' || screen.kind === 'topic') return 'read';
  if (screen.kind === 'permanent') return 'review';
  return screen.kind;
};

// The guided review: one Literature note at a time from the chosen sitting, most recent
// sitting by default. The invitation is the second of two buttons under the card.
function ReviewC({
  store,
  onOpenPermanent,
  onOpenSource,
}: {
  store: NotesStore;
  onOpenPermanent: (id: string) => void;
  onOpenSource: (id: string) => void;
}) {
  const { state } = store;
  const all = sittings(state);
  const [sittingKey, setSittingKey] = useState<string | null>(all[0]?.key ?? null);
  const [index, setIndex] = useState(0);
  const [writing, setWriting] = useState(false);
  // What this pass wrote, keyed to the note it was written from, so the invitation
  // under a note can change once it has been answered.
  const [written, setWritten] = useState<{ pid: string; noteId: string }[]>([]);
  const draft = usePermanentDraft();
  const sitting = all.find((s) => s.key === sittingKey) as Sitting | undefined;

  const pick = (key: string) => {
    setSittingKey(key);
    setIndex(0);
    setWriting(false);
    setWritten([]);
  };
  const next = () => {
    setWriting(false);
    setIndex((i) => i + 1);
  };
  const startWriting = (noteId: string) => {
    draft.reset([{ targetId: noteId, reason: '' }]);
    setWriting(true);
  };
  const save = (fromNoteId: string) => {
    const created = store.addPermanentNote(
      { title: draft.title.trim(), body: draft.body.trim(), topics: draft.topics },
      draft.links,
    );
    setWritten((w) => [...w, { pid: created.id, noteId: fromNoteId }]);
    draft.reset();
    setWriting(false);
  };

  const header = (
    <Stack direction="column" gap="1">
      <Text variant="eyebrow" color="rust">
        Notes
      </Text>
      <Heading as="h1" variant="page">
        Review
      </Heading>
      <Stack gap="2" wrap="wrap" align="center" pt="2">
        <Text textStyle="label" color="inkSoft" mr="1">
          Sitting
        </Text>
        {all.map((s) => (
          <Button
            key={s.key}
            size="xs"
            variant={s.key === sittingKey ? 'default' : 'outline'}
            onClick={() => pick(s.key)}
          >
            {sittingLabel(s.date)} &middot; {s.notes.length}
          </Button>
        ))}
      </Stack>
    </Stack>
  );

  if (!sitting) {
    return (
      <Stack direction="column" gap="6">
        {header}
        <Text textStyle="body" color="inkSoft">
          Nothing to review. Read something first.
        </Text>
      </Stack>
    );
  }

  const note = sitting.notes[index];
  const done = !note;
  // Everything in the box from this sitting: earlier passes (read off the Links) plus
  // this pass, de-duplicated since the store already holds what this pass wrote.
  const inBox = [...new Set([...sitting.written.map((p) => p.id), ...written.map((w) => w.pid)])];
  const writtenFromThis = note ? written.filter((w) => w.noteId === note.id) : [];

  return (
    <Stack direction="column" gap="8" maxW="42rem">
      {header}
      {done ? (
        <Card>
          <Stack direction="column" gap="4">
            <Text textStyle="label" color="moss">
              Sitting finished
            </Text>
            <Heading as="h2" variant="section">
              {sitting.notes.length} notes re-read, {inBox.length} Permanent{' '}
              {inBox.length === 1 ? 'note' : 'notes'} in the box.
            </Heading>
            {inBox.map((pid) => {
              const p = permanentById(state, pid);
              return p ? (
                <RuledNote key={pid} rule="moss">
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
                    onClick={() => onOpenPermanent(pid)}
                  >
                    {p.title}
                  </Button>
                </RuledNote>
              ) : null;
            })}
            <Button
              variant="outline"
              size="sm"
              alignSelf="flex-start"
              onClick={() => pick(sitting.key)}
            >
              Go through it again
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack direction="column" gap="6">
          <Stack justify="space-between" align="baseline">
            <Text textStyle="label" color="inkSoft">
              {index + 1} of {sitting.notes.length} &middot; {sittingLabel(sitting.date)}
            </Text>
            <Button variant="link" size="xs" onClick={() => onOpenSource(note.sourceId)}>
              Open the Source
            </Button>
          </Stack>
          <IndexCard
            label={sourceById(state, note.sourceId).title}
            catalogNumber={renderLocator(note)}
            pb="12"
            px="8"
            pt="8"
          >
            <Stack direction="column" gap="3">
              <Text textStyle="body" color="ink" fontSize="1.25rem" lineHeight="1.55">
                {note.body}
              </Text>
              {note.excerpt && (
                <Text textStyle="body" color="inkSoft" fontStyle="italic">
                  &ldquo;{note.excerpt}&rdquo;
                </Text>
              )}
            </Stack>
          </IndexCard>
          {!writing && writtenFromThis.length === 0 && (
            <Stack gap="3" justify="center">
              <Button variant="outline" onClick={next}>
                Nothing of mine here
              </Button>
              <Button onClick={() => startWriting(note.id)}>
                Write a Permanent note from this
              </Button>
            </Stack>
          )}
          {!writing && writtenFromThis.length > 0 && (
            <Stack direction="column" gap="3">
              <Text textStyle="label" color="moss">
                Written from this note
              </Text>
              {writtenFromThis.map(({ pid }) => (
                <RuledNote key={pid} rule="moss">
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
                    onClick={() => onOpenPermanent(pid)}
                  >
                    {permanentById(state, pid)?.title}
                  </Button>
                </RuledNote>
              ))}
              <Stack gap="3" justify="center" pt="2">
                <Button variant="outline" onClick={() => startWriting(note.id)}>
                  Write another
                </Button>
                <Button onClick={next}>Next note &rarr;</Button>
              </Stack>
            </Stack>
          )}
          {writing && (
            <Card>
              <Stack direction="column" gap="4">
                <Text textStyle="label" color="rust">
                  What is yours in this?
                </Text>
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
                <LinkPicker state={state} drafts={draft.links} onChange={draft.setLinks} compact />
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
                  <Button disabled={!draft.canSave} onClick={() => save(note.id)}>
                    Put it in the box
                  </Button>
                  <Button variant="ghost" onClick={() => setWriting(false)}>
                    Back
                  </Button>
                </Stack>
              </Stack>
            </Card>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export function VariantC({ store }: { store: NotesStore }) {
  const { state } = store;
  const [screen, setScreen] = useState<Screen>({ kind: 'read' });
  const [filter, setFilter] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const openTopic = (name: string) => setScreen({ kind: 'topic', name });
  const openPermanent = (id: string) => setScreen({ kind: 'permanent', id });
  const openSource = (id: string) => setScreen({ kind: 'source', id });
  const today = sittings(state)[0];
  const waiting = today && today.written.length === 0 ? today.notes.length : 0;

  const renderRead = () => (
    <Stack direction="column" gap="6">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Read
        </Heading>
        <Text textStyle="body" color="inkSoft">
          Everything you are reading, filed where you will find it.
        </Text>
      </Stack>
      <Stack gap="2" wrap="wrap" align="center">
        <Text textStyle="label" color="inkSoft" mr="1">
          Topics
        </Text>
        <Button
          size="xs"
          variant={filter === null ? 'default' : 'outline'}
          onClick={() => setFilter(null)}
        >
          All
        </Button>
        {state.topics.map((t) => (
          <Button
            key={t}
            size="xs"
            variant={filter === t ? 'default' : 'outline'}
            onClick={() => setFilter(t)}
          >
            {t}
          </Button>
        ))}
        {filter && (
          <Button size="xs" variant="link" onClick={() => openTopic(filter)}>
            Open the Topic &rarr;
          </Button>
        )}
      </Stack>
      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
        gap="6"
        pt="3"
      >
        {sourcesByRecency(state)
          .filter((s) => !filter || s.topics.includes(filter))
          .map((source) => {
            const count = notesForSource(state, source.id).length;
            const last = lastNoteDate(state, source.id);
            return (
              <IndexCard
                key={source.id}
                label={KIND_LABEL[source.kind]}
                catalogNumber={count ? `${count} ${count === 1 ? 'note' : 'notes'}` : 'No notes'}
                accent={count ? 'rust' : 'inkBlue'}
                pb="10"
                cursor="pointer"
                _hover={{ bg: 'paper' }}
                onClick={() => openSource(source.id)}
              >
                <Stack direction="column" gap="2" pt="1">
                  <Heading as="h2" variant="card">
                    {source.title}
                  </Heading>
                  <Text textStyle="body" color="inkSoft">
                    {source.author ?? 'No author'}
                  </Text>
                  <Stack gap="1.5" wrap="wrap">
                    {source.topics.map((t) => (
                      <TopicTag key={t} topic={t} onOpen={openTopic} />
                    ))}
                  </Stack>
                  <Text textStyle="label" color="inkSoft" mt="2">
                    {last ? `Last note ${sittingLabel(last).toLowerCase()}` : 'Not started'}
                  </Text>
                </Stack>
              </IndexCard>
            );
          })}
        <Card>
          <Stack direction="column" gap="3" h="full" justify="center">
            <FieldLabel eyebrow>
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
              File it and start reading
            </Button>
          </Stack>
        </Card>
      </Grid>
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
          onClick={() => setScreen({ kind: 'read' })}
        >
          &larr; Read
        </Button>
        <Stack direction="column" gap="2">
          <Text variant="eyebrow" color="rust">
            {KIND_LABEL[source.kind]}
          </Text>
          <Heading as="h1" variant="page">
            {source.title}
          </Heading>
          <Stack gap="3" align="center" wrap="wrap">
            <Text textStyle="body" color="inkSoft">
              {source.author ?? 'No author'} &middot; {notes.length} notes
            </Text>
            {source.topics.map((t) => (
              <TopicTag key={t} topic={t} onOpen={openTopic} />
            ))}
          </Stack>
        </Stack>
        <Stack gap="10" align="flex-start" direction={{ base: 'column', lg: 'row' }}>
          <Card
            w={{ base: 'full', lg: '22rem' }}
            flexShrink="0"
            position={{ lg: 'sticky' }}
            top="4"
          >
            <Text textStyle="label" color="rust" mb="1">
              Keep reading
            </Text>
            <Text textStyle="body" color="inkSoft" mb="4">
              Stop at the first thing worth keeping.
            </Text>
            <CaptureForm
              key={notes.length}
              lastNote={notes[notes.length - 1] ?? null}
              onSave={(input) => store.addLiteratureNote({ ...input, sourceId: id })}
            />
          </Card>
          <Stack
            direction="column"
            gap="0"
            flex="1"
            minW="0"
            borderTopWidth="1px"
            borderColor="line"
          >
            {notes.length === 0 && (
              <Text textStyle="body" color="inkSoft" py="4">
                Nothing written from this yet.
              </Text>
            )}
            {notes.map((note, i) => (
              <Stack
                key={note.id}
                gap="5"
                py="4"
                borderBottomWidth="1px"
                borderColor="line"
                align="flex-start"
              >
                <Text textStyle="label" color="inkSoft" minW="2.5rem" pt="1">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Stack direction="column" gap="1" flex="1">
                  <Text textStyle="label" color="rust">
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
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Stack>
    );
  };

  const renderPermanent = (id: string) => {
    const note = permanentById(state, id);
    if (!note) return null;
    return (
      <Stack direction="column" gap="6" maxW="42rem">
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setScreen({ kind: 'review' })}
        >
          &larr; Review
        </Button>
        <IndexCard
          label="Permanent note"
          catalogNumber={linkLabel(state, note.id)}
          accent="moss"
          pb="10"
        >
          <Stack direction="column" gap="3" pt="1">
            <Heading as="h1" variant="section">
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
        </IndexCard>
        <ConnectionsView
          state={state}
          noteId={id}
          onOpenNote={(other) => (permanentById(state, other) ? openPermanent(other) : undefined)}
          onAddLink={() => {}}
        />
      </Stack>
    );
  };

  return (
    <Stack gap="10" align="flex-start" direction={{ base: 'column', md: 'row' }}>
      <RailPreview
        entries={[
          { key: 'notes', label: 'Notes' },
          { key: 'read', label: 'Read', nested: true },
          { key: 'review', label: waiting ? `Review · ${waiting}` : 'Review', nested: true },
        ]}
        active={railKey(screen)}
        onSelect={(key) => setScreen(key === 'review' ? { kind: 'review' } : { kind: 'read' })}
      />
      <Stack direction="column" flex="1" minW="0">
        {screen.kind === 'read' && renderRead()}
        {screen.kind === 'source' && renderSource(screen.id)}
        {screen.kind === 'review' && (
          <ReviewC store={store} onOpenPermanent={openPermanent} onOpenSource={openSource} />
        )}
        {screen.kind === 'permanent' && renderPermanent(screen.id)}
        {screen.kind === 'topic' && (
          <Stack direction="column" gap="4" maxW="42rem">
            <Button
              variant="link"
              size="xs"
              alignSelf="flex-start"
              onClick={() => setScreen({ kind: 'read' })}
            >
              &larr; Read
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
