import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import userEvent from '@testing-library/user-event';
import type { Link, LinkTargetCandidate, Note, TopicRelatedNote } from '@nee3/shared-types';
import { LinkPanel } from './LinkPanel.tsx';

const useLinkTargets = vi.fn();
const useTopicRelatedNotes = vi.fn();

vi.mock('../../api/linkHooks.ts', () => ({
  useLinkTargets: (fromNoteId: number, query: string, enabled: boolean) =>
    useLinkTargets(fromNoteId, query, enabled),
}));

vi.mock('../../api/topicHooks.ts', () => ({
  useTopicRelatedNotes: (noteId: number, enabled: boolean) => useTopicRelatedNotes(noteId, enabled),
}));

const literature = (overrides: Partial<Extract<Note, { kind: 'literature' }>> = {}): Note => ({
  id: 2,
  userId: 1,
  kind: 'literature',
  sourceId: 7,
  body: 'Elaboration is what makes a note worth having.',
  section: 'Ch. 3',
  position: '42',
  excerpt: null,
  openQuestion: false,
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  ...overrides,
});

const permanent = (overrides: Partial<Extract<Note, { kind: 'permanent' }>> = {}): Note => ({
  id: 3,
  userId: 1,
  kind: 'permanent',
  title: 'Writing is how an idea is tested.',
  body: 'An idea that cannot be written down has not been had yet.',
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

const candidate = (overrides: Partial<LinkTargetCandidate> = {}): LinkTargetCandidate => ({
  note: literature(),
  sourceTitle: 'How to Take Smart Notes',
  existingLink: null,
  ...overrides,
});

const link = (overrides: Partial<Link> = {}): Link => ({
  id: 11,
  originNoteId: 2,
  targetNoteId: 1,
  reason: 'That note says this about mine.',
  targetReason: null,
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

const answer = (data: {
  sameSource?: LinkTargetCandidate[];
  results?: LinkTargetCandidate[];
  existingLinks?: Link[];
}) => ({
  data: {
    sameSource: data.sameSource ?? [],
    results: data.results ?? [],
    existingLinks: data.existingLinks ?? [],
  },
  isPending: false,
  isError: false,
});

const topicAnswer = (notes: TopicRelatedNote[] = []) => ({
  data: { notes },
  isPending: false,
  isError: false,
});

describe('LinkPanel', () => {
  beforeEach(() => {
    useLinkTargets.mockReset();
    useTopicRelatedNotes.mockReset();
    useTopicRelatedNotes.mockReturnValue(topicAnswer());
  });

  it('offers the notes filed under the same Topic, without anything being typed', () => {
    useLinkTargets.mockReturnValue(answer({ existingLinks: [link({ targetNoteId: 3 })] }));
    useTopicRelatedNotes.mockReturnValue(
      topicAnswer([
        {
          note: permanent({ id: 4, title: 'Reading without writing is forgetting.' }),
          sourceTitle: null,
          topics: [],
        },
        { note: permanent({ id: 3 }), sourceTitle: null, topics: [] },
      ]),
    );

    render(<LinkPanel fromNoteId={2} onLink={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Filed under the same Topic')).toBeInTheDocument();
    expect(screen.getByText('Reading without writing is forgetting.')).toBeInTheDocument();
    // A row the pair is already linked on says so rather than offering a second Link.
    expect(screen.getByText('Already linked')).toBeInTheDocument();
    expect(useTopicRelatedNotes).toHaveBeenCalledWith(2, true);
  });

  it('offers a note once when it is both in this reading and under the same Topic', () => {
    useLinkTargets.mockReturnValue(answer({ sameSource: [candidate()] }));
    useTopicRelatedNotes.mockReturnValue(
      topicAnswer([{ note: literature(), sourceTitle: 'How to Take Smart Notes', topics: [] }]),
    );

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByText('Filed under the same Topic')).not.toBeInTheDocument();
    expect(screen.getAllByText('How to Take Smart Notes · Ch. 3 · p. 42')).toHaveLength(1);
  });

  it('offers the Source’s own notes without anything being typed', () => {
    useLinkTargets.mockReturnValue(answer({ sameSource: [candidate()] }));

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);

    // Browsing comes first: linking must not depend on remembering an older note's wording.
    expect(screen.getByText('From this reading')).toBeInTheDocument();
    expect(screen.getByText('How to Take Smart Notes · Ch. 3 · p. 42')).toBeInTheDocument();
    // Nothing is searched until something is typed, so no Found group yet.
    expect(screen.queryByText('Found')).not.toBeInTheDocument();
    expect(useLinkTargets).toHaveBeenCalledWith(1, '', true);
  });

  it('searches on what was typed, a beat behind the typing', async () => {
    useLinkTargets.mockReturnValue(answer({}));

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Search your notes'), 'elaboration');

    await waitFor(() => {
      expect(useLinkTargets).toHaveBeenLastCalledWith(1, 'elaboration', true);
    });
  });

  it('shows a result with enough of it to be recognized', async () => {
    useLinkTargets.mockReturnValue(
      answer({
        results: [
          candidate({
            note: permanent(),
            sourceTitle: null,
          }),
        ],
      }),
    );

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);
    // The search tier appears with the query it belongs to, not before it.
    await userEvent.type(screen.getByLabelText('Search your notes'), 'writing');
    await screen.findByText('Found');

    expect(screen.getByText('Permanent note')).toBeInTheDocument();
    expect(screen.getByText('Writing is how an idea is tested.')).toBeInTheDocument();
    // The preview is what makes the row readable where it is found, rather than after a second
    // fetch.
    expect(
      screen.getByText('An idea that cannot be written down has not been had yet.'),
    ).toBeInTheDocument();
  });

  it('asks for the reason before making the Link, and never the other way round', async () => {
    const onLink = vi.fn().mockResolvedValue(undefined);
    useLinkTargets.mockReturnValue(answer({ sameSource: [candidate()] }));

    render(<LinkPanel fromNoteId={1} onLink={onLink} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Link to this' }));

    expect(onLink).not.toHaveBeenCalled();

    await userEvent.type(
      screen.getByLabelText('Why these belong together'),
      'Both are about effort avoided.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Link these' }));

    expect(onLink).toHaveBeenCalledWith({
      originNoteId: 1,
      targetNoteId: 2,
      reason: 'Both are about effort avoided.',
    });
  });

  it('refuses a connection with no reason, since the reason is the thought', async () => {
    const onLink = vi.fn();
    useLinkTargets.mockReturnValue(answer({ sameSource: [candidate()] }));

    render(<LinkPanel fromNoteId={1} onLink={onLink} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Link to this' }));
    await userEvent.click(screen.getByRole('button', { name: 'Link these' }));

    expect(
      screen.getByText('Every Link needs a line saying why the two belong together.'),
    ).toBeInTheDocument();
    expect(onLink).not.toHaveBeenCalled();
  });

  it('shows the Link already there and takes this end’s reason instead of a second Link', async () => {
    const onLink = vi.fn().mockResolvedValue(undefined);
    useLinkTargets.mockReturnValue(
      answer({
        sameSource: [candidate({ existingLink: link() })],
      }),
    );

    render(<LinkPanel fromNoteId={1} onLink={onLink} onClose={vi.fn()} />);

    // The other end's reason is shown: the pair is linked, and this is what it already says.
    expect(screen.getByText('That note says this about mine.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Say why from this end' }));
    await userEvent.type(
      screen.getByLabelText('Why these belong together'),
      'And mine says this back.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add your reason' }));

    expect(onLink).toHaveBeenCalledWith({
      originNoteId: 1,
      targetNoteId: 2,
      reason: 'And mine says this back.',
    });
  });

  it('offers nothing to a pair this end has already said why about', () => {
    useLinkTargets.mockReturnValue(
      answer({
        sameSource: [candidate({ existingLink: link({ originNoteId: 1, targetNoteId: 2 }) })],
      }),
    );

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Already linked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Link to this/ })).not.toBeInTheDocument();
  });

  it('says the box is reachable rather than showing two empty tiers', () => {
    useLinkTargets.mockReturnValue(answer({}));

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);

    expect(
      screen.getByText(
        'Search for a note to link to - anything you have written is reachable from here.',
      ),
    ).toBeInTheDocument();
  });

  // The server's refusals here are written to be read - an end that has already said why, a
  // note that has gone - and nothing else surfaces an expected 4xx, so the field shows them.
  it('shows the server’s refusal at the field that asked for the connection', async () => {
    const refusal = 'This note has already said why - rewrite the reason where the Link is shown.';
    const onLink = vi.fn().mockRejectedValue(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: { error: refusal },
        headers: {},
        config: { headers: {} as never },
      }),
    );
    useLinkTargets.mockReturnValue(answer({ sameSource: [candidate()] }));

    render(<LinkPanel fromNoteId={1} onLink={onLink} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Link to this' }));
    await userEvent.type(
      screen.getByLabelText('Why these belong together'),
      'Both are about effort avoided.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Link these' }));

    expect(await screen.findByText(refusal)).toBeInTheDocument();
    // What was typed is still there: the line is the user's thought, not a form entry to redo.
    expect(screen.getByLabelText('Why these belong together')).toHaveValue(
      'Both are about effort avoided.',
    );
  });

  it('says so when the search could not be run', () => {
    useLinkTargets.mockReturnValue({ data: undefined, isPending: false, isError: true });

    render(<LinkPanel fromNoteId={1} onLink={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Your notes could not be searched just now.')).toBeInTheDocument();
  });
});
