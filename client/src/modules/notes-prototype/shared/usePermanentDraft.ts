// PROTOTYPE - the state of a Permanent note being written. Its fields are settled (#69:
// claim title, plain body, Links with reasons, Topics); only how a variant invites it differs.
import { useState } from 'react';
import type { LinkDraft } from '../prototypeNotesData.ts';

export function usePermanentDraft(initialLinks: LinkDraft[] = []) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [links, setLinks] = useState<LinkDraft[]>(initialLinks);

  const linkTo = (targetId: string) => {
    if (links.some((l) => l.targetId === targetId)) return;
    setLinks([...links, { targetId, reason: '' }]);
  };
  const isLinked = (targetId: string) => links.some((l) => l.targetId === targetId);
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
    linkTo,
    isLinked,
    canSave,
    reset,
  };
}

export type PermanentDraft = ReturnType<typeof usePermanentDraft>;
