import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';
import { useMediaQuery } from '../styling/useMediaQuery.ts';
import { breakpoints } from '../styling/breakpoints.ts';
import { Stack } from '../atoms/Stack/Stack.tsx';
import { Text } from '../atoms/Text/Text.tsx';
import { IconButton } from '../atoms/IconButton/IconButton.tsx';
import { Drawer } from '../atoms/Drawer/Drawer.tsx';

function RailLink({
  to,
  children,
  onClick,
}: {
  to: string;
  children: string;
  onClick?: () => void;
}) {
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ to, fuzzy: true }));

  return (
    <Stack
      asChild
      alignItems="center"
      textStyle="button"
      color={isActive ? 'paper' : 'paper/72'}
      bg={isActive ? 'paper/12' : 'transparent'}
      boxShadow={isActive ? 'inset 2px 0 0 #A8532F' : 'none'}
      px="2.5"
      py="2.5"
      borderRadius="4px"
      _hover={{ color: 'paper', bg: 'paper/8' }}
    >
      <Link to={to} onClick={onClick}>
        {children}
      </Link>
    </Stack>
  );
}

function NavSections({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user } = useAuth();

  return (
    <>
      {user && (
        <Stack direction="column" gap="1">
          <RailLink to="/journal" onClick={onLinkClick}>
            Journal
          </RailLink>
        </Stack>
      )}

      {import.meta.env.DEV && (
        <Stack direction="column" gap="1">
          <RailLink to="/dev/components" onClick={onLinkClick}>
            UI components
          </RailLink>
        </Stack>
      )}
    </>
  );
}

function AccountBlock({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onLinkClick?.();
    try {
      await logout();
    } catch {
      // Navigate home regardless; the session cookie may already be gone either way.
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <Stack direction="column" textStyle="label" color="paper/45" lineHeight="tall">
      {user ? (
        <Stack direction="column" align="flex-start" gap="2">
          <Text color="paper/70" textTransform="uppercase" letterSpacing="wide">
            {user.username}
          </Text>
          <Link to="/" onClick={handleLogout}>
            Log out
          </Link>
        </Stack>
      ) : (
        <Stack direction="column" align="flex-start" gap="2">
          <Link to="/login" onClick={onLinkClick}>
            Log in
          </Link>
          <Link to="/register" onClick={onLinkClick}>
            Register
          </Link>
        </Stack>
      )}
    </Stack>
  );
}

const HEADER_HEIGHT = '4rem';

function MobileNav() {
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

function DesktopNav() {
  return (
    <Stack
      as="nav"
      aria-label="Aeternus sections"
      direction="column"
      gap="10"
      w="15rem"
      flexShrink="0"
      h="100vh"
      overflowY="auto"
      bg="inkBlue"
      color="paper"
      px="6"
      py="7"
    >
      <Stack asChild direction="column" textStyle="sectionHeading">
        <Link to="/">
          Aeternus
          <Text
            as="small"
            display="block"
            variant="eyebrow"
            fontWeight="normal"
            color="paper/60"
            mt="1.5"
          >
            Journal &amp; commonplace book
          </Text>
        </Link>
      </Stack>

      <NavSections />

      <Stack direction="column" mt="auto">
        <AccountBlock />
      </Stack>
    </Stack>
  );
}

export function Nav() {
  const isMobile = useMediaQuery(breakpoints.until('md'));

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
