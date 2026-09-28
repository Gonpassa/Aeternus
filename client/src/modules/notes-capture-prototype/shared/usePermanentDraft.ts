// PROTOTYPE - the state of a Permanent note being written. Its fields are settled (#69: a
// claim as the title, plain body, Topics, and at least one Link, each with a reason). What
// #73 asks is where the invitation to write one sits on the reading page, not what it holds.
import { useState } from 'react';
import type { LinkDraft } from '../captureNotesData.ts';

export function usePermanentDraft(initialLinks: LinkDraft[] = []) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [links, setLinks] = useState<LinkDraft[]>(initialLinks);

  const topics = topicsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const canSave =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    links.length > 0 &&
    links.every((l) => l.reason.trim().length > 0);

  const reset = (nextLinks: LinkDraft[] = []) => {
    setTitle('');
    setBody('');
    setTopicsText('');
    setLinks(nextLinks);
  };

  return {
    title,
    setTitle,
    body,
    setBody,
    topicsText,
    setTopicsText,
    topics,
    links,
    setLinks,
    canSave,
    reset,
  };
}

export type PermanentDraft = ReturnType<typeof usePermanentDraft>;
