import { validateDreamInput } from './validation';

const validInput = {
  date: '2026-08-01',
  narrative: '<p>I was flying over a city made of glass.</p>',
};

describe('validateDreamInput', () => {
  it('accepts valid input', () => {
    expect(validateDreamInput(validInput)).toEqual({ valid: true });
  });

  it('rejects a missing or malformed date', () => {
    expect(validateDreamInput({ ...validInput, date: 'not-a-date' })).toEqual({
      valid: false,
      error: 'A valid date is required.',
    });
  });

  it('rejects missing narrative', () => {
    expect(validateDreamInput({ ...validInput, narrative: '' })).toEqual({
      valid: false,
      error: 'Narrative is required.',
    });
  });

  it('rejects a whitespace-only narrative', () => {
    expect(validateDreamInput({ ...validInput, narrative: '   ' })).toEqual({
      valid: false,
      error: 'Narrative is required.',
    });
  });
});
