import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceForm } from './SourceForm.tsx';
import { SOURCE_TITLE_MAX, SOURCE_AUTHOR_MAX } from './SourceForm.utils.ts';

// The same two jsdom gaps Ark's select machine walks into as in Select.test.tsx: every
// bounding rect is 0x0, which its tabbable check reads as hidden, and `Element.scrollTo`
// does not exist, which the open transition calls.
beforeAll(() => {
  Element.prototype.getClientRects = function getClientRects() {
    return [{ width: 1, height: 1, top: 0, left: 0, bottom: 1, right: 1 }] as unknown as DOMRectList;
  };
  Element.prototype.scrollTo = function scrollTo() {};
});

// The click that chooses an option starts Ark's close transition, and the dismiss layer is
// still over the form until it finishes - a field typed into immediately after loses its
// keystrokes. Waiting for the list to be gone rather than for a timer keeps that
// deterministic: without it, whichever field follows a kind flakes under full-suite load.
const chooseKind = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(screen.getByRole('combobox', { name: 'Kind' }));
  await user.click(await screen.findByRole('option', { name: label }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
};

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /add source/i }));
};

describe('SourceForm', () => {
  it('submits a title and a kind, with the optional fields as null', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'How to Take Smart Notes');
    await chooseKind(user, 'Book');
    await submit(user);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'How to Take Smart Notes',
        kind: 'book',
        author: null,
        url: null,
      }),
    );
  });

  it('passes an author and a link through when they are given', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'The Nature of Order');
    await chooseKind(user, 'Book');
    await user.type(screen.getByLabelText('Author'), 'Christopher Alexander');
    await user.type(screen.getByLabelText('Link'), 'https://example.com/order');
    await submit(user);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'Christopher Alexander',
          url: 'https://example.com/order',
        }),
      ),
    );
  });

  it('refuses a Source with no title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await chooseKind(user, 'Article');
    await submit(user);

    expect(await screen.findByText('A Source needs a title.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a Source with no kind chosen', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'An untitled kind');
    await submit(user);

    expect(
      await screen.findByText('A Source is a book, an article, a video, or something else.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // The ceiling is validation rather than a column type precisely so that this is the message
  // a user sees, in the module's own voice, instead of a Postgres error (ADR 0012, ADR 0017).
  it('refuses an over-length title with a readable message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(SOURCE_TITLE_MAX + 1));
    await chooseKind(user, 'Book');
    await submit(user);

    expect(
      await screen.findByText(`A Source title is at most ${SOURCE_TITLE_MAX} characters.`),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a title of exactly the ceiling', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(SOURCE_TITLE_MAX));
    await chooseKind(user, 'Book');
    await submit(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('refuses an over-length author with a readable message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'A long byline');
    await chooseKind(user, 'Book');
    await user.click(screen.getByLabelText('Author'));
    await user.paste('a'.repeat(SOURCE_AUTHOR_MAX + 1));
    await submit(user);

    expect(
      await screen.findByText(`An author is at most ${SOURCE_AUTHOR_MAX} characters.`),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // A Source's link is rendered as a link, so a scheme-less or `javascript:` value is refused
  // rather than merely measured.
  // eslint-disable-next-line no-script-url -- the script URL being refused is the test's point
  it.each(['example.com', 'javascript:alert(1)'])('refuses the link %s', async (url) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'A questionable link');
    await chooseKind(user, 'Article');
    await user.click(screen.getByLabelText('Link'));
    await user.paste(url);
    await submit(user);

    expect(
      await screen.findByText('A Source link must start with http:// or https://.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('trims what it submits, so surrounding space never reaches the API', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SourceForm onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('  Tristes Tropiques  ');
    await chooseKind(user, 'Book');
    await submit(user);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Tristes Tropiques' }),
      ),
    );
  });

  // There is no reading status to offer, because a Source has no lifecycle (CONTEXT.md).
  it('offers no status field', () => {
    render(<SourceForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reading|finished|to read/i)).not.toBeInTheDocument();
  });

  it('offers no Topics field yet', () => {
    render(<SourceForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/topic/i)).not.toBeInTheDocument();
  });

  it('calls onDiscard from the cancel button', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(<SourceForm onSubmit={vi.fn()} onDiscard={onDiscard} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onDiscard).toHaveBeenCalled();
  });
});
