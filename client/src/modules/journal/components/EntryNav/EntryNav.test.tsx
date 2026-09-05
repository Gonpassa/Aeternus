import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: { entryId: string };
    children: ReactNode;
  }) => <a href={params ? to.replace('$entryId', params.entryId) : to}>{children}</a>,
}));

const { EntryNav } = await import('./EntryNav.tsx');

describe('EntryNav', () => {
  it('renders both buttons as enabled links to their neighbor entry when both are available', () => {
    render(<EntryNav hasNext hasPrevious nextEntryId={12} previousEntryId={7} />);

    const next = screen.getByRole('link', { name: 'Next' });
    const previous = screen.getByRole('link', { name: 'Previous' });
    expect(next).toHaveAttribute('href', '/journal/12');
    expect(previous).toHaveAttribute('href', '/journal/7');
  });

  it('disables Next (without hiding it) and keeps Previous enabled when there is no next entry', () => {
    render(<EntryNav hasNext={false} hasPrevious nextEntryId={null} previousEntryId={7} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/journal/7');
  });

  it('disables Previous (without hiding it) and keeps Next enabled when there is no previous entry', () => {
    render(<EntryNav hasNext hasPrevious={false} nextEntryId={12} previousEntryId={null} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/journal/12');
  });
});
