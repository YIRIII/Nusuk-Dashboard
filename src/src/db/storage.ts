import { getSupabase, CAPTURES_BUCKET } from './supabase.js';

export interface UploadedScreenshot {
  path: string;
  bytes: number;
}

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
 * Default 1 hour; refresh on demand from the dashboard.
 */
export async function signedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const sb = getSupabase();
  const res = await sb.storage.from(CAPTURES_BUCKET).createSignedUrl(path, expiresInSec);
  if (res.error || !res.data) {
    throw new Error('signed url failed: ' + (res.error?.message ?? 'unknown'));
  }
  return res.data.signedUrl;
}

export async function signedUrls(
  paths: string[],
  expiresInSec = 3600,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const sb = getSupabase();
  const res = await sb.storage.from(CAPTURES_BUCKET).createSignedUrls(paths, expiresInSec);
  if (res.error || !res.data) return out;
  for (const item of res.data) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
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
