// Mirrors Chakra's stock breakpoint tokens (theme.ts doesn't override them), so a
// `breakpoints.from('md')` query lines up with the same `md` used in `{ base, md }`
// responsive style props elsewhere (Layout.tsx, Nav.tsx, ...). Keep in sync if theme.ts
// ever defines custom breakpoints.
const BREAKPOINT_PX = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINT_PX;

export const breakpoints = {
  /** Media query matching viewports at or above the given breakpoint. */
  from(name: Breakpoint): string {
    return `(min-width: ${BREAKPOINT_PX[name]}px)`;
  },
  /** Media query matching viewports narrower than the given breakpoint. */
  until(name: Breakpoint): string {
    return `(max-width: ${BREAKPOINT_PX[name] - 1}px)`;
  },
};
