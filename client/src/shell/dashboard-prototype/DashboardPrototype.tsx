// PROTOTYPE — answers issue #23 (dashboard visual/layout). Three structurally
// different variants of the logged-in `/` dashboard, switchable via `?variant=`,
// mounted directly on the existing route (sub-shape A per the /prototype skill).
// Delete this whole folder, and the wiring in routes/index.tsx, once a variant
// is chosen and folded into the real implementation.
import type { AuthUser } from '@nee3/shared-types';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { PrototypeSwitcher } from './PrototypeSwitcher.tsx';
import { VariantA } from './VariantA.tsx';
import { VariantB } from './VariantB.tsx';
import { VariantC } from './VariantC.tsx';
import { useJournalWidgetData } from './prototypeJournalData.ts';

const VARIANTS = [
  { key: 'A', name: 'Notebook ledger' },
  { key: 'B', name: 'Catalog density' },
  { key: 'C', name: 'Filed cards' },
];

export function DashboardPrototype({ user, variant }: { user: AuthUser; variant: string }) {
  const data = useJournalWidgetData();

  return (
    <Stack direction="column" gap="8" pb="20">
      {variant === 'B' && <VariantB user={user} data={data} />}
      {variant === 'C' && <VariantC user={user} data={data} />}
      {variant !== 'B' && variant !== 'C' && <VariantA user={user} data={data} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </Stack>
  );
}
