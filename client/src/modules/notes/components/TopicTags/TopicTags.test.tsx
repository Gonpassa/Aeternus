import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Topic } from '@nee3/shared-types';

import { routerLinkStub } from '../../../../test/routerLinkStub.tsx';

vi.mock('@tanstack/react-router', () => routerLinkStub());

const { TopicTags } = await import('./TopicTags.tsx');

const topic = (id: number, name: string): Topic => ({
  id,
  userId: 1,
  name,
  createdAt: '2026-09-01T10:00:00.000Z',
});

describe('TopicTags', () => {
  it('names the Topics the carrier wears, in the order given', () => {
    render(<TopicTags topics={[topic(1, 'Attention'), topic(2, 'Myth')]} />);

    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(names).toEqual(['Attention', 'Myth']);
  });

  // Topics are optional on every carrier, so carrying none is not missing data and needs no
  // placeholder saying so (CONTEXT.md, Topic).
  it('renders nothing at all when there are none', () => {
    const { container } = render(<TopicTags topics={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('says whose Topics these are when asked to', () => {
    render(
      <TopicTags
        topics={[topic(1, 'Attention')]}
        caption="From the Source"
        label="Topics inherited from the Source"
      />,
    );

    expect(screen.getByText('From the Source')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Topics inherited from the Source' }),
    ).toBeInTheDocument();
  });

  // A Topic is a place rather than a filter state, so the tag is the way in (#88).
  it('leads each tag to that Topic’s own view', () => {
    render(<TopicTags topics={[topic(7, 'Attention')]} />);

    expect(screen.getByRole('link', { name: 'Attention' })).toHaveAttribute(
      'href',
      '/notes/topics/7',
    );
  });

  it('leaves the chips unlinked where the carrier itself is the link', () => {
    render(<TopicTags topics={[topic(7, 'Attention')]} linked={false} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Attention')).toBeInTheDocument();
  });
});
