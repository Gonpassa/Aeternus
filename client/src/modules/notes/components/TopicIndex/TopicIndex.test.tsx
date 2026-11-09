import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TopicListEntry } from '@nee3/shared-types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce((path, [key, v]) => path.replace(`$${key}`, v), to)}
    >
      {children}
    </a>
  ),
}));

const { TopicIndex } = await import('./TopicIndex.tsx');

const entry = (
  id: number,
  name: string,
  permanentNoteCount = 0,
  sourceCount = 0,
): TopicListEntry => ({
  id,
  userId: 1,
  name,
  createdAt: '2026-09-01T10:00:00.000Z',
  permanentNoteCount,
  sourceCount,
});

describe('TopicIndex', () => {
  it('lists every Topic with its carrier counts', () => {
    render(<TopicIndex topics={[entry(1, 'Attention', 3, 2), entry(2, 'Myth', 1, 1)]} />);

    expect(screen.getByRole('link', { name: /Attention/ })).toHaveAttribute(
      'href',
      '/notes/topics/1',
    );
    expect(screen.getByText('3 Permanent notes · 2 Sources')).toBeInTheDocument();
    expect(screen.getByText('1 Permanent note · 1 Source')).toBeInTheDocument();
  });

  // The word was chosen deliberately, so it stays in the vocabulary until it is deleted
  // (CONTEXT.md, Topic).
  it('keeps a Topic nobody carries, and says so', () => {
    render(<TopicIndex topics={[entry(1, 'Attention')]} />);

    expect(screen.getByRole('link', { name: /Attention/ })).toBeInTheDocument();
    expect(screen.getByText('Nothing carries it')).toBeInTheDocument();
  });

  it('invites a first Topic when the vocabulary is empty', () => {
    render(<TopicIndex topics={[]} />);

    expect(screen.getByRole('heading', { name: 'No Topics yet.' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
