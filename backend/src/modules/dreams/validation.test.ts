import {
  validateAnalysisPassInput,
  validateAssociationInput,
  validateDreamInput,
  validateSymbolTagInput,
} from './validation';

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

describe('validateSymbolTagInput', () => {
  it('accepts a non-empty name', () => {
    expect(validateSymbolTagInput({ name: 'Water' })).toEqual({ valid: true });
  });

  it('rejects a missing or whitespace-only name', () => {
    expect(validateSymbolTagInput({})).toEqual({
      valid: false,
      error: 'A symbol name is required.',
    });
    expect(validateSymbolTagInput({ name: '   ' })).toEqual({
      valid: false,
      error: 'A symbol name is required.',
    });
  });
});

describe('validateAssociationInput', () => {
  it('accepts content with no kind, and each known kind', () => {
    expect(validateAssociationInput({ content: 'The lake' })).toEqual({ valid: true });
    expect(validateAssociationInput({ content: 'The lake', kind: 'personal' })).toEqual({
      valid: true,
    });
    expect(validateAssociationInput({ content: 'Baptism', kind: 'cultural' })).toEqual({
      valid: true,
    });
  });

  it('rejects blank content', () => {
    expect(validateAssociationInput({ content: '  ' })).toEqual({
      valid: false,
      error: 'Association content is required.',
    });
  });

  it('rejects an unknown kind', () => {
    expect(validateAssociationInput({ content: 'fine', kind: 'archetypal' })).toEqual({
      valid: false,
      error: 'Association kind must be personal or cultural.',
    });
  });

  it('accepts an optional symbolAttachmentId, with or without one', () => {
    expect(validateAssociationInput({ content: 'depth', symbolAttachmentId: 4 })).toEqual({
      valid: true,
    });
    expect(validateAssociationInput({ content: 'depth', symbolAttachmentId: null })).toEqual({
      valid: true,
    });
    expect(validateAssociationInput({ content: 'depth' })).toEqual({ valid: true });
  });

  it('rejects a non-numeric symbolAttachmentId', () => {
    expect(validateAssociationInput({ content: 'depth', symbolAttachmentId: '4' })).toEqual({
      valid: false,
      error: 'symbolAttachmentId must be a number.',
    });
  });
});

describe('validateAnalysisPassInput', () => {
  it('accepts an analytic pass with or without an anchor', () => {
    expect(validateAnalysisPassInput({ type: 'analytic', content: 'Why it appeared.' })).toEqual({
      valid: true,
    });
    expect(
      validateAnalysisPassInput({ type: 'analytic', content: 'Why it appeared.', anchorId: 3 }),
    ).toEqual({ valid: true });
  });

  it('accepts a synthetic pass only without an anchor', () => {
    expect(validateAnalysisPassInput({ type: 'synthetic', content: 'Where it points.' })).toEqual({
      valid: true,
    });
    expect(
      validateAnalysisPassInput({ type: 'synthetic', content: 'Where it points.', anchorId: 3 }),
    ).toEqual({
      valid: false,
      error: 'A synthetic pass always reads the whole dream and cannot be anchored.',
    });
  });

  it('rejects unknown types, blank content, and non-numeric anchor ids', () => {
    expect(validateAnalysisPassInput({ type: 'reductive', content: 'fine' })).toEqual({
      valid: false,
      error: 'Pass type must be analytic or synthetic.',
    });
    expect(validateAnalysisPassInput({ type: 'analytic', content: '  ' })).toEqual({
      valid: false,
      error: 'Pass content is required.',
    });
    expect(
      validateAnalysisPassInput({ type: 'analytic', content: 'fine', anchorId: 'three' }),
    ).toEqual({
      valid: false,
      error: 'anchorId must be a number.',
    });
  });
});
