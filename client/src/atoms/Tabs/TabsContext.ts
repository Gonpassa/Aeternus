import { createContext, useContext } from 'react';

export interface TabsContextValue {
  /** The selected tab's value. */
  value: string;
  /**
   * The tab holding the list's single tab stop: whichever tab has focus, falling back to
   * the selected one while focus is elsewhere. Arrow keys move it without selecting.
   */
  rovingValue: string;
  onChange: (value: string) => void;
  onTabFocus: (value: string) => void;
  onTabBlur: (value: string) => void;
  /** Adds a tab to the list `Tabs` walks with the arrow keys; returns its cleanup. */
  register: (element: HTMLButtonElement) => () => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab must be rendered inside a Tabs');
  }
  return context;
}
