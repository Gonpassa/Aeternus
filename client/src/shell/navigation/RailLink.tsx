import { Link, useMatchRoute } from '@tanstack/react-router';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';

export function RailLink({
  to,
  children,
  badge,
  onClick,
  nested = false,
}: {
  to: string;
  children: string;
  // A count the destination carries, said after the label rather than as a dot or a pill:
  // Notes > Review reads "Review · 3 due", and the words are the whole badge.
  badge?: string;
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
      {/* The badge is quieter than the label it follows, so it is a span of its own - and
          because an accessible name joins those spans without the space the margin draws, the
          whole label is named here rather than computed from them. */}
      <Link
        to={to}
        onClick={onClick}
        aria-label={badge === undefined ? undefined : `${children} · ${badge}`}
      >
        {children}
        {badge !== undefined && (
          <Text as="span" color="paper/60" ml="1.5">
            {`· ${badge}`}
          </Text>
        )}
      </Link>
    </Stack>
  );
}
