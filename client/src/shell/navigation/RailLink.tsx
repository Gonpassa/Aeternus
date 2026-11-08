import { Link, useMatchRoute } from '@tanstack/react-router';
import { Stack } from '../../atoms/Stack/Stack.tsx';

export function RailLink({
  to,
  children,
  onClick,
  nested = false,
}: {
  to: string;
  children: string;
  onClick?: () => void;
  // A page under a module's own label, indented beneath it rather than sitting at the
  // rail's top level - Notes > Read, where "Notes" is a heading and not a destination.
  nested?: boolean;
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
      pl={nested ? '6' : '2.5'}
      pr="2.5"
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
