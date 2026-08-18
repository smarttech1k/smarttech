// Splits free text - a profile bio - into plain runs and the links inside it, so a
// URL somebody typed can be rendered as a real anchor instead of dead characters.
//
// The direction of trust matters here: text only becomes a link when it matches one
// of the three http(s) shapes below and then survives `toSafeHref`. Nothing else a
// member types can reach an href, so a bio holding `javascript:alert(1)` renders as
// the literal string it is.

export type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; label: string; href: string };

// A bare `korusa.com` is how most people write their link, but treating every dotted
// word as a domain would turn `Node.js`, `etc.` and `v1.2` into links. Limiting the
// no-scheme case to these suffixes keeps the common ones working without that noise.
// Word-like suffixes (.design, .live, .news) are deliberately absent: a missing space
// after a full stop - "web development.Design is..." - would otherwise become a link.
const BARE_DOMAIN_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'me', 'xyz', 'info', 'biz',
  'edu', 'gov', 'tv', 'fm', 'gg', 'sh', 'so', 'ly', 'ng', 'gh', 'ke', 'uk', 'us',
  'ca', 'au', 'de', 'fr', 'nl', 'eu', 'za', 'br', 'jp',
].join('|');

// Brackets and quotes are excluded from a URL's tail so wrapping punctuation is not
// swallowed. Round brackets are the exception - they appear inside real addresses
// (wikipedia.org/wiki/Foo_(bar)) - and are balanced out by `trimTrailingNoise`.
const URL_TAIL = "[^\\s<>\\[\\]{}\"']";

const URL_CANDIDATE = new RegExp(
  [
    `https?://${URL_TAIL}+`,
    `www\\.${URL_TAIL}+`,
    `[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${BARE_DOMAIN_TLDS})\\b(?:[/?#]${URL_TAIL}*)?`,
  ].join('|'),
  'gi',
);

// A URL at the end of a sentence collects the sentence's punctuation. None of these
// characters can end a real address, so they belong to the prose around it.
const TRAILING_NOISE = new Set(['.', ',', ';', ':', '!', '?', '…', '*', '_', '~', '’', '”']);

const occurrences = (value: string, char: string) => value.split(char).length - 1;

const trimTrailingNoise = (candidate: string) => {
  let value = candidate;
  while (value.length > 1) {
    const last = value[value.length - 1];
    if (last === ')') {
      // Unbalanced, so the bracket closes the prose rather than the URL.
      if (occurrences(value, '(') >= occurrences(value, ')')) break;
      value = value.slice(0, -1);
      continue;
    }
    if (!TRAILING_NOISE.has(last)) break;
    value = value.slice(0, -1);
  }
  return value;
};

/**
 * The one gate that turns a matched string into an href. Returns null for anything
 * that is not a plain http(s) address, including the deceptive
 * `https://korusa.com@evil.example` shape, whose real host is the part nobody reads.
 */
export const toSafeHref = (candidate: string): string | null => {
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  // A host with no dot is not something a bio can meaningfully point at, and it is
  // what `javascript:alert(1)` degrades to once the https:// prefix is applied.
  if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;

  return url.toString();
};

/** What the link reads as on screen: the address as typed, minus the noisy scheme. */
export const linkLabel = (candidate: string) => candidate.replace(/^https?:\/\//i, '');

export const splitTextWithLinks = (value: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let cursor = 0;

  const pushText = (text: string) => {
    if (!text) return;
    const previous = segments[segments.length - 1];
    if (previous?.kind === 'text') previous.text += text;
    else segments.push({ kind: 'text', text });
  };

  for (const match of value.matchAll(URL_CANDIDATE)) {
    const start = match.index ?? 0;
    if (start < cursor) continue;

    // The character before decides whether this is an address or the tail of one:
    // `me@korusa.com` matches `korusa.com` from position 3, and an email is not a
    // link to the domain in it.
    const before = start === 0 ? '' : value[start - 1];
    if (before && /[\w@./]/.test(before)) continue;

    const candidate = trimTrailingNoise(match[0]);
    const href = toSafeHref(candidate);
    // Rejected candidates stay part of the surrounding plain text - cursor does not
    // move, so no character is ever dropped on the way through.
    if (!href) continue;

    pushText(value.slice(cursor, start));
    segments.push({ kind: 'link', label: linkLabel(candidate), href });
    cursor = start + candidate.length;
  }

  pushText(value.slice(cursor));
  return segments;
};

/** Whether the text holds at least one address worth rendering as an anchor. */
export const hasLink = (value: string) =>
  splitTextWithLinks(value).some((segment) => segment.kind === 'link');
