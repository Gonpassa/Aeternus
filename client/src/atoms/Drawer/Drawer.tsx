import * as React from 'react';
import { Drawer as ChakraDrawer, Portal, type SystemStyleObject } from '@chakra-ui/react';
import styles from './Drawer.module.css';

export type DrawerPlacement = 'left' | 'right';

const CHAKRA_PLACEMENT: Record<DrawerPlacement, 'start' | 'end'> = {
  left: 'start',
  right: 'end',
};

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  placement: DrawerPlacement;
  /** Set to false to disable dismissing the drawer by clicking outside its content. Defaults to true. */
  closeOnOutsideClick?: boolean;
  /**
   * Set to false when a control outside this component's own tree (e.g. a persistent
   * header's toggle button) must stay visible, focusable and clickable while the drawer
   * is open. Disables Ark's default aria-hiding/pointer-blocking of background content;
   * focus trapping and scroll locking are kept regardless. Defaults to true.
   */
  modal?: boolean;
  /**
   * Reserves this much space at the top of the drawer (and its backdrop's content area),
   * for a fixed/sticky header that should sit above the drawer rather than be covered by
   * it. Defaults to '0'.
   */
  offsetTop?: string;
  /** Accessible name for the drawer region, since it has no visible title. */
  'aria-label': string;
  width?: SystemStyleObject['width'];
  children: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  placement,
  closeOnOutsideClick = true,
  modal = true,
  offsetTop = '0',
  'aria-label': ariaLabel,
  width = '15rem',
  children,
}: DrawerProps) {
  return (
    <ChakraDrawer.Root
      open={open}
      placement={CHAKRA_PLACEMENT[placement]}
      closeOnInteractOutside={closeOnOutsideClick}
      onOpenChange={(details) => !details.open && onClose()}
      modal={modal}
      trapFocus
      preventScroll
    >
      <Portal>
        <ChakraDrawer.Backdrop className={styles.backdrop} bg="blackAlpha.600" />
        <ChakraDrawer.Positioner top={offsetTop} h={`calc(100dvh - ${offsetTop})`}>
          <ChakraDrawer.Content
            aria-label={ariaLabel}
            data-placement={placement}
            className={styles.content}
            bg="paperCard"
            boxShadow="lg"
            w={width}
            maxW={width}
          >
            {children}
          </ChakraDrawer.Content>
        </ChakraDrawer.Positioner>
      </Portal>
    </ChakraDrawer.Root>
  );
}
