import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateSourceRequest,
  SourceKind,
  UpdateSourceRequest,
} from '@nee3/shared-types';
import { validateSourceInput, validateTopicNames } from './validation';
import { sanitizeSourceInput, sanitizeTopicNames } from './sanitize';
import {
  createSource as createSourceRecord,
  deleteSource as deleteSourceRecord,
  findSourceById,
  listSourcesByUser,
  updateSource as updateSourceRecord,
} from '../../db/sources';
import { listNotesBySource, listSectionsBySource } from '../../db/notes';
import { listConnectionsByNoteIds } from '../../db/links';
import { listTopicsBySourceIds, setSourceTopics } from '../../db/topics';
import { EMPTY_CONNECTIONS, toConnections, toLiteratureNote, toTopic } from './serialize';
import { parseSourceId } from './params';
import { getUserId } from '../../types/request';

export const listSources = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rows = await listSourcesByUser({ userId: getUserId(req) });
    // Every Source's Topics in one query rather than one per card: the catalog's filter strip is
    // built from them, so the whole catalog needs them before it can draw anything (#87).
    const topics = await listTopicsBySourceIds({ sourceIds: rows.map((row) => row.id) });
    const sources = rows.map((row) => ({
      ...row,
      topics: (topics.get(row.id) ?? []).map(toTopic),
    }));
    res.status(200).json({ sources });
  } catch (err) {
    next(err);
  }
};

export const createSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateSourceInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const topicValidation = validateTopicNames((req.body as CreateSourceRequest).topicNames);
  if (!topicValidation.valid) {
    res.status(400).json({ error: topicValidation.error } satisfies ApiErrorResponse);
    return;
  }
  const { title, kind, author, url, topicNames } = req.body as CreateSourceRequest;
  const userId = getUserId(req);
  try {
    const source = await createSourceRecord({
      userId,
      // Validation has established both of these; the cast is the handover from
      // `unknown`-typed body parsing to the validated shape, as in the dreams module.
      ...sanitizeSourceInput({ title: title as string, kind: kind as SourceKind, author, url }),
    });
    // Topics are attached by name, which is also how a new one is created: the name resolves
    // against the vocabulary case-insensitively, so "water" attaches the existing "Water"
    // (CONTEXT.md, Topic). An omitted list files a Source carrying none, which is a Source
    // filed exactly as before this ticket.
    const topics = await setSourceTopics({
      userId,
      sourceId: source.id,
      names: sanitizeTopicNames(topicNames),
    });
    res.status(201).json({ source: { ...source, topics: topics.map(toTopic) } });
  } catch (err) {
    next(err);
  }
};

// The reading page's payload, in one request: the Source, its notes oldest-first with the
// connections each is read with, and the distinct sections of those notes for the capture
// card's tab suggestions. Both are folded in here rather than given their own endpoints so
// capture never waits on a second round trip and no card fetches its own Links (#72). The
// Source's Topics fold in the same way, and its Literature notes inherit them (#87).
export const getSource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const source = await findSourceById({ id: sourceId, userId });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    const [rows, sections, topics] = await Promise.all([
      listNotesBySource({ sourceId, userId }),
      listSectionsBySource({ sourceId, userId }),
      listTopicsBySourceIds({ sourceIds: [sourceId] }),
    ]);
    // Every card's connections in two queries rather than two per card: the stream asks for
    // all of them at once, and a note with no Links gets empty groups rather than no key.
    const connections = await listConnectionsByNoteIds({
      noteIds: rows.map((row) => row.id),
      userId,
    });
    const notes = rows.map((row) => {
      const rowConnections = connections.get(row.id);
      return {
        ...toLiteratureNote(row),
        connections: rowConnections ? toConnections(rowConnections) : EMPTY_CONNECTIONS,
      };
    });
    // The Source carries the Topics; its Literature notes inherit them rather than holding
    // their own, so there is no per-note list in this payload (CONTEXT.md, Topic).
    res.status(200).json({
      source: { ...source, topics: (topics.get(sourceId) ?? []).map(toTopic) },
      notes,
      sections,
    });
  } catch (err) {
    next(err);
  }
};

// A Source is correctable after the fact, every field of it: a title mistyped while filing
// should not have to be lived with, and `kind` is a label that changes no other field, so
// changing it strands nothing (#83, CONTEXT.md, Source). As on create, there is no status.
export const updateSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateSourceInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const topicValidation = validateTopicNames((req.body as UpdateSourceRequest).topicNames);
  if (!topicValidation.valid) {
    res.status(400).json({ error: topicValidation.error } satisfies ApiErrorResponse);
    return;
  }
  const { title, kind, author, url, topicNames } = req.body as UpdateSourceRequest;
  const userId = getUserId(req);
  try {
    const source = await updateSourceRecord({
      id: sourceId,
      userId,
      // Validation has established both of these; the cast is the handover from
      // `unknown`-typed body parsing to the validated shape, as on create above.
      ...sanitizeSourceInput({ title: title as string, kind: kind as SourceKind, author, url }),
    });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    // The Topic list is the whole set the Source should end up with, as every other field here
    // is written whole (#83): a Topic left out of it is taken off, and the Topic itself stays in
    // the vocabulary with one fewer carrier.
    const topics = await setSourceTopics({
      userId,
      sourceId: source.id,
      names: sanitizeTopicNames(topicNames),
    });
    res.status(200).json({ source: { ...source, topics: topics.map(toTopic) } });
  } catch (err) {
    next(err);
  }
};

// Read, guard, delete - the same three steps as deleting a note, in the same order. Deleting a
// Source takes its Literature notes with it (#70); the cascade lives in the foreign key, and
// the orphan guard of ADR 0014 belongs in front of it once Permanent notes exist (#86), where
// it is the same check applied across the batch of notes this Source cascades to.
export const deleteSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const source = await findSourceById({ id: sourceId, userId });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteSourceRecord({ id: source.id, userId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
