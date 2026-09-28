// PROTOTYPE - answers issue #73: with a Source open, what should capturing a Literature note
// feel like? Three variants of the reading page on one throwaway route
// (/prototype/notes-capture?variant=A|B|C), sub-shape B per the /prototype skill: the real
// Read page does not exist yet. Data is in memory and resets on reload. Delete this folder,
// the route, and the NavSections link once the question is answered.
//
// Everything already settled is shared and identical across the three, so the variants
// disagree only about capture: the Source header (#70), the browsable link panel (#67/#69),
// the Permanent-note composer's fields (#69), and the section suggestion list (#68).
//
// What each variant proposes about entering a Literature note with minimal friction:
//
//   A  Foot of the stream - one column, the reading log. The notes so far run down the page
//      and the form is the last thing on it, so capture sits where reading left off. The
//      Locator is a compact row at the top of the form: section carried over from the last
//      note, position focused and empty.
//   B  Write on the card - a desk. The form IS an index card, the same object the note
//      becomes: the section is the card's die-cut tab, the position its catalog number, the
//      body the card's face. Filing it moves it into the stack on the right.
//   C  Reading position - the Locator leaves the form entirely and becomes page state: a bar
//      under the header says where you are reading and stays there. Capture is then a single
//      line, because the where has already been answered.
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { PrototypeSwitcher } from './PrototypeSwitcher.tsx';
import { VariantA } from './VariantA.tsx';
import { VariantB } from './VariantB.tsx';
import { VariantC } from './VariantC.tsx';
import { useCaptureNotesStore } from './captureNotesData.ts';

const VARIANTS = [
  { key: 'A', name: 'Foot of the stream' },
  { key: 'B', name: 'Write on the card' },
  { key: 'C', name: 'Reading position' },
];

export function NotesCapturePrototype({ variant }: { variant: string }) {
  const store = useCaptureNotesStore();

  return (
    <Stack direction="column" gap="8" pb="24">
      {variant === 'B' && <VariantB key="B" store={store} />}
      {variant === 'C' && <VariantC key="C" store={store} />}
      {variant !== 'B' && variant !== 'C' && <VariantA key="A" store={store} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </Stack>
  );
}
