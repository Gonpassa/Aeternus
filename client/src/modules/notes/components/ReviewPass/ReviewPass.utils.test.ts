import { describe, expect, it } from 'vitest';
import type { LiteratureNote, ReviewBand, ReviewQueueNote } from '@nee3/shared-types';
import { EMPTY_TALLY, addToTally, harvestLine, reviewStage } from './ReviewPass.utils.ts';

const queued = (id: number, band: ReviewBand): ReviewQueueNote => ({
  note: {
    id,
    userId: 1,
    kind: 'literature',
    sourceId: 7,
    body: 'Reading is not understanding.',
    section: 'Ch. 3',
    position: null,
    excerpt: null,
    openQuestion: false,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  } satisfies LiteratureNote,
  sourceTitle: 'How to Take Smart Notes',
  inheritedTopics: [],
  band,
});

describe('reviewStage', () => {
  const twoDueOneAnswered = [
    queued(1, 'never-answered'),
    queued(2, 'never-answered'),
    queued(3, 'answered'),
  ];

  it('hands over the note at the index while the pass is under way', () => {
    expect(
      reviewStage({ notes: twoDueOneAnswered, dueCount: 2, index: 1, continued: false }),
    ).toEqual({ kind: 'note', queued: twoDueOneAnswered[1] });
  });

  it('ends the pass at the end of the never-answered band rather than at the end of the queue', () => {
    expect(
      reviewStage({ notes: twoDueOneAnswered, dueCount: 2, index: 2, continued: false }),
    ).toEqual({ kind: 'pass-end', moreAvailable: true });
  });

  it('carries on into the answered notes once the user has asked to', () => {
    expect(
      reviewStage({ notes: twoDueOneAnswered, dueCount: 2, index: 2, continued: true }),
    ).toEqual({ kind: 'note', queued: twoDueOneAnswered[2] });
  });

  it('says there is nothing behind the pass when every note is due', () => {
    const allDue = [queued(1, 'never-answered')];

    expect(reviewStage({ notes: allDue, dueCount: 1, index: 1, continued: false })).toEqual({
      kind: 'pass-end',
      moreAvailable: false,
    });
  });

  it('ends the pass immediately when nothing is due', () => {
    expect(
      reviewStage({ notes: [queued(3, 'answered')], dueCount: 0, index: 0, continued: false }),
    ).toEqual({ kind: 'pass-end', moreAvailable: true });
  });

  it('runs out once every note in the queue has been handed over', () => {
    expect(
      reviewStage({ notes: twoDueOneAnswered, dueCount: 2, index: 3, continued: true }),
    ).toEqual({ kind: 'everything-seen' });
  });

  it('has nothing to hand over when nothing has been written', () => {
    expect(reviewStage({ notes: [], dueCount: 0, index: 0, continued: false })).toEqual({
      kind: 'nothing-written',
    });
  });
});

describe('harvestLine', () => {
  it('says nothing at all about a sitting that produced nothing', () => {
    expect(harvestLine(EMPTY_TALLY)).toBeNull();
  });

  it("counts the notes nothing of the user's own was in", () => {
    const tally = addToTally(addToTally(EMPTY_TALLY, 'nothing_here'), 'nothing_here');

    expect(harvestLine(tally)).toBe('2 notes with nothing of yours in them yet.');
  });

  it('leaves out what the sitting did not produce', () => {
    expect(harvestLine(addToTally(EMPTY_TALLY, 'link_made'))).toBe('1 connection made.');
  });

  it('reads the three parts in the order the Answers are stated in', () => {
    const tally = addToTally(
      addToTally(addToTally(EMPTY_TALLY, 'permanent_note_written'), 'link_made'),
      'nothing_here',
    );

    expect(harvestLine(tally)).toBe(
      '1 note with nothing of yours in them yet · 1 connection made · 1 Permanent note written.',
    );
  });
});
