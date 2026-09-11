import { useEffect, useRef, type ReactNode } from 'react';
import { chakra } from '@chakra-ui/react';
import { useTabsContext } from '../Tabs/TabsContext.ts';

export interface TabProps {
  /** Identifies this tab in the parent `Tabs`' `value`/`onChange`. */
  value: string;
  label: ReactNode;
}

// One tab in a `Tabs` list. Registers its element with the parent on mount so arrow-key
// focus can reach it, reports its own focus so the parent can move the tab stop, and reads
// both the selection and that tab stop back from context.
export function Tab({ value, label }: TabProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const {
    value: selectedValue,
    rovingValue,
    onChange,
    onTabFocus,
    onTabBlur,
    register,
  } = useTabsContext();
  const selected = selectedValue === value;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    return register(element);
  }, [register]);

  return (
    <chakra.button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={rovingValue === value ? 0 : -1}
      cursor="pointer"
      pb="2"
      mb="-1px"
      borderBottomWidth="2px"
      borderBottomStyle="solid"
      borderBottomColor={selected ? 'rust' : 'transparent'}
      textStyle="label"
      color={selected ? 'ink' : 'inkSoft'}
      transition="color 150ms ease-out, border-color 150ms ease-out"
      onFocus={() => onTabFocus(value)}
      onBlur={() => onTabBlur(value)}
      onClick={() => onChange(value)}
    >
      {label}
    </chakra.button>
  );
}
