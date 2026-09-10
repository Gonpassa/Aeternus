import { useRef, type KeyboardEvent } from 'react';
import { Flex, chakra } from '@chakra-ui/react';

export interface TabOption {
  value: string;
  label: string;
}

export interface TabsProps {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the tab list for assistive technology. */
  'aria-label'?: string;
}

// A row of mono uppercase labels sitting on a hairline rule, the active one underlined in
// rust. Switches between views, unlike ToggleButtonGroup, which picks a form value with
// button-styled options. Controlled; arrow keys move the selection (selection follows
// focus, per the tabs pattern for a small, static set of views).
export function Tabs({ options, value, onChange, 'aria-label': ariaLabel }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const moveSelection = (delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    if (index === -1 || options.length === 0) return;
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const buttons = listRef.current?.querySelectorAll('button');
    const nextIndex = options.findIndex((option) => option.value === next.value);
    buttons?.[nextIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
    }
  };

  return (
    <Flex
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      gap="6"
      borderBottomWidth="1px"
      borderBottomColor="line"
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <chakra.button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            cursor="pointer"
            pb="2"
            mb="-1px"
            borderBottomWidth="2px"
            borderBottomStyle="solid"
            borderBottomColor={active ? 'rust' : 'transparent'}
            textStyle="label"
            color={active ? 'ink' : 'inkSoft'}
            transition="color 150ms ease-out, border-color 150ms ease-out"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </chakra.button>
        );
      })}
    </Flex>
  );
}
