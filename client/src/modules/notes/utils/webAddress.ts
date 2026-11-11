// A Source's web address, as typed and as stored. Mirrors the backend's
// modules/notes/webAddress.ts, which is the authority - it is what a request is actually held
// to - so the field is answered as it is left rather than after a round trip.

const HAS_HTTP_SCHEME = /^https?:\/\//i;
// Any scheme written out in full, `ftp://` as much as `https://`. The two slashes are what tell
// a scheme from a port: "example.com:8080" has a colon and is still a bare address.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

// `https://` is added to an address typed without a scheme, rather than the address being
// refused for want of one (#104). Nothing else is rewritten - no case folding, no
// trailing-slash normalizing - so it still resolves to exactly what the user pasted. An
// address that names another scheme is left as it is, so it is refused rather than dressed up.
export const normalizeWebAddress = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '' || HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// Held to http(s) and to the shape of a real address rather than merely to a length: it is
// rendered as a link, so a `javascript:` or `data:` scheme would be an injection surface.
// Those arrive here already prefixed by normalizeWebAddress, and fail on what is left of them:
// "https://javascript:alert(1)" has no port a URL can carry. Credentials are refused because
// "https://mailto:someone@example.com" is otherwise a valid address, and a host with no dot is
// refused because it is a word typed into the wrong field far more often than a machine name.
export const isWebAddress = (value: string): boolean => {
  if (!HAS_HTTP_SCHEME.test(value) || /\s/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username !== '' || url.password !== '') return false;
  return url.hostname === 'localhost' || url.hostname.includes('.');
};
