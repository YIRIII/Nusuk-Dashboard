// URL classification used by the fallback chain to pick the right strategy.

const TWEET_HOSTS = new Set([
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'x.com',
  'www.x.com',
  'mobile.x.com',
]);

export type UrlKind = 'tweet' | 'article';

export interface TweetRef {
  kind: 'tweet';
  id: string;
  username: string | null;
  canonicalUrl: string;
}

export interface ArticleRef {
  kind: 'article';
  canonicalUrl: string;
}

export type ClassifiedUrl = TweetRef | ArticleRef;

const TWEET_PATH_RE = /\/([^/]+)\/status(?:es)?\/(\d+)/;

export function classifyUrl(raw: string): ClassifiedUrl {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { kind: 'article', canonicalUrl: raw };
  }
  const host = u.hostname.toLowerCase();
  if (TWEET_HOSTS.has(host)) {
    const m = u.pathname.match(TWEET_PATH_RE);
    if (m) {
      return {
        kind: 'tweet',
        id: m[2]!,
        username: m[1] ?? null,
        canonicalUrl: 'https://twitter.com/' + m[1] + '/status/' + m[2],
      };
    }
  }
  return { kind: 'article', canonicalUrl: u.toString() };
}
