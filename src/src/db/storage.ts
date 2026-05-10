import { getSupabase, CAPTURES_BUCKET } from './supabase.js';
import { logger } from '../logger.js';

export interface UploadedScreenshot {
  path: string;
  bytes: number;
}

// In-memory cache for signed URLs. Signed URLs are valid for 1 hour;
// we cache for 50 minutes to avoid serving expired URLs.
const SIGNED_URL_TTL_MS = 50 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function getCachedSignedUrl(path: string): string | null {
  const entry = signedUrlCache.get(path);
  if (entry && Date.now() < entry.expiresAt) return entry.url;
  if (entry) signedUrlCache.delete(path);
  return null;
}

function setCachedSignedUrl(path: string, url: string): void {
  signedUrlCache.set(path, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
}

// Evict expired entries periodically to prevent unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of signedUrlCache) {
    if (now >= v.expiresAt) signedUrlCache.delete(k);
  }
}, 10 * 60 * 1000).unref();

export async function uploadScreenshot(
  postId: string,
  captureId: string,
  buf: Buffer,
): Promise<UploadedScreenshot> {
  const sb = getSupabase();
  const path = postId + '/' + captureId + '.png';
  const res = await sb.storage.from(CAPTURES_BUCKET).upload(path, buf, {
    contentType: 'image/png',
    upsert: false,
  });
  if (res.error) {
    throw new Error('screenshot upload failed: ' + res.error.message);
  }
  return { path, bytes: buf.length };
}

export function publicUrl(path: string): string {
  const sb = getSupabase();
  return sb.storage.from(CAPTURES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Bucket is private — public URLs 401. Use signed URLs with a TTL so the
 * dashboard can render screenshots without exposing the service-role key.
 * Default 1 hour; cached server-side for 50 minutes to cut Supabase egress.
 */
export async function signedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const cached = getCachedSignedUrl(path);
  if (cached) return cached;
  const sb = getSupabase();
  const res = await sb.storage.from(CAPTURES_BUCKET).createSignedUrl(path, expiresInSec);
  if (res.error || !res.data) {
    throw new Error('signed url failed: ' + (res.error?.message ?? 'unknown'));
  }
  setCachedSignedUrl(path, res.data.signedUrl);
  return res.data.signedUrl;
}

export async function signedUrls(
  paths: string[],
  expiresInSec = 3600,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;

  // Return cached URLs and only ask Supabase for the rest.
  const uncached: string[] = [];
  for (const p of paths) {
    const cached = getCachedSignedUrl(p);
    if (cached) {
      out.set(p, cached);
    } else {
      uncached.push(p);
    }
  }
  if (uncached.length === 0) return out;

  const sb = getSupabase();
  const res = await sb.storage.from(CAPTURES_BUCKET).createSignedUrls(uncached, expiresInSec);
  if (res.error || !res.data) {
    logger.warn({ error: res.error }, 'batch signed url failed');
    return out;
  }
  for (const item of res.data) {
    if (item.path && item.signedUrl) {
      setCachedSignedUrl(item.path, item.signedUrl);
      out.set(item.path, item.signedUrl);
    }
  }
  return out;
}

export async function downloadScreenshot(path: string): Promise<Buffer> {
  const sb = getSupabase();
  const res = await sb.storage.from(CAPTURES_BUCKET).download(path);
  if (res.error || !res.data) {
    throw new Error('screenshot download failed: ' + (res.error?.message ?? 'unknown'));
  }
  const ab = await res.data.arrayBuffer();
  return Buffer.from(ab);
}
