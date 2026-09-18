// PROTOTYPE - Variant A: "Reading / Thinking". Two sibling pages in the rail, mirroring the
// dream module's Record / Analysis split. Reading = Source list, then a Source open with its
// stream and capture. Thinking = the day's Literature notes as index cards on the left, and
// a persistent Permanent-note composer on the right; "Link this" on a card feeds the
// composer. Topics get their own rail entry. See NotesPrototype.tsx.
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
  | { kind: 'reading' }
  | { kind: 'source'; id: string }
  | { kind: 'thinking' }
  | { kind: 'permanent'; id: string }
  | { kind: 'topics' }
  | { kind: 'topic'; name: string };

const RAIL = [
  { key: 'reading', label: 'Reading', nested: true },
  { key: 'thinking', label: 'Thinking', nested: true },
  { key: 'topics', label: 'Topics', nested: true },
];

const railKey = (screen: Screen) => {
  if (screen.kind === 'source') return 'reading';
  if (screen.kind === 'permanent') return 'thinking';
  if (screen.kind === 'topic') return 'topics';
  return screen.kind;
};

// The Thinking page. Left: the sittings, today's open as index cards with "Link this".
// Right: the composer, always present, sticky. The invitation is the empty composer itself.
function ThinkingA({
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
  const [openKey, setOpenKey] = useState<string | null>(all[0]?.key ?? null);
  const draft = usePermanentDraft();
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  const save = () => {
    store.addPermanentNote(
      { title: draft.title.trim(), body: draft.body.trim(), topics: draft.topics },
      draft.links,
    );
    setSavedTitle(draft.title.trim());
    draft.reset();
  };

  const renderSitting = (sitting: Sitting) => {
    const open = sitting.key === openKey;
    const sourceCount = new Set(sitting.notes.map((n) => n.sourceId)).size;
    return (
      <Stack key={sitting.key} direction="column" gap="4">
        <Button
          variant="ghost"
          h="auto"
          textTransform="none"
          letterSpacing="normal"
          px="0"
          py="2"
          justifyContent="space-between"
          borderBottomWidth="1px"
          borderColor="line"
          borderRadius="0"
          _hover={{ textDecoration: 'none' }}
          onClick={() => setOpenKey(open ? null : sitting.key)}
        >
          <Text textStyle="cardTitle" fontFamily="heading" color="ink">
            {sittingLabel(sitting.date)}
          </Text>
          <Text textStyle="label" color={sitting.written.length ? 'inkSoft' : 'rust'}>
            {sitting.notes.length} notes &middot; {sourceCount}{' '}
            {sourceCount === 1 ? 'source' : 'sources'} &middot;{' '}
            {sitting.written.length ? `${sitting.written.length} written` : 'nothing written yet'}
          </Text>
        </Button>
        {open && (
          <Stack direction="column" gap="6" pt="2">
            {sitting.notes.map((note) => {
              const linked = draft.isLinked(note.id);
              return (
                <IndexCard
                  key={note.id}
                  label={sourceById(state, note.sourceId).title}
                  catalogNumber={renderLocator(note)}
                  accent={linked ? 'moss' : 'rust'}
                  pb="10"
                >
                  <Stack direction="column" gap="2" pt="1">
                    <Text textStyle="body" color="ink">
                      {note.body}
                    </Text>
                    {note.excerpt && (
                      <Text textStyle="body" color="inkSoft" fontStyle="italic">
                        &ldquo;{note.excerpt}&rdquo;
                      </Text>
                    )}
                    <Stack gap="3" align="center">
                      <Button
                        size="xs"
                        variant={linked ? 'ghost' : 'outline'}
                        disabled={linked}
                        onClick={() => draft.linkTo(note.id)}
                      >
                        {linked ? 'In the note you are writing' : 'Link this'}
                      </Button>
                      <Button size="xs" variant="link" onClick={() => onOpenSource(note.sourceId)}>
                        Open the Source
                      </Button>
                    </Stack>
                  </Stack>
                </IndexCard>
              );
            })}
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Stack direction="column" gap="8">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Thinking
        </Heading>
        <Text textStyle="body" color="inkSoft">
          Re-read what you wrote today. Where you have something of your own to say, write it down
          and connect it.
        </Text>
      </Stack>
      <Stack gap="10" align="flex-start" direction={{ base: 'column', lg: 'row' }}>
        <Stack direction="column" gap="8" flex="1" minW="0">
          {all.map(renderSitting)}
          <Stack direction="column" gap="3" pt="4">
            <Text textStyle="label" color="inkSoft">
              The box &middot; {state.permanentNotes.length} Permanent notes
            </Text>
            {[...state.permanentNotes].reverse().map((p) => (
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
          </Stack>
        </Stack>
        <Card w={{ base: 'full', lg: '24rem' }} flexShrink="0" position={{ lg: 'sticky' }} top="4">
          <Stack direction="column" gap="4">
            <Text textStyle="label" color="rust">
              Write a Permanent note
            </Text>
            {savedTitle && (
              <Text textStyle="body" color="moss">
                Saved: &ldquo;{savedTitle}&rdquo;
              </Text>
            )}
            <Input
              variant="title"
              placeholder="State the idea as a full sentence."
              value={draft.title}
              onChange={(e) => draft.setTitle(e.target.value)}
            />
            <Textarea
              rows={5}
              placeholder="One idea, in full sentences, for someone who has not read the Source."
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
            <Button disabled={!draft.canSave} onClick={save}>
              Put it in the box
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}

export function VariantA({ store }: { store: NotesStore }) {
  const { state } = store;
  const [screen, setScreen] = useState<Screen>({ kind: 'reading' });
  const [newTitle, setNewTitle] = useState('');
  const openTopic = (name: string) => setScreen({ kind: 'topic', name });
  const openPermanent = (id: string) =>
    setScreen(permanentById(state, id) ? { kind: 'permanent', id } : { kind: 'thinking' });
  const today = sittings(state)[0];

  const renderReading = () => (
    <Stack direction="column" gap="6" maxW="42rem">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Reading
        </Heading>
        <Text textStyle="body" color="inkSoft">
          Open what you are reading and write down what you do not want to forget.
        </Text>
      </Stack>
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
              onClick={() => setScreen({ kind: 'source', id: source.id })}
            >
              <Stack w="full" gap="4" align="baseline">
                <Text textStyle="label" color="inkSoft" minW="4.5rem">
                  {KIND_LABEL[source.kind]}
                </Text>
                <Stack direction="column" gap="0.5" flex="1">
                  <Text textStyle="cardTitle" fontFamily="heading" color="ink">
                    {source.title}
                  </Text>
                  <Text textStyle="body" color="inkSoft">
                    {source.author ?? 'No author'}
                  </Text>
                </Stack>
                <Text textStyle="label" color="inkSoft" textAlign="right">
                  {count ? `${count} ${count === 1 ? 'note' : 'notes'}` : 'No notes yet'}
                  {last && (
                    <Text as="span" display="block" mt="1">
                      {sittingLabel(last)}
                    </Text>
                  )}
                </Text>
              </Stack>
            </Button>
          );
        })}
      </Stack>
      <Card>
        <Stack gap="3" align="flex-end">
          <FieldLabel eyebrow flex="1">
            Add a Source
            <Input
              size="sm"
              value={newTitle}
              placeholder="Title"
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </FieldLabel>
          <Button
            size="sm"
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
              setScreen({ kind: 'source', id: s.id });
            }}
          >
            Start reading
          </Button>
        </Stack>
      </Card>
    </Stack>
  );

  const renderSource = (id: string) => {
    const source = sourceById(state, id);
    const notes = notesForSource(state, id);
    const last = notes[notes.length - 1] ?? null;
    return (
      <Stack direction="column" gap="6" maxW="42rem">
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setScreen({ kind: 'reading' })}
        >
          &larr; Reading
        </Button>
        <Stack direction="column" gap="2">
          <Text variant="eyebrow" color="rust">
            {KIND_LABEL[source.kind]}
          </Text>
          <Heading as="h1" variant="page">
            {source.title}
          </Heading>
          <Text textStyle="body" color="inkSoft">
            {source.author ?? 'No author'} &middot; {notes.length} notes
          </Text>
          <Stack gap="1.5" wrap="wrap">
            {source.topics.map((t) => (
              <TopicTag key={t} topic={t} onOpen={openTopic} />
            ))}
          </Stack>
        </Stack>
        <Stack direction="column" gap="5" borderTopWidth="1px" borderColor="line" pt="5">
          {notes.length === 0 && (
            <Text textStyle="body" color="inkSoft">
              Nothing written from this yet. Read a little, then stop at the first thing worth
              keeping.
            </Text>
          )}
          {notes.map((note) => (
            <RuledNote key={note.id}>
              <Text textStyle="label" color="inkSoft" mb="1">
                {renderLocator(note)}
              </Text>
              <Text textStyle="body" color="ink">
                {note.body}
              </Text>
              {note.excerpt && (
                <Text textStyle="body" color="inkSoft" fontStyle="italic" mt="1">
                  &ldquo;{note.excerpt}&rdquo;
                </Text>
              )}
            </RuledNote>
          ))}
        </Stack>
        <Card>
          <Text textStyle="label" color="rust" mb="3">
            New Literature note
          </Text>
          <CaptureForm
            key={notes.length}
            lastNote={last}
            onSave={(input) => store.addLiteratureNote({ ...input, sourceId: id })}
          />
        </Card>
        {today && today.notes.length > 0 && (
          <Stack justify="flex-end">
            <Button variant="outline" size="sm" onClick={() => setScreen({ kind: 'thinking' })}>
              Sit with today&rsquo;s notes &rarr;
            </Button>
          </Stack>
        )}
      </Stack>
    );
  };

  const renderThinking = () => (
    <ThinkingA
      store={store}
      onOpenPermanent={openPermanent}
      onOpenSource={(sid) => setScreen({ kind: 'source', id: sid })}
    />
  );

  const renderPermanent = (id: string) => {
    const note = permanentById(state, id);
    if (!note) return null;
    return (
      <Stack direction="column" gap="6" maxW="42rem">
        <Button
          variant="link"
          size="xs"
          alignSelf="flex-start"
          onClick={() => setScreen({ kind: 'thinking' })}
        >
          &larr; Thinking
        </Button>
        <Stack direction="column" gap="2">
          <Text variant="eyebrow" color="rust">
            Permanent note
          </Text>
          <Heading as="h1" variant="page">
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
        <Card>
          <ConnectionsView
            state={state}
            noteId={id}
            onOpenNote={openPermanent}
            onAddLink={() => {}}
          />
        </Card>
      </Stack>
    );
  };

  const renderTopics = () => (
    <Stack direction="column" gap="6" maxW="42rem">
      <Stack direction="column" gap="1">
        <Text variant="eyebrow" color="rust">
          Notes
        </Text>
        <Heading as="h1" variant="page">
          Topics
        </Heading>
      </Stack>
      <Stack direction="column" borderTopWidth="1px" borderColor="line">
        {state.topics.map((t) => {
          const perms = state.permanentNotes.filter((p) => p.topics.includes(t)).length;
          const srcs = state.sources.filter((s) => s.topics.includes(t)).length;
          return (
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
                {perms} permanent &middot; {srcs} sources
              </Text>
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );

  return (
    <Stack gap="10" align="flex-start" direction={{ base: 'column', md: 'row' }}>
      <RailPreview
        entries={[{ key: 'notes', label: 'Notes' }, ...RAIL]}
        active={railKey(screen)}
        onSelect={(key) => {
          if (key === 'reading' || key === 'notes') setScreen({ kind: 'reading' });
          if (key === 'thinking') setScreen({ kind: 'thinking' });
          if (key === 'topics') setScreen({ kind: 'topics' });
        }}
      />
      <Stack direction="column" flex="1" minW="0">
        {screen.kind === 'reading' && renderReading()}
        {screen.kind === 'source' && renderSource(screen.id)}
        {screen.kind === 'thinking' && renderThinking()}
        {screen.kind === 'permanent' && renderPermanent(screen.id)}
        {screen.kind === 'topics' && renderTopics()}
        {screen.kind === 'topic' && (
          <Stack direction="column" gap="4" maxW="42rem">
            <Button
              variant="link"
              size="xs"
              alignSelf="flex-start"
              onClick={() => setScreen({ kind: 'topics' })}
            >
              &larr; Topics
            </Button>
            <TopicView
              state={state}
              topic={screen.name}
              onOpenPermanent={openPermanent}
              onOpenSource={(sid) => setScreen({ kind: 'source', id: sid })}
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
