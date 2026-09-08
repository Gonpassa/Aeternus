import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Drawer } from '../../atoms/Drawer/Drawer.tsx';
import { NavSections } from './NavSections.tsx';
import { AccountBlock } from './AccountBlock.tsx';

const HEADER_HEIGHT = '4rem';

export function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <Stack
        direction="row"
        align="center"
        justify="space-between"
        position="sticky"
        top="0"
        zIndex="tooltip"
        bg="inkBlue"
        color="paper"
        h={HEADER_HEIGHT}
        px="5"
      >
        <Stack asChild textStyle="sectionHeading">
          <Link to="/">Aeternus</Link>
        </Stack>
        <IconButton
          icon={drawerOpen ? X : Menu}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          variant="ghost"
          color="paper"
          _hover={{ bg: 'paper/8' }}
          onClick={() => setDrawerOpen((open) => !open)}
        />
      </Stack>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        placement="right"
        aria-label="Aeternus sections"
        // The header's toggle button lives outside the drawer's own tree, so it needs to
        // stay clickable (and out of the aria-hidden background) while the drawer is open.
        modal={false}
        offsetTop={HEADER_HEIGHT}
        width={{ base: '100%', sm: '15rem' }}
      >
        <Stack direction="column" gap="10" h="100%" bg="inkBlue" color="paper" px="5" py="4">
          <NavSections onLinkClick={closeDrawer} />
          <Stack direction="column" mt="auto">
            <AccountBlock onLinkClick={closeDrawer} />
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
