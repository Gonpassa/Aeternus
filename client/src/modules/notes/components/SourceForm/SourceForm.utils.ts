import { z } from 'zod';
import { SOURCE_KINDS, type CreateSourceRequest, type SourceKind } from '@nee3/shared-types';

// The backend's modules/notes/validation.ts is the authority on these ceilings - it is what a
// request is actually held to - and they are mirrored here so an over-long title is answered
// as the field is left rather than after a round trip. Both sides say the same number in the
// same voice; the numbers themselves are argued for where they are enforced.
export const SOURCE_TITLE_MAX = 140;
export const SOURCE_AUTHOR_MAX = 140;
export const SOURCE_URL_MAX = 2000;

const isSourceKind = (value: string): value is SourceKind =>
  (SOURCE_KINDS as readonly string[]).includes(value);

// Every field is trimmed before it is measured, as the server measures it: trailing space
// the user never sees is not what should push a title over its ceiling.
export const sourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A Source needs a title.')
    .max(SOURCE_TITLE_MAX, `A Source title is at most ${SOURCE_TITLE_MAX} characters.`),
  // The select starts empty, so the field's value is a plain string until a kind is chosen;
  // the guard both rejects that empty state and narrows the submitted value to a SourceKind.
  kind: z
    .string()
    .refine(isSourceKind, { message: 'A Source is a book, an article, a video, or something else.' }),
  author: z
    .string()
    .trim()
    .max(SOURCE_AUTHOR_MAX, `An author is at most ${SOURCE_AUTHOR_MAX} characters.`),
  // Held to http(s) rather than merely to a length: a Source's link is rendered as a link, so
  // a `javascript:` scheme would be an injection surface and a bare "example.com" would
  // resolve against this app's own origin. Blank passes - the field is optional.
  url: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), {
      message: 'A Source link must start with http:// or https://.',
    })
    .refine((value) => value.length <= SOURCE_URL_MAX, {
      message: `A Source link is at most ${SOURCE_URL_MAX.toLocaleString('en-US')} characters.`,
    }),
});

export type SourceFormValues = z.input<typeof sourceSchema>;
export type SourceFormOutput = z.output<typeof sourceSchema>;

// An untouched optional input submits as the empty string, which is not a different state
// from "not given" for an author or a link - both reach the API as null, as they are stored.
export const toCreateRequest = (values: SourceFormOutput): CreateSourceRequest => ({
  title: values.title,
  kind: values.kind,
  author: values.author === '' ? null : values.author,
  url: values.url === '' ? null : values.url,
});
