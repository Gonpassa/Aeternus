import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { AnalysisPass, AnalysisPassType, AnchorWithAttachments } from '@nee3/shared-types';
import { Button } from '../../../../atoms/Button/Button.tsx';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Heading } from '../../../../atoms/Heading/Heading.tsx';
import { RuledNote } from '../../../../atoms/RuledNote/RuledNote.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  createListCollection,
} from '../../../../atoms/Select/Select.tsx';
import { Stack } from '../../../../atoms/Stack/Stack.tsx';
import { Tabs } from '../../../../atoms/Tabs/Tabs.tsx';
import { Text } from '../../../../atoms/Text/Text.tsx';
import { Textarea } from '../../../../atoms/Textarea/Textarea.tsx';
import { truncateExcerpt } from './DreamAnalysis.utils.ts';

// The anchor picker's non-anchor values: whole dream (no anchor) and the still-pending
// text selection the "add analytic note" toolbar action carried here.
export const WHOLE_DREAM_OPTION = '';
export const PENDING_ANCHOR_OPTION = 'pending';

const TAB_OPTIONS = [
  { value: 'analytic', label: 'Analytic' },
  { value: 'synthetic', label: 'Synthetic' },
];

const TAB_DESCRIPTIONS: Record<AnalysisPassType, string> = {
  analytic: 'Tracing elements backward to their sources',
  synthetic: 'Reading the whole dream forward',
};

export interface AnalysisSectionProps {
  passes: AnalysisPass[];
  anchors: AnchorWithAttachments[];
  excerpts: Record<number, string>;
  tab: AnalysisPassType;
  onTabChange: (tab: AnalysisPassType) => void;
  // WHOLE_DREAM_OPTION, PENDING_ANCHOR_OPTION, or an anchor id as a string.
  anchorSelection: string;
  onAnchorSelectionChange: (value: string) => void;
  pendingExcerpt: string | null;
  onCreatePass: (content: string) => Promise<void>;
}

// The appendix below the manuscript: the append-only record of Analytic and Synthetic
// passes, one view at a time, each with its own chronological list and composer. Passes
// deliberately render with no edit or delete controls.
export function AnalysisSection({
  passes,
  anchors,
  excerpts,
  tab,
  onTabChange,
  anchorSelection,
  onAnchorSelectionChange,
  pendingExcerpt,
  onCreatePass,
}: AnalysisSectionProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const anchorCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { value: WHOLE_DREAM_OPTION, label: 'Whole dream' },
          ...(pendingExcerpt !== null
            ? [
                {
                  value: PENDING_ANCHOR_OPTION,
                  label: `“${truncateExcerpt(pendingExcerpt, 30)}” (selected passage)`,
                },
              ]
            : []),
          ...anchors.map((anchor) => ({
            value: String(anchor.id),
            label: `“${truncateExcerpt(excerpts[anchor.id] ?? '', 30)}”`,
          })),
        ],
      }),
    [anchors, excerpts, pendingExcerpt],
  );

  const visiblePasses = passes.filter((pass) => pass.type === tab);

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onCreatePass(trimmed);
      setDraft('');
    } catch {
      // The global toast interceptor in api/client.ts already surfaced the failure;
      // keeping the draft lets the user retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack
      id="analysis-section"
      direction="column"
      align="stretch"
      maxW="42rem"
      mt="14"
      pt="8"
      borderTopWidth="1px"
      borderColor="line"
    >
      <Heading as="h2" variant="section" mb="1">
        Analysis
      </Heading>
      <Text textStyle="label" color="inkSoft" mb="5">
        Append-only - a record of how understanding evolved
      </Text>

      <Tabs
        options={TAB_OPTIONS}
        value={tab}
        onChange={(value) => onTabChange(value as AnalysisPassType)}
        aria-label="Analysis pass views"
      />
      <Text textStyle="label" color="inkSoft" mt="2" mb="6">
        {TAB_DESCRIPTIONS[tab]}
      </Text>

      {visiblePasses.map((pass) => (
        <RuledNote key={pass.id} rule={pass.type === 'analytic' ? 'inkBlue' : 'moss'} mb="6">
          <Stack direction="row" gap="3" align="baseline" mb="1">
            <Text as="span" textStyle="label" color="inkSoft">
              {format(new Date(pass.createdAt), 'MMM d, yyyy')}
            </Text>
            {pass.anchorId !== null && (
              <Text as="span" textStyle="label" color="inkSoft">
                “{truncateExcerpt(excerpts[pass.anchorId] ?? '', 30)}”
              </Text>
            )}
          </Stack>
          <Text textStyle="body">{pass.content}</Text>
        </RuledNote>
      ))}
      {visiblePasses.length === 0 && (
        <Text textStyle="body" color="inkSoft" fontStyle="italic" mb="6">
          No {tab} passes yet.
        </Text>
      )}

      <Card padding="sm" mt="2">
        <Text textStyle="label" mb="3">
          {tab === 'analytic' ? 'New analytic pass' : 'New synthetic pass'}
        </Text>
        {tab === 'analytic' && (
          <Stack direction="row" mb="3">
            <Select
              collection={anchorCollection}
              value={[anchorSelection]}
              onValueChange={(details) =>
                onAnchorSelectionChange(details.value[0] ?? WHOLE_DREAM_OPTION)
              }
              aria-label="Anchor for this pass"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anchorCollection.items.map((item) => (
                  <SelectItem key={item.value} item={item}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>
        )}
        <Textarea
          value={draft}
          aria-label={tab === 'analytic' ? 'New analytic pass' : 'New synthetic pass'}
          placeholder={
            tab === 'analytic'
              ? 'Trace it backward - why did this appear?'
              : 'Read it forward - what is the dream moving you toward?'
          }
          rows={3}
          mb="3"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="button" size="sm" onClick={handleSubmit} loading={submitting}>
          Add to record
        </Button>
      </Card>
    </Stack>
  );
}
