import { validateRegisterInput, validateLoginInput } from './validation';

describe('validateRegisterInput', () => {
  it('accepts valid input', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: true });
  });

  it('rejects a missing username', () => {
    expect(
      validateRegisterInput({ username: '', email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Username is required.' });
  });

  it('rejects a missing email', () => {
    expect(validateRegisterInput({ username: 'alice', email: '', password: 'abcd' })).toEqual({
      valid: false,
      error: 'Email is required.',
    });
  });

  it('rejects an invalid email', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'not-an-email', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Please enter a valid email address.' });
  });

  it('rejects a password shorter than 4 characters', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'alice@example.com', password: 'abc' }),
    ).toEqual({ valid: false, error: 'Password must be at least 4 characters long.' });
  });

  it('rejects non-string fields', () => {
    expect(
      validateRegisterInput({ username: 123, email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Username is required.' });
  });
});

describe('validateLoginInput', () => {
  it('accepts valid input', () => {
    expect(validateLoginInput({ username: 'alice', password: 'abcd' })).toEqual({ valid: true });
  });

  it('rejects a missing username', () => {
    expect(validateLoginInput({ username: '', password: 'abcd' })).toEqual({
      valid: false,
      error: 'Username is required.',
    });
  });

  it('rejects a missing password', () => {
    expect(validateLoginInput({ username: 'alice', password: '' })).toEqual({
      valid: false,
      error: 'Password is required.',
    });
  });
});
