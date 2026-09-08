import { useMediaQuery } from '../../styling/useMediaQuery.ts';
import { breakpoints } from '../../styling/breakpoints.ts';
import { MobileNav } from './MobileNav.tsx';
import { DesktopNav } from './DesktopNav.tsx';

export function Nav() {
  const isMobile = useMediaQuery(breakpoints.until('md'));

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
