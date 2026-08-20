import { resolveMood } from './migrateMongoJournal';

describe('resolveMood', () => {
  it('maps a known mood to its primary mood and specific emotion', () => {
    expect(resolveMood('sad')).toEqual({ primaryMood: 'sad', specificEmotion: null });
    expect(resolveMood('happy')).toEqual({ primaryMood: 'happy', specificEmotion: null });
  });

  it('maps the old Mongo "neutral" mood to steady', () => {
    expect(resolveMood('neutral')).toEqual({ primaryMood: 'steady', specificEmotion: null });
  });

  it('falls back to steady for an unrecognized mood, keeping it as the specific emotion', () => {
    expect(resolveMood('grumpy')).toEqual({ primaryMood: 'steady', specificEmotion: 'grumpy' });
  });

  it('falls back to steady for a missing mood', () => {
    expect(resolveMood(undefined)).toEqual({ primaryMood: 'steady', specificEmotion: null });
  });
});
