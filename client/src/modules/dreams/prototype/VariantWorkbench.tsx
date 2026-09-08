/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Variant B — "Card-catalog workbench": narrative on the left at reading
 * width; a fixed right panel files the analysis as index cards under three
 * tabs — PASSAGES (per-anchor cards), SYMBOLS (per-symbol, cross-anchor),
 * READINGS (pass composer + append-only list). Clicking an anchored passage
 * jumps to its card.
 */
import { useEffect, useState } from 'react';
import { Box, Textarea } from '@chakra-ui/react';
import { Button } from '../../../atoms/Button/Button.tsx';
import { IndexCard } from '../../../atoms/IndexCard/IndexCard.tsx';
import { Input } from '../../../atoms/Input/Input.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { NarrativeView, type PassageSelection } from './NarrativeView.tsx';
import { NativeSelect } from './NativeSelect.tsx';
import { SelectionToolbar } from './SelectionToolbar.tsx';
import { SymbolAutocompleteInput } from './SymbolAutocompleteInput.tsx';
import { anchorExcerpt, formatStamp } from './prototypeData.ts';
import type { PrototypeDreamApi } from './usePrototypeDream.ts';

type Tab = 'passages' | 'symbols' | 'readings';

export function VariantWorkbench({ api }: { api: PrototypeDreamApi }) {
  const { dream } = api;
  const [tab, setTab] = useState<Tab>('passages');
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const [beatDraftFor, setBeatDraftFor] = useState<string | null>(null);
  const [symbolFormFor, setSymbolFormFor] = useState<string | null>(null);
  const [assocDraftFor, setAssocDraftFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [passType, setPassType] = useState<'analytic' | 'synthetic'>('analytic');
  const [passAnchorId, setPassAnchorId] = useState('');
  const [passDraft, setPassDraft] = useState('');

  useEffect(() => {
    if (activeAnchorId) {
      document
        .getElementById(`card-${activeAnchorId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnchorId, tab]);

  const attachFromSelection = (kind: 'beat' | 'symbol' | 'note') => {
    if (!selection) return;
    const anchorId = api.ensureAnchor(selection.paragraphIndex, selection.start, selection.end);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setActiveAnchorId(anchorId);
    if (kind === 'beat') {
      setTab('passages');
      setBeatDraftFor(anchorId);
    }
    if (kind === 'symbol') {
      setTab('passages');
      setSymbolFormFor(anchorId);
    }
    if (kind === 'note') {
      setTab('readings');
      setPassType('analytic');
      setPassAnchorId(anchorId);
    }
  };

  const anchorNumber = (anchorId: string) =>
    `No. ${String(dream.anchors.findIndex((a) => a.id === anchorId) + 1).padStart(3, '0')}`;

  const tabButton = (key: Tab, label: string) => (
    <Box
      as="button"
      cursor="pointer"
      px="1"
      pb="2"
      borderBottomWidth="2px"
      borderBottomColor={tab === key ? 'rust' : 'transparent'}
      onClick={() => setTab(key)}
    >
      <Text as="span" textStyle="button" color={tab === key ? 'ink' : 'inkSoft'}>
        {label}
      </Text>
    </Box>
  );

  return (
    <Stack direction="row" gap="10" align="flex-start" h="100%">
      {/* Narrative */}
      <Box flex="1" maxW="42rem">
        <NarrativeView
          dream={dream}
          activeAnchorId={activeAnchorId}
          onAnchorClick={(id) => {
            setActiveAnchorId(id);
            setTab('passages');
          }}
          onPassageSelect={setSelection}
          highlightStyle="wash"
        />
      </Box>

      {selection && (
        <SelectionToolbar
          rect={selection.rect}
          onAddBeat={() => attachFromSelection('beat')}
          onTagSymbol={() => attachFromSelection('symbol')}
          onAnalyticNote={() => attachFromSelection('note')}
        />
      )}

      {/* Catalog panel */}
      <Box
        w="26rem"
        flexShrink={0}
        borderLeftWidth="1px"
        borderColor="line"
        pl="8"
        alignSelf="stretch"
        overflowY="auto"
        maxH="calc(100vh - 12rem)"
        position="sticky"
        top="0"
      >
        <Stack direction="row" gap="6" mb="6">
          {tabButton('passages', 'Passages')}
          {tabButton('symbols', 'Symbols')}
          {tabButton('readings', 'Readings')}
        </Stack>

        {tab === 'passages' && (
          <Stack direction="column" gap="7" pt="3">
            {dream.anchors.map((anchor) => {
              const beats = dream.beats.filter((b) => b.anchorId === anchor.id);
              const symbols = dream.symbolAttachments.filter((sa) => sa.anchorId === anchor.id);
              return (
                <IndexCard
                  key={anchor.id}
                  id={`card-${anchor.id}`}
                  label="Passage"
                  accent={anchor.id === activeAnchorId ? 'rust' : 'moss'}
                  catalogNumber={anchorNumber(anchor.id)}
                  onClick={() => setActiveAnchorId(anchor.id)}
                  cursor="pointer"
                >
                  <Text textStyle="body" fontStyle="italic" color="inkSoft" mb="3">
                    “{anchorExcerpt(dream, anchor)}”
                  </Text>

                  {beats.length > 0 && (
                    <Box mb="3">
                      <Text textStyle="label" color="inkSoft" mb="1">
                        Felt
                      </Text>
                      {beats.map((beat) => (
                        <Stack key={beat.id} direction="row" align="center" gap="2">
                          <Box w="7px" h="7px" borderRadius="full" bg="rust" flexShrink={0} />
                          <Text as="span" textStyle="body">
                            {beat.label}
                          </Text>
                          <Button
                            size="xs"
                            variant="ghost"
                            color="rust"
                            onClick={() => api.deleteBeat(beat.id)}
                          >
                            ×
                          </Button>
                        </Stack>
                      ))}
                    </Box>
                  )}

                  {symbols.length > 0 && (
                    <Box mb="3">
                      <Text textStyle="label" color="inkSoft" mb="1">
                        Symbols
                      </Text>
                      <Stack direction="row" gap="2" wrap="wrap">
                        {symbols.map((sa) => (
                          <Box
                            key={sa.id}
                            as="span"
                            bg="inkBlue"
                            color="paper"
                            px="2"
                            py="1"
                            borderRadius="sm"
                          >
                            <Text as="span" textStyle="label" color="paper">
                              {sa.symbolName}
                            </Text>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {beatDraftFor === anchor.id ? (
                    <Stack gap="1" mb="2">
                      <Input
                        size="sm"
                        autoFocus
                        value={draft}
                        placeholder="How did this feel?"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && draft.trim()) {
                            api.addBeat(anchor.id, draft.trim());
                            setDraft('');
                            setBeatDraftFor(null);
                          }
                        }}
                      />
                    </Stack>
                  ) : null}
                  {symbolFormFor === anchor.id ? (
                    <SymbolAutocompleteInput
                      vocabulary={dream.symbolVocabulary}
                      autoFocus
                      onSubmit={(name) => {
                        api.tagSymbol(anchor.id, name);
                        setSymbolFormFor(null);
                      }}
                      onCancel={() => setSymbolFormFor(null)}
                    />
                  ) : null}

                  <Stack direction="row" gap="2" mt="1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setDraft('');
                        setBeatDraftFor(anchor.id);
                      }}
                    >
                      + beat
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setSymbolFormFor(anchor.id)}>
                      + symbol
                    </Button>
                  </Stack>
                </IndexCard>
              );
            })}
          </Stack>
        )}

        {tab === 'symbols' && (
          <Stack direction="column" gap="7" pt="3">
            {Array.from(new Set(dream.symbolAttachments.map((sa) => sa.symbolName))).map(
              (symbolName, i) => {
                const attachments = dream.symbolAttachments.filter(
                  (sa) => sa.symbolName === symbolName,
                );
                return (
                  <IndexCard
                    key={symbolName}
                    label="Symbol"
                    accent="inkBlue"
                    catalogNumber={`No. ${String(i + 1).padStart(3, '0')}`}
                  >
                    <Text textStyle="cardTitle" as="h3" mb="2">
                      {symbolName}
                    </Text>
                    {attachments.map((sa) => {
                      const anchor = dream.anchors.find((a) => a.id === sa.anchorId);
                      const assocs = dream.associations.filter(
                        (as) => as.symbolAttachmentId === sa.id,
                      );
                      return (
                        <Box key={sa.id} mb="3">
                          {anchor && (
                            <Text
                              textStyle="body"
                              fontStyle="italic"
                              color="inkSoft"
                              fontSize="0.95rem"
                              mb="1"
                              cursor="pointer"
                              onClick={() => setActiveAnchorId(anchor.id)}
                            >
                              “{anchorExcerpt(dream, anchor).slice(0, 60)}…”
                            </Text>
                          )}
                          {assocs.map((assoc) => (
                            <Stack key={assoc.id} direction="row" align="baseline" gap="2" mb="1">
                              <Text
                                as="span"
                                textStyle="label"
                                color={assoc.kind === 'cultural' ? 'moss' : 'rust'}
                              >
                                {assoc.kind === 'cultural' ? 'Cult.' : 'Pers.'}
                              </Text>
                              <Text as="span" textStyle="body" fontSize="0.95rem">
                                {assoc.content}
                              </Text>
                              <Button
                                size="xs"
                                variant="ghost"
                                color="rust"
                                onClick={() => api.deleteAssociation(assoc.id)}
                              >
                                ×
                              </Button>
                            </Stack>
                          ))}
                          {assocDraftFor === sa.id ? (
                            <Input
                              size="sm"
                              autoFocus
                              value={draft}
                              placeholder="Association…"
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && draft.trim()) {
                                  api.addAssociation(sa.id, draft.trim(), 'personal');
                                  setDraft('');
                                  setAssocDraftFor(null);
                                }
                              }}
                            />
                          ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setDraft('');
                                setAssocDraftFor(sa.id);
                              }}
                            >
                              + association
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </IndexCard>
                );
              },
            )}
          </Stack>
        )}

        {tab === 'readings' && (
          <Box>
            <Box bg="paperCard" borderWidth="1px" borderColor="line" borderRadius="md" p="4" mb="6">
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
              </Stack>
              {passType === 'analytic' && (
                <Box mb="3">
                  <NativeSelect value={passAnchorId} onChange={setPassAnchorId} fullWidth>
                    <option value="">Whole dream</option>
                    {dream.anchors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {anchorNumber(a.id)} — “{anchorExcerpt(dream, a).slice(0, 24)}…”
                      </option>
                    ))}
                  </NativeSelect>
                </Box>
              )}
              <Textarea
                value={passDraft}
                onChange={(e) => setPassDraft(e.target.value)}
                placeholder={
                  passType === 'analytic'
                    ? 'Why did this appear?'
                    : 'What is the dream moving you toward?'
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
                File reading
              </Button>
            </Box>

            {[...dream.passes].reverse().map((pass) => (
              <Box key={pass.id} mb="5" pb="5" borderBottomWidth="1px" borderColor="line">
                <Stack direction="row" gap="3" align="baseline" mb="1">
                  <Text
                    as="span"
                    textStyle="label"
                    color={pass.type === 'analytic' ? 'inkBlue' : 'moss'}
                  >
                    {pass.type}
                  </Text>
                  <Text as="span" textStyle="label" color="inkSoft">
                    {formatStamp(pass.createdAt)}
                  </Text>
                </Stack>
                {pass.anchorId && (
                  <Text textStyle="label" color="inkSoft" mb="1">
                    ⚓ {anchorNumber(pass.anchorId)}
                  </Text>
                )}
                <Text textStyle="body" fontSize="0.95rem">
                  {pass.content}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
