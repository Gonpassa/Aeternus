// PROTOTYPE - answers issue #67 (name and shape the reading page and the thinking page).
// Three structurally different takes on the whole Notes module flow, switchable via
// `?variant=` on the throwaway route /prototype/notes (sub-shape B per the /prototype
// skill: no Notes page exists yet). Each variant carries its own page names, its own nav
// placement (mocked in a rail preview, since the real rail cannot vary), and its own way of
// inviting a Permanent note from the notes being re-read. Data is in memory and resets on
// reload. Delete this folder, the route, and the NavSections link once a variant is chosen.
//
//   A  Reading / Thinking  - two sibling rail pages; thinking = day cards + side composer
//   B  Sources / Sittings  - one rail entry, tabs; a sitting is a dated manuscript, the
//                            invitation is inline under each note, marginalia on the right
//   C  Read / Review       - catalog of Source cards; review is a guided one-note-at-a-time
//                            pass with two buttons under each card
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { PrototypeSwitcher } from './PrototypeSwitcher.tsx';
import { VariantA } from './VariantA.tsx';
import { VariantB } from './VariantB.tsx';
import { VariantC } from './VariantC.tsx';
import { useNotesPrototypeStore } from './prototypeNotesData.ts';

const VARIANTS = [
  { key: 'A', name: 'Reading / Thinking' },
  { key: 'B', name: 'Sources / Sittings' },
  { key: 'C', name: 'Read / Review' },
];

export function NotesPrototype({ variant }: { variant: string }) {
  const store = useNotesPrototypeStore();

  return (
    <Stack direction="column" gap="8" pb="24" maxW="72rem">
      {variant === 'B' && <VariantB key="B" store={store} />}
      {variant === 'C' && <VariantC key="C" store={store} />}
      {variant !== 'B' && variant !== 'C' && <VariantA key="A" store={store} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </Stack>
  );
}
