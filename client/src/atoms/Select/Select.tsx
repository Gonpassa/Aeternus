import type { ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import {
  Select as ChakraSelect,
  Portal,
  chakra,
  createListCollection,
  type ConditionalValue,
} from '@chakra-ui/react';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden.tsx';

// Deliberately single-select. Multi-select arrives as a sibling `MultiSelect` atom
// rather than a `multiple` flag here: folding both into one component roughly doubles
// its size and drags in a union-typed `value` for every caller. See
// docs/adr/0009-select-is-a-closed-atom.md.

// The atom needs `value` to track selection, `label` for the trigger text and the
// default row, and honours `disabled` if present. Anything else a caller adds is
// opaque to the atom and exists only for `itemSlot`.
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<TOption extends SelectOption> {
  items: readonly TOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown in the trigger while `value` matches no option. */
  placeholder?: string;
  /** Row content beyond a plain label. Receives the caller's own option object. */
  itemSlot?: (item: TOption) => ReactNode;
  /** Reserve the width of the widest option so the trigger doesn't shift on change. */
  fitWidest?: boolean;
  /** A width floor, for reasons other than layout shift. */
  minW?: ConditionalValue<string | number>;
  /** Named for assistive technology; a select is rarely self-describing. */
  'aria-label': string;
}

export function Select<TOption extends SelectOption>({
  items,
  value,
  onChange,
  placeholder,
  itemSlot,
  fitWidest = true,
  minW,
  'aria-label': ariaLabel,
}: SelectProps<TOption>) {
  // Zag compares collections by content rather than by identity, so building one
  // per render is a no-op for the select machine and needs no memo.
  const collection = createListCollection({ items });

  // The placeholder shares the trigger with the option labels, so it belongs in the
  // width reservation too - otherwise a long placeholder shifts on first selection.
  // Deduplicated: two options may legitimately share a label, and only the widest
  // distinct string matters here.
  const labels = items.map((item) => item.label);
  const sizerLabels = Array.from(new Set(placeholder ? [placeholder, ...labels] : labels));

  return (
    <ChakraSelect.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => onChange(details.value[0] ?? '')}
      positioning={{ sameWidth: false }}
    >
      {/* Ark points the trigger's `aria-labelledby` at this label, so it carries the
          accessible name; it is never visible, since callers that want a visible label
          wrap the select in a `FieldLabel` of their own. */}
      <ChakraSelect.Label asChild>
        <VisuallyHidden>{ariaLabel}</VisuallyHidden>
      </ChakraSelect.Label>
      <ChakraSelect.Control minW={minW ?? 'fit-content'}>
        <ChakraSelect.Trigger
          display="flex"
          alignItems="center"
          gap="2"
          borderWidth="1px"
          borderColor="line"
          bg="transparent"
          px="3"
          py="2"
          textStyle="label"
          whiteSpace="nowrap"
        >
          <chakra.span display="grid" alignItems="center" justifyItems="center" flex="1" minW="0">
            <ChakraSelect.ValueText
              gridArea="1 / 1"
              placeholder={placeholder}
              whiteSpace="nowrap"
              overflow="visible"
            />
            {/* Width is reserved in CSS rather than measured: every label is stacked into
                the same grid cell as the value text, so the browser sizes the trigger to
                the longest one natively, at any font size and without waiting on fonts.
                Hidden from assistive technology so the trigger isn't named by the list. */}
            {fitWidest && (
              <chakra.span
                aria-hidden="true"
                gridArea="1 / 1"
                display="grid"
                h="0"
                visibility="hidden"
                pointerEvents="none"
              >
                {sizerLabels.map((label) => (
                  <chakra.span key={label} gridArea="1 / 1" whiteSpace="nowrap">
                    {label}
                  </chakra.span>
                ))}
              </chakra.span>
            )}
          </chakra.span>
          {/* Ark marks the indicator `aria-hidden` and stamps the open state on it,
              so the chevron can turn on `_open` alone. It is the atom's, not the
              caller's: every select points the same way at the same size. */}
          <ChakraSelect.Indicator
            color="inkSoft"
            transition="transform 150ms"
            _open={{ transform: 'rotate(180deg)' }}
          >
            <ChevronDownIcon size={14} />
          </ChakraSelect.Indicator>
        </ChakraSelect.Trigger>
      </ChakraSelect.Control>
      <Portal>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content
            bg="paperCard"
            borderWidth="1px"
            borderColor="line"
            borderRadius="md"
            boxShadow="md"
            p="1"
            css={{ scrollbarGutter: 'stable' }}
          >
            {items.map((item) => (
              <ChakraSelect.Item
                key={item.value}
                item={item}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="4"
                px="2"
                py="1.5"
                textStyle="label"
                color="ink"
                _highlighted={{ bg: 'line/60' }}
              >
                {/* Ark renders the item text as a span, but a slot is free to hand back a
                    block-level row, so `asChild` swaps in a div and keeps the nesting valid. */}
                <ChakraSelect.ItemText asChild>
                  <chakra.div>{itemSlot ? itemSlot(item) : item.label}</chakra.div>
                </ChakraSelect.ItemText>
                <ChakraSelect.ItemIndicator />
              </ChakraSelect.Item>
            ))}
          </ChakraSelect.Content>
        </ChakraSelect.Positioner>
      </Portal>
    </ChakraSelect.Root>
  );
}
