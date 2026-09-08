/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway code, never ship.
 * Variant C — "Session ledger": one column. Narrative on top; below it, every
 * analysis act (beat, symbol tag, association, pass) interleaved in a single
 * chronological, session-grouped ledger. Selecting a passage arms the bottom
 * composer with that anchor as context; the composer is how everything is
 * added. Leans into the append-only, understanding-evolves-over-sessions idea.
 */
import { useMemo, useState } from 'react';
import { Box, Textarea } from '@chakra-ui/react';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Heading } from '../../../atoms/Heading/Heading.tsx';
import { Stack } from '../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../atoms/Text/Text.tsx';
import { NarrativeView, type PassageSelection } from './NarrativeView.tsx';
import { SymbolAutocompleteInput } from './SymbolAutocompleteInput.tsx';
import { anchorExcerpt, formatStamp, type PDreamState } from './prototypeData.ts';
import type { PrototypeDreamApi } from './usePrototypeDream.ts';

type ActType = 'beat' | 'symbol' | 'analytic' | 'synthetic';

type LedgerEvent = {
  id: string;
  createdAt: string;
  kind: 'beat' | 'symbol' | 'association' | 'pass';
  label: string;
  labelColor: string;
  anchorId: string | null;
  content: string;
  permanent: boolean;
  onDelete?: () => void;
};

const buildLedger = (dream: PDreamState, api: PrototypeDreamApi): LedgerEvent[] => {
  const events: LedgerEvent[] = [];
  dream.beats.forEach((b) =>
    events.push({
      id: b.id,
      createdAt: b.createdAt,
      kind: 'beat',
      label: 'Emotional beat',
      labelColor: 'rust',
      anchorId: b.anchorId,
      content: b.label,
      permanent: false,
      onDelete: () => api.deleteBeat(b.id),
    }),
  );
  dream.symbolAttachments.forEach((sa) =>
    events.push({
      id: sa.id,
      createdAt: sa.createdAt,
      kind: 'symbol',
      label: 'Symbol',
      labelColor: 'inkBlue',
      anchorId: sa.anchorId,
      content: sa.symbolName,
      permanent: false,
      onDelete: () => api.untagSymbol(sa.id),
    }),
  );
  dream.associations.forEach((assoc) => {
    const sa = dream.symbolAttachments.find((s) => s.id === assoc.symbolAttachmentId);
    events.push({
      id: assoc.id,
      createdAt: assoc.createdAt,
      kind: 'association',
      label: `Association — ${sa?.symbolName ?? '?'}`,
      labelColor: 'inkBlue',
      anchorId: sa?.anchorId ?? null,
      content: assoc.content,
      permanent: false,
      onDelete: () => api.deleteAssociation(assoc.id),
    });
  });
  dream.passes.forEach((p) =>
    events.push({
      id: p.id,
      createdAt: p.createdAt,
      kind: 'pass',
      label: p.type === 'analytic' ? 'Analytic pass' : 'Synthetic pass',
      labelColor: 'moss',
      anchorId: p.anchorId,
      content: p.content,
      permanent: true,
    }),
  );
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export function VariantLedger({ api }: { api: PrototypeDreamApi }) {
  const { dream } = api;
  const [armedAnchorId, setArmedAnchorId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PassageSelection | null>(null);
  const [actType, setActType] = useState<ActType>('beat');
  const [draft, setDraft] = useState('');

  const ledger = useMemo(() => buildLedger(dream, api), [dream]);

  const sessions = useMemo(() => {
    const byDay = new Map<string, LedgerEvent[]>();
    ledger.forEach((event) => {
      const day = formatStamp(event.createdAt);
      byDay.set(day, [...(byDay.get(day) ?? []), event]);
    });
    return Array.from(byDay.entries());
  }, [ledger]);

  const armedAnchor = dream.anchors.find((a) => a.id === armedAnchorId);
  const contextLabel = pendingSelection
    ? `“${(dream.paragraphs[pendingSelection.paragraphIndex] ?? '')
        .slice(pendingSelection.start, pendingSelection.end)
        .slice(0, 50)}…”`
    : armedAnchor
      ? `“${anchorExcerpt(dream, armedAnchor).slice(0, 50)}…”`
      : 'Whole dream';

  const anchorForSubmit = (): string | null => {
    if (pendingSelection) {
      const id = api.ensureAnchor(
        pendingSelection.paragraphIndex,
        pendingSelection.start,
        pendingSelection.end,
      );
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
      return id;
    }
    return armedAnchorId;
  };

  const clearContext = () => {
    setPendingSelection(null);
    setArmedAnchorId(null);
    window.getSelection()?.removeAllRanges();
  };

  const submit = () => {
    if (!draft.trim() && actType !== 'symbol') return;
    const anchorId = anchorForSubmit();
    if (actType === 'beat') {
      if (!anchorId) return;
      api.addBeat(anchorId, draft.trim());
    }
    if (actType === 'analytic') api.addPass('analytic', draft.trim(), anchorId);
    if (actType === 'synthetic') api.addPass('synthetic', draft.trim(), null);
    setDraft('');
    setArmedAnchorId(anchorId);
  };

  const needsAnchor = actType === 'beat' || actType === 'symbol';
  const hasContext = Boolean(pendingSelection || armedAnchorId);

  return (
    <Box maxW="42rem" mx="auto" pb="56">
      {/* Narrative */}
      <NarrativeView
        dream={dream}
        activeAnchorId={armedAnchorId}
        onAnchorClick={(id) => setArmedAnchorId(id === armedAnchorId ? null : id)}
        onPassageSelect={(sel) => {
          setPendingSelection(sel);
          setArmedAnchorId(null);
        }}
        highlightStyle="wash"
      />

      {/* Ledger */}
      <Box mt="12" pt="6" borderTopWidth="2px" borderColor="ink">
        <Stack direction="row" justify="space-between" align="baseline" mb="6">
          <Heading as="h2" variant="section">
            Analysis record
          </Heading>
          <Text textStyle="label" color="inkSoft">
            {ledger.length} entries · append-only
          </Text>
        </Stack>

        {sessions.map(([day, events]) => (
          <Box key={day} mb="8">
            <Text
              textStyle="label"
              color="inkSoft"
              mb="3"
              pb="1"
              borderBottomWidth="1px"
              borderColor="line"
            >
              Session · {day}
            </Text>
            {events.map((event) => (
              <Stack key={event.id} direction="row" gap="4" align="flex-start" mb="4">
                <Box w="9rem" flexShrink={0} pt="0.5">
                  <Text textStyle="label" color={event.labelColor}>
                    {event.label}
                  </Text>
                  {event.permanent && (
                    <Text textStyle="label" color="inkSoft" mt="1">
                      Permanent
                    </Text>
                  )}
                </Box>
                <Box flex="1">
                  {event.anchorId && (
                    <Text
                      as="button"
                      textStyle="label"
                      color="inkSoft"
                      display="block"
                      textAlign="left"
                      cursor="pointer"
                      mb="1"
                      onClick={() => setArmedAnchorId(event.anchorId)}
                    >
                      ⚓ “
                      {anchorExcerpt(
                        dream,
                        dream.anchors.find((a) => a.id === event.anchorId)!,
                      ).slice(0, 40)}
                      …”
                    </Text>
                  )}
                  <Text textStyle="body" fontStyle={event.kind === 'beat' ? 'italic' : 'normal'}>
                    {event.content}
                  </Text>
                </Box>
                {!event.permanent && event.onDelete && (
                  <Button size="xs" variant="ghost" color="rust" onClick={event.onDelete}>
                    ×
                  </Button>
                )}
              </Stack>
            ))}
          </Box>
        ))}
      </Box>

      {/* Composer dock */}
      <Box
        position="fixed"
        bottom="0"
        left={{ base: '0', md: '15rem' }}
        right="0"
        bg="paperCard"
        borderTopWidth="1px"
        borderColor="line"
        boxShadow="0 -4px 12px rgba(0,0,0,0.06)"
        px="8"
        pt="4"
        pb="16"
        zIndex="15"
      >
        <Box maxW="42rem" mx="auto">
          <Stack direction="row" align="center" gap="3" mb="3" wrap="wrap">
            <Text as="span" textStyle="label" color="inkSoft">
              Next entry
            </Text>
            {(
              [
                ['beat', 'Emotional beat'],
                ['symbol', 'Symbol'],
                ['analytic', 'Analytic pass'],
                ['synthetic', 'Synthetic pass'],
              ] as Array<[ActType, string]>
            ).map(([key, label]) => (
              <Button
                key={key}
                size="xs"
                variant={actType === key ? 'default' : 'outline'}
                onClick={() => setActType(key)}
              >
                {label}
              </Button>
            ))}
            <Box
              as="span"
              ml="auto"
              bg={hasContext ? 'moss/20' : 'paper'}
              borderWidth="1px"
              borderColor={hasContext ? 'moss' : 'line'}
              borderRadius="full"
              px="3"
              py="1"
            >
              <Text as="span" textStyle="label" color={hasContext ? 'moss' : 'inkSoft'}>
                {actType === 'synthetic' ? 'Whole dream (always)' : contextLabel}
              </Text>
              {hasContext && actType !== 'synthetic' && (
                <Box
                  as="button"
                  ml="2"
                  cursor="pointer"
                  onClick={clearContext}
                  aria-label="Clear passage context"
                >
                  <Text as="span" textStyle="label" color="inkSoft">
                    ×
                  </Text>
                </Box>
              )}
            </Box>
          </Stack>

          {needsAnchor && !hasContext ? (
            <Text textStyle="body" color="inkSoft" fontStyle="italic">
              Select a passage in the narrative above to attach{' '}
              {actType === 'beat' ? 'an emotional beat' : 'a symbol'}.
            </Text>
          ) : actType === 'symbol' ? (
            <SymbolAutocompleteInput
              vocabulary={dream.symbolVocabulary}
              onSubmit={(name) => {
                const anchorId = anchorForSubmit();
                if (anchorId) {
                  api.tagSymbol(anchorId, name);
                  setArmedAnchorId(anchorId);
                }
              }}
            />
          ) : (
            <Stack direction="row" gap="3" align="flex-end">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  actType === 'beat'
                    ? 'How did this passage feel?'
                    : actType === 'analytic'
                      ? 'Trace it backward — why did this appear?'
                      : 'Read it forward — what is the dream moving you toward?'
                }
                bg="paper"
                borderColor="line"
                borderRadius="md"
                fontFamily="body"
                fontSize="1.0625rem"
                rows={2}
                flex="1"
              />
              <Button size="sm" onClick={submit}>
                Add
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
