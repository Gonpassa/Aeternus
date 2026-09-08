export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const validateDreamInput = (input: {
  date?: unknown;
  narrative?: unknown;
}): ValidationResult => {
  if (!isValidDate(input.date)) {
    return { valid: false, error: 'A valid date is required.' };
  }
  if (!isNonEmptyString(input.narrative)) {
    return { valid: false, error: 'Narrative is required.' };
  }
  return { valid: true };
};

export const validateEmotionalBeatInput = (input: { label?: unknown }): ValidationResult => {
  if (!isNonEmptyString(input.label)) {
    return { valid: false, error: 'A label is required.' };
  }
  return { valid: true };
};
