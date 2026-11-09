import { z } from 'zod';
import {
  SOURCE_KINDS,
  type CreateSourceRequest,
  type SourceKind,
  type SourceWithTopics,
} from '@nee3/shared-types';
import { TOPIC_COUNT_MAX, TOPIC_NAME_MAX } from '../../utils/topicLimits.ts';

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
  kind: z.string().refine(isSourceKind, {
    message: 'A Source is a book, an article, a video, or something else.',
  }),
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
  // Optional and never required, as on every carrier: an empty list is a Source nobody has
  // filed under a word yet (#87). The ceilings are the server's, mirrored here as the text
  // ceilings above are, so an over-long name is answered where it was typed.
  topicNames: z
    .array(z.string().trim().min(1).max(TOPIC_NAME_MAX))
    .max(TOPIC_COUNT_MAX, `A Source carries at most ${TOPIC_COUNT_MAX} Topics.`),
});

export type SourceFormValues = z.input<typeof sourceSchema>;
export type SourceFormOutput = z.output<typeof sourceSchema>;

// A Source read back onto the form that files one, for correcting it after the fact (#83). A
// null author or link is an untouched input, which is the same empty string a blank form
// starts from. The Topics come back as names, which is what the form submits: the name is how a
// Topic is identified on the way in, whether it already exists or is being created by typing.
export const toSourceFormValues = (source: SourceWithTopics): SourceFormValues => ({
  title: source.title,
  kind: source.kind,
  author: source.author ?? '',
  url: source.url ?? '',
  topicNames: source.topics.map((topic) => topic.name),
});

// An untouched optional input submits as the empty string, which is not a different state
// from "not given" for an author or a link - both reach the API as null, as they are stored.
export const toCreateRequest = (values: SourceFormOutput): CreateSourceRequest => ({
  title: values.title,
  kind: values.kind,
  author: values.author === '' ? null : values.author,
  url: values.url === '' ? null : values.url,
  // The whole set the Source should end up carrying, as every other field here is sent whole:
  // a Topic left out of it is taken off (#83, #87).
  topicNames: values.topicNames,
});
