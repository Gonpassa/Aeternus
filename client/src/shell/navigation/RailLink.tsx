import { Link, useMatchRoute } from '@tanstack/react-router';
import { Stack } from '../../atoms/Stack/Stack.tsx';

export function RailLink({
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
