import validator from 'validator';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validateRegisterInput = (input: {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}): ValidationResult => {
  if (!isNonEmptyString(input.username)) {
    return { valid: false, error: 'Username is required.' };
  }
  if (!isNonEmptyString(input.email)) {
    return { valid: false, error: 'Email is required.' };
  }
  if (!validator.isEmail(input.email)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (!isNonEmptyString(input.password) || input.password.length < 4) {
    return { valid: false, error: 'Password must be at least 4 characters long.' };
  }
  return { valid: true };
};

export const validateLoginInput = (input: {
  username?: unknown;
  password?: unknown;
}): ValidationResult => {
  if (!isNonEmptyString(input.username)) {
    return { valid: false, error: 'Username is required.' };
  }
  if (!isNonEmptyString(input.password)) {
    return { valid: false, error: 'Password is required.' };
  }
  return { valid: true };
};
