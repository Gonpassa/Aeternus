import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { LINK_REMOVAL_FAILED, linkRemovalRefusal } from './linkRefusal.ts';

const refused = (body: unknown) =>
  new AxiosError('Conflict', undefined, undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    data: body,
    headers: {},
    config: { headers: {} as never },
  });

describe('linkRemovalRefusal', () => {
  // The refusal names the Permanent note it is protecting, and that naming is the point of it
  // (ADR 0014), so it reaches the user as the server wrote it.
  it('passes the server’s own words through', () => {
    const message = 'Removing this connection would leave “A claim” with none.';
    expect(linkRemovalRefusal(refused({ error: message }))).toBe(message);
  });

  it('falls back when the failure carries no message', () => {
    expect(linkRemovalRefusal(refused({}))).toBe(LINK_REMOVAL_FAILED);
    expect(linkRemovalRefusal(refused({ error: '' }))).toBe(LINK_REMOVAL_FAILED);
    expect(linkRemovalRefusal(new Error('Network Error'))).toBe(LINK_REMOVAL_FAILED);
  });
});
