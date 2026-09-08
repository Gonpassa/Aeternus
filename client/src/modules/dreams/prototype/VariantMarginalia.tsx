/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Variant A — "Marginalia": the narrative is a central manuscript column;
 * each anchor's attachments (beats, symbols, associations) live as margin
 * notes vertically aligned with the anchored passage, like a scholar's
 * annotations. Analysis passes are an appendix ("Readings") below the text.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Textarea } from '@chakra-ui/react';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { NarrativeView, type PassageSelection } from './NarrativeView.tsx';
import { NativeSelect } from './NativeSelect.tsx';
import { SelectionToolbar } from './SelectionToolbar.tsx';
import { SymbolAutocompleteInput } from './SymbolAutocompleteInput.tsx';
import { anchorExcerpt, formatStamp } from './prototypeData.ts';
import type { PrototypeDreamApi } from './usePrototypeDream.ts';

type OpenForm =
  | { kind: 'beat'; anchorId: string }
  | { kind: 'symbol'; anchorId: string }
  | { kind: 'association'; symbolAttachmentId: string }
  | null;

export function VariantMarginalia({ api }: { api: PrototypeDreamApi }) {
  const { dream } = api;
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [draft, setDraft] = useState('');
  const [passType, setPassType] = useState<'analytic' | 'synthetic'>('analytic');
  const [passAnchorId, setPassAnchorId] = useState<string>('');
  const [passDraft, setPassDraft] = useState('');

  const manuscriptRef = useRef<HTMLDivElement>(null);
  const [noteTops, setNoteTops] = useState<Record<string, number>>({});
  const [measureTick, setMeasureTick] = useState(0);

  // Re-measure once fonts finish loading (heights shift under Fraunces/Newsreader).
  useLayoutEffect(() => {
    document.fonts?.ready.then(() => setMeasureTick((t) => t + 1));
  }, []);

  // Align each margin note with its anchor's rendered position, pushing
  // notes down so they never overlap (Google-Docs-comments layout).
  useLayoutEffect(() => {
    const root = manuscriptRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top;
    const tops: Record<string, number> = {};
    let floor = 0;
    dream.anchors
      .map((a) => {
        const el = root.querySelector(`[data-anchor-id="${a.id}"]`);
        return { id: a.id, top: el ? el.getBoundingClientRect().top - rootTop : 0 };
      })
      .sort((x, y) => x.top - y.top)
      .forEach(({ id, top }) => {
        const noteEl = document.getElementById(`margin-note-${id}`);
        const height = noteEl ? noteEl.offsetHeight : 120;
        const placed = Math.max(top, floor);
        tops[id] = placed;
        floor = placed + height + 12;
      });
    setNoteTops(tops);
  }, [dream, openForm, draft, measureTick]);

  const attachFromSelection = (kind: 'beat' | 'symbol' | 'note') => {
    if (!selection) return;
    const anchorId = api.ensureAnchor(selection.paragraphIndex, selection.start, selection.end);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setActiveAnchorId(anchorId);
    if (kind === 'beat') setOpenForm({ kind: 'beat', anchorId });
    if (kind === 'symbol') setOpenForm({ kind: 'symbol', anchorId });
    if (kind === 'note') {
      setPassType('analytic');
      setPassAnchorId(anchorId);
      document.getElementById('readings-appendix')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const submitDraft = () => {
    if (!openForm || !draft.trim()) return;
    if (openForm.kind === 'beat') api.addBeat(openForm.anchorId, draft.trim());
    if (openForm.kind === 'association')
      api.addAssociation(openForm.symbolAttachmentId, draft.trim(), 'personal');
    setDraft('');
    setOpenForm(null);
  };

  return (
    <Box maxW="72rem" mx="auto">
      <Stack direction="row" gap="8" align="flex-start">
        {/* Manuscript column */}
        <Box flex="1" maxW="42rem" ref={manuscriptRef} position="relative">
          <NarrativeView
            dream={dream}
            activeAnchorId={activeAnchorId}
            onAnchorClick={(id) => setActiveAnchorId(id === activeAnchorId ? null : id)}
            onPassageSelect={setSelection}
            highlightStyle="quiet"
          />
        </Box>

        {/* Margin */}
        <Box w="20rem" position="relative" minH="30rem" flexShrink={0}>
          {dream.anchors.map((anchor) => {
            const beats = dream.beats.filter((b) => b.anchorId === anchor.id);
            const symbols = dream.symbolAttachments.filter((sa) => sa.anchorId === anchor.id);
            const active = anchor.id === activeAnchorId;
            return (
              <Box
                key={anchor.id}
                id={`margin-note-${anchor.id}`}
                position="absolute"
                top={`${noteTops[anchor.id] ?? 0}px`}
                left="0"
                right="0"
                borderLeftWidth="2px"
                borderLeftColor={active ? 'rust' : 'line'}
                pl="3"
                py="1"
                transition="border-color 150ms ease"
                cursor="pointer"
                onClick={() => setActiveAnchorId(anchor.id)}
              >
                <Text textStyle="label" color="inkSoft" mb="1">
                  “{anchorExcerpt(dream, anchor).slice(0, 40)}…”
                </Text>

                {beats.map((beat) => (
                  <Stack key={beat.id} direction="row" align="center" gap="2" mb="1">
                    <Box w="7px" h="7px" borderRadius="full" bg="rust" flexShrink={0} />
                    <Text as="span" textStyle="body" fontStyle="italic" fontSize="0.95rem">
                      {beat.label}
                    </Text>
                    {active && (
                      <Button
                        size="xs"
                        variant="ghost"
                        color="rust"
                        onClick={() => api.deleteBeat(beat.id)}
                      >
                        ×
                      </Button>
                    )}
                  </Stack>
                ))}

                {symbols.map((sa) => {
                  const assocs = dream.associations.filter((a) => a.symbolAttachmentId === sa.id);
                  return (
                    <Box key={sa.id} mt="2">
                      <Stack direction="row" align="center" gap="2">
                        <Box as="span" bg="inkBlue" color="paper" px="2" py="0.5" borderRadius="sm">
                          <Text as="span" textStyle="label" color="paper">
                            {sa.symbolName}
                          </Text>
                        </Box>
                        {active && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="rust"
                            onClick={() => api.untagSymbol(sa.id)}
                          >
                            ×
                          </Button>
                        )}
                      </Stack>
                      {assocs.map((assoc) => (
                        <Text
                          key={assoc.id}
                          textStyle="body"
                          fontSize="0.9rem"
                          color="inkSoft"
                          mt="1"
                        >
                          {assoc.kind === 'cultural' ? '◦ ' : '• '}
                          {assoc.content}
                        </Text>
                      ))}
                      {active && openForm?.kind !== 'association' && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setDraft('');
                            setOpenForm({ kind: 'association', symbolAttachmentId: sa.id });
                          }}
                        >
                          + association
                        </Button>
                      )}
                      {openForm?.kind === 'association' &&
                        openForm.symbolAttachmentId === sa.id && (
                          <Stack mt="1" gap="1">
                            <Input
                              size="sm"
                              autoFocus
                              value={draft}
                              placeholder="Personal association…"
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
                            />
                            <Button size="xs" onClick={submitDraft}>
                              Add
                            </Button>
                          </Stack>
                        )}
                    </Box>
                  );
                })}

                {openForm?.kind === 'beat' && openForm.anchorId === anchor.id && (
                  <Stack mt="1" gap="1">
                    <Input
                      size="sm"
                      autoFocus
                      value={draft}
                      placeholder="How did this feel?"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
                    />
                    <Button size="xs" onClick={submitDraft}>
                      Add beat
                    </Button>
                  </Stack>
                )}
                {openForm?.kind === 'symbol' && openForm.anchorId === anchor.id && (
                  <Box mt="1">
                    <SymbolAutocompleteInput
                      vocabulary={dream.symbolVocabulary}
                      autoFocus
                      onSubmit={(name) => {
                        api.tagSymbol(anchor.id, name);
                        setOpenForm(null);
                      }}
                      onCancel={() => setOpenForm(null)}
                    />
                  </Box>
                )}

                {active && !openForm && (
                  <Stack direction="row" gap="1" mt="1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setOpenForm({ kind: 'beat', anchorId: anchor.id })}
                    >
                      + beat
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setOpenForm({ kind: 'symbol', anchorId: anchor.id })}
                    >
                      + symbol
                    </Button>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Box>
      </Stack>

      {selection && (
        <SelectionToolbar
          rect={selection.rect}
          onAddBeat={() => attachFromSelection('beat')}
          onTagSymbol={() => attachFromSelection('symbol')}
          onAnalyticNote={() => attachFromSelection('note')}
        />
      )}

      {/* Readings appendix */}
      <Box
        id="readings-appendix"
        maxW="42rem"
        mt="14"
        pt="8"
        borderTopWidth="1px"
        borderColor="line"
      >
        <Heading as="h2" variant="section" mb="1">
          Readings
        </Heading>
        <Text textStyle="label" color="inkSoft" mb="6">
          Append-only — a record of how understanding evolved
        </Text>

        {dream.passes.map((pass) => (
          <Box
            key={pass.id}
            mb="6"
            pl="4"
            borderLeftWidth="2px"
            borderLeftColor={pass.type === 'analytic' ? 'inkBlue' : 'moss'}
          >
            <Stack direction="row" gap="3" align="baseline" mb="1">
              <Text
                as="span"
                textStyle="label"
                color={pass.type === 'analytic' ? 'inkBlue' : 'moss'}
              >
                {pass.type === 'analytic' ? 'Analytic' : 'Synthetic'}
              </Text>
              <Text as="span" textStyle="label" color="inkSoft">
                {formatStamp(pass.createdAt)}
              </Text>
              {pass.anchorId && (
                <Text as="span" textStyle="label" color="inkSoft">
                  ⚓ “
                  {anchorExcerpt(
                    dream,
                    dream.anchors.find((a) => a.id === pass.anchorId)!,
                  ).slice(0, 30)}
                  …”
                </Text>
              )}
            </Stack>
            <Text textStyle="body">{pass.content}</Text>
          </Box>
        ))}

        <Box mt="8" bg="paperCard" borderWidth="1px" borderColor="line" borderRadius="md" p="4">
          <Text textStyle="label" mb="3">
            New reading
          </Text>
          <Stack direction="row" gap="2" mb="3">
            <Button
              size="xs"
              variant={passType === 'analytic' ? 'default' : 'outline'}
              onClick={() => setPassType('analytic')}
            >
              Analytic
            </Button>
            <Button
              size="xs"
              variant={passType === 'synthetic' ? 'default' : 'outline'}
              onClick={() => {
                setPassType('synthetic');
                setPassAnchorId('');
              }}
            >
              Synthetic
            </Button>
            {passType === 'analytic' && (
              <NativeSelect value={passAnchorId} onChange={setPassAnchorId}>
                <option value="">Whole dream</option>
                {dream.anchors.map((a) => (
                  <option key={a.id} value={a.id}>
                    “{anchorExcerpt(dream, a).slice(0, 30)}…”
                  </option>
                ))}
              </NativeSelect>
            )}
          </Stack>
          <Textarea
            value={passDraft}
            onChange={(e) => setPassDraft(e.target.value)}
            placeholder={
              passType === 'analytic'
                ? 'Trace it backward — why did this appear?'
                : 'Read it forward — what is the dream moving you toward?'
            }
            bg="paper"
            borderColor="line"
            borderRadius="md"
            fontFamily="body"
            fontSize="1.0625rem"
            rows={3}
            mb="3"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!passDraft.trim()) return;
              api.addPass(passType, passDraft.trim(), passAnchorId || null);
              setPassDraft('');
              setPassAnchorId('');
            }}
          >
            Add to record
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
