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

export const validateSymbolTagInput = (input: { name?: unknown }): ValidationResult => {
  if (!isNonEmptyString(input.name)) {
    return { valid: false, error: 'A symbol name is required.' };
  }
  return { valid: true };
};

const ASSOCIATION_KINDS = ['personal', 'cultural'] as const;

const isAssociationKind = (value: unknown): value is (typeof ASSOCIATION_KINDS)[number] =>
  typeof value === 'string' && (ASSOCIATION_KINDS as readonly string[]).includes(value);

// `kind` is optional in both create (defaults to personal) and update (keeps the stored
// kind); when present it must be a known kind. `symbolAttachmentId` is only meaningful on
// create - naming the Symbol tag this Association also belongs to is optional, since every
// Association already belongs to an Anchor via the URL param.
export const validateAssociationInput = (input: {
  content?: unknown;
  kind?: unknown;
  symbolAttachmentId?: unknown;
}): ValidationResult => {
  if (!isNonEmptyString(input.content)) {
    return { valid: false, error: 'Association content is required.' };
  }
  if (input.kind !== undefined && !isAssociationKind(input.kind)) {
    return { valid: false, error: 'Association kind must be personal or cultural.' };
  }
  if (
    input.symbolAttachmentId !== undefined &&
    input.symbolAttachmentId !== null &&
    typeof input.symbolAttachmentId !== 'number'
  ) {
    return { valid: false, error: 'symbolAttachmentId must be a number.' };
  }
  return { valid: true };
};

const ANALYSIS_PASS_TYPES = ['analytic', 'synthetic'] as const;

const isAnalysisPassType = (value: unknown): value is (typeof ANALYSIS_PASS_TYPES)[number] =>
  typeof value === 'string' && (ANALYSIS_PASS_TYPES as readonly string[]).includes(value);

export const validateAnalysisPassInput = (input: {
  type?: unknown;
  content?: unknown;
  anchorId?: unknown;
}): ValidationResult => {
  if (!isAnalysisPassType(input.type)) {
    return { valid: false, error: 'Pass type must be analytic or synthetic.' };
  }
  if (!isNonEmptyString(input.content)) {
    return { valid: false, error: 'Pass content is required.' };
  }
  const hasAnchor = input.anchorId !== undefined && input.anchorId !== null;
  if (hasAnchor && typeof input.anchorId !== 'number') {
    return { valid: false, error: 'anchorId must be a number.' };
  }
  if (hasAnchor && input.type === 'synthetic') {
    return {
      valid: false,
      error: 'A synthetic pass always reads the whole dream and cannot be anchored.',
    };
  }
  return { valid: true };
};

export type AsOfResult = { valid: true; asOf: string } | { valid: false; error: string };

const todayUTC = (): string => new Date().toISOString().slice(0, 10);

export const parseAsOf = (query: { asOf?: unknown }): AsOfResult => {
  if (query.asOf === undefined) {
    return { valid: true, asOf: todayUTC() };
  }
  if (!isValidDate(query.asOf)) {
    return { valid: false, error: 'asOf must be a valid date.' };
  }
  return { valid: true, asOf: query.asOf };
};
