/* eslint-disable -- PROTOTYPE (throwaway, never merges to main): exempt from repo lint standards */
/**
 * PROTOTYPE — throwaway route, never ship.
 *
 * Three variants of the Dream Analysis experience (symbols + associations
 * from issue #48, analytic/synthetic passes from issue #49), switchable via
 * `?variant=`, on this dev-only /dreams/prototype-analysis route.
 * All data is in-memory; nothing touches the API.
 */
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Box } from '@chakra-ui/react';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { PrototypeSwitcher } from '../../modules/dreams/prototype/PrototypeSwitcher.tsx';
import { usePrototypeDream } from '../../modules/dreams/prototype/usePrototypeDream.ts';
import { VariantLedger } from '../../modules/dreams/prototype/VariantLedger.tsx';
import { VariantMarginalia } from '../../modules/dreams/prototype/VariantMarginalia.tsx';
import { VariantWorkbench } from '../../modules/dreams/prototype/VariantWorkbench.tsx';

const VARIANTS = [
  { key: 'A', name: 'Marginalia' },
  { key: 'B', name: 'Card-catalog workbench' },
  { key: 'C', name: 'Session ledger' },
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

function PrototypeAnalysisPage() {
  const { variant } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const api = usePrototypeDream();

  return (
    <Box p="4" w="100%">
      <Stack
        direction="column"
        gap="1"
        mb="8"
        maxW={variant === 'C' ? '42rem' : undefined}
        mx={variant === 'C' ? 'auto' : undefined}
      >
        <Text textStyle="label" color="rust">
          Prototype — throwaway
        </Text>
        <Heading as="h1" variant="page">
          Dream · Sep 4, 2026
        </Heading>
      </Stack>

      {variant === 'A' && <VariantMarginalia api={api} />}
      {variant === 'B' && <VariantWorkbench api={api} />}
      {variant === 'C' && <VariantLedger api={api} />}

      <PrototypeSwitcher
        variants={[...VARIANTS]}
        current={variant}
        onChange={(key) => navigate({ search: { variant: key as VariantKey }, replace: true })}
      />
    </Box>
  );
}

export const Route = createFileRoute('/dreams/prototype-analysis')({
  validateSearch: (search): { variant: VariantKey } => {
    const raw = search.variant;
    const match = VARIANTS.find((v) => v.key === raw);
    return { variant: match ? match.key : 'A' };
  },
  beforeLoad: () => {
    if (import.meta.env.PROD) {
      throw redirect({ to: '/' });
    }
  },
  component: PrototypeAnalysisPage,
});
