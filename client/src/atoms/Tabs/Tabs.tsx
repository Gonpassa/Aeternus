import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Flex } from '@chakra-ui/react';
import { TabsContext, type TabsContextValue } from './TabsContext.ts';

// Where each key sends focus, given the index of the tab it starts from. A missing start
// (-1, when the event came from something other than a registered tab) still lands
// somewhere sensible.
const KEY_MOVES: Record<string, (current: number, count: number) => number> = {
  ArrowRight: (current, count) => (current + 1) % count,
  ArrowLeft: (current, count) => (current - 1 + count) % count,
  Home: () => 0,
  End: (_current, count) => count - 1,
};

export interface TabsProps {
  /** The selected tab's value, matching one child `Tab`'s. */
  value: string;
  onChange: (value: string) => void;
  /** Names the tab list for assistive technology. */
  'aria-label': string;
  /** The `Tab` children making up the list. */
  children: ReactNode;
}

// A row of mono uppercase labels sitting on a hairline rule, the active one underlined in
// rust. Switches between views, unlike ToggleButtonGroup, which picks a form value with
// button-styled options. Controlled, and composed from `Tab` children:
//
//   <Tabs value={tab} onChange={setTab} aria-label="Analysis mode">
//     <Tab value="analytic" label="Analytic" />
//   </Tabs>
//
// Keyboard handling follows the WAI-ARIA tabs pattern with explicit activation: a roving
// tabIndex gives the list one tab stop, arrow keys plus Home/End move focus between tabs
// without selecting, and Enter or Space selects the focused one through native button
// activation. Selection deliberately does not follow focus, since the views a caller
// renders are not always cheap.
export function Tabs({ value, onChange, 'aria-label': ariaLabel, children }: TabsProps) {
  // Registered by the `Tab` children as they mount, so moving focus never has to re-read
  // the DOM this component itself rendered. Registration order is mount order, which is
  // child order for a fixed set of tabs.
  const tabsRef = useRef<HTMLButtonElement[]>([]);
  // Mirrors which tab has focus, null while focus is outside the list. The tab stop rides
  // along with it rather than with the selection, so the focused tab is always the one
  // reachable with Tab - even when a caller declines to move `value` to the tab just
  // activated.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  const rovingValue = focusedValue ?? value;

  const register = useCallback((element: HTMLButtonElement) => {
    tabsRef.current = [...tabsRef.current, element];
    return () => {
      tabsRef.current = tabsRef.current.filter((tab) => tab !== element);
    };
  }, []);

  // Focus moving from one tab to the next fires blur before focus, so the guard keeps the
  // departing tab from clearing a tab stop the arriving one has already claimed.
  const onTabBlur = useCallback((tabValue: string) => {
    setFocusedValue((current) => (current === tabValue ? null : current));
  }, []);

  const contextValue = useMemo<TabsContextValue>(
    () => ({ value, rovingValue, onChange, onTabFocus: setFocusedValue, onTabBlur, register }),
    [value, rovingValue, onChange, onTabBlur, register],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = KEY_MOVES[event.key];
    if (!move) return;

    const tabs = tabsRef.current;
    if (tabs.length === 0) return;
    // A key event targets the focused element, so the walk always starts from the tab the
    // user is actually on.
    const current = tabs.findIndex((tab) => tab === event.target);
    const next = tabs[move(current, tabs.length)];
    if (!next) return;

    event.preventDefault();
    next.focus();
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <Flex
        role="tablist"
        aria-label={ariaLabel}
        gap="6"
        borderBottomWidth="1px"
        borderBottomColor="line"
        onKeyDown={handleKeyDown}
      >
        {children}
      </Flex>
    </TabsContext.Provider>
  );
}
