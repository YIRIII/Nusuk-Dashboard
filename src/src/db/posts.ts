import { getSupabase } from './supabase.js';
import type { CompanyCategory } from './types.js';

/**
 * Mirror of the Postgres `normalize_url()` function so we can look up posts
 * by normalized form from the app layer. Must stay in sync with
 * `supabase/migrations/20260415000001_init.sql`.
 */
export function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  let s = raw.toLowerCase().trim();
  s = s.replace(/#.*$/, ''); // strip fragment
  s = s.replace(
    /[?&](utm_[^=]+|gclid|fbclid|mc_[^=]+|ref|ref_src|ref_url|s|t)=[^&]*/g,
    '',
  );
  s = s.replace(/\?&/g, '?');
  s = s.replace(/[?&]+$/g, '');
  s = s.replace(/\/+$/, ''); // trailing slash
  return s;
}
import type {
  PostRow,
  CaptureRow,
  PostKind,
  CaptureStage,
  MediaType,
  CompanyRow,
  PostOrigin,
} from './types.js';

export interface UpsertPostInput {
  url: string;
  kind: PostKind;
  metadata: Record<string, unknown>;
  parent_id?: string | null;
  origin?: PostOrigin;
  company_id?: string | null;
  company_category?: CompanyCategory | null;
  posted_at?: string | null;
}

export interface UpsertResult {
  row: PostRow;
  duplicate: boolean;
}

/**
 * Cheap check: is there already a live (non-deleted) row for this URL?
 * Used by the capture route to short-circuit before running the fallback chain
 * (which is expensive — Chrome launch, screenshot, network I/O).
 */
export async function findLivePostByUrl(url: string): Promise<PostRow | null> {
  const sb = getSupabase();
  const res = await sb
    .from('posts')
    .select('*')
    .eq('normalized_url', normalizeUrl(url))
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle<PostRow>();
  if (res.error) throw new Error('post lookup failed: ' + res.error.message);
  return res.data ?? null;
}

/**
 * Inserts a post. If a row with the same `normalized_url` (partial unique index
 * on non-deleted rows) already exists, returns that row with `duplicate: true`.
 */
export async function upsertPost(input: UpsertPostInput): Promise<UpsertResult> {
  const sb = getSupabase();
  const insert = await sb
    .from('posts')
    .insert({
      url: input.url,
      kind: input.kind,
      metadata: input.metadata,
      parent_id: input.parent_id ?? null,
      origin: input.origin ?? 'individual',
      company_id: input.company_id ?? null,
      company_category: input.company_category ?? null,
      posted_at: input.posted_at ?? null,
    })
    .select()
    .single<PostRow>();

  if (!insert.error && insert.data) {
    return { row: insert.data, duplicate: false };
  }

  // Unique violation on normalized_url → fetch existing, live (non-deleted) row.
  // Look up by normalized_url because two input URLs can normalize to the same
  // value (e.g., `?s=46` vs `?s=48` both strip to the same canonical form).
  if (insert.error?.code === '23505') {
    const existing = await sb
      .from('posts')
      .select('*')
      .eq('normalized_url', normalizeUrl(input.url))
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle<PostRow>();
    if (existing.error || !existing.data) {
      throw new Error(
        'unique violation but no existing row found: ' +
          (existing.error?.message ?? 'no match'),
      );
    }
    return { row: existing.data, duplicate: true };
  }

  throw new Error('post insert failed: ' + (insert.error?.message ?? 'unknown'));
}

export interface InsertCaptureInput {
  id?: string;
  post_id: string;
  media: MediaType;
  stage: CaptureStage;
  storage_path: string;
  bytes: number;
  duration_ms: number;
  success: boolean;
  error?: string | null;
  width?: number | null;
  height?: number | null;
}

export async function insertCapture(input: InsertCaptureInput): Promise<CaptureRow> {
  const sb = getSupabase();
  const res = await sb
    .from('captures')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      post_id: input.post_id,
      media: input.media,
      stage: input.stage,
      storage_path: input.storage_path,
      bytes: input.bytes,
      duration_ms: input.duration_ms,
      success: input.success,
      error: input.error ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .select()
    .single<CaptureRow>();
  if (res.error || !res.data) {
    throw new Error('capture insert failed: ' + (res.error?.message ?? 'unknown'));
  }
  return res.data;
}

export async function softDeletePost(id: string): Promise<void> {
  const sb = getSupabase();
  const res = await sb
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (res.error) throw new Error('soft delete failed: ' + res.error.message);
}

/**
 * Propagate a manually-set company_category to every OTHER live post with the
 * same author_handle that is currently unclassified. Implements the
 * "learn-by-handle" behaviour the analyst asked for.
 */
export async function propagateCategoryByHandle(
  handle: string,
  category: CompanyCategory,
  excludePostId?: string,
): Promise<number> {
  const sb = getSupabase();
  let q = sb
    .from('posts')
    .update({ company_category: category })
    .filter('metadata->>author_handle', 'ilike', handle)
    .is('company_category', null)
    .is('deleted_at', null);
  if (excludePostId) q = q.neq('id', excludePostId);
  const res = await q.select('id');
  if (res.error) throw new Error('propagate failed: ' + res.error.message);
  return res.data?.length ?? 0;
}

export async function restorePost(id: string): Promise<PostRow> {
  const sb = getSupabase();
  const res = await sb
    .from('posts')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single<PostRow>();
  if (res.error || !res.data) {
    throw new Error('restore failed: ' + (res.error?.message ?? 'not found'));
  }
  return res.data;
}

export interface PostPatchFields {
  reviewed?: boolean;
  origin?: PostOrigin;
  company_id?: string | null;
  company_category?: CompanyCategory | null;
  title_override?: string | null;
  notes?: string | null;
  posted_at?: string;
}

export async function patchPost(id: string, patch: PostPatchFields): Promise<PostRow> {
  const sb = getSupabase();
  const update: Record<string, unknown> = { ...patch };
  if (patch.reviewed !== undefined) {
    update['reviewed_at'] = patch.reviewed ? new Date().toISOString() : null;
  }
  const res = await sb.from('posts').update(update).eq('id', id).select().single<PostRow>();
  if (res.error || !res.data) {
    throw new Error('post patch failed: ' + (res.error?.message ?? 'not found'));
  }
  return res.data;
}

export async function getPostById(id: string): Promise<PostRow | null> {
  const sb = getSupabase();
  const res = await sb.from('posts').select('*').eq('id', id).maybeSingle<PostRow>();
  if (res.error) throw new Error('post fetch failed: ' + res.error.message);
  return res.data ?? null;
}

export async function latestCaptureForPost(postId: string): Promise<CaptureRow | null> {
  const sb = getSupabase();
  const res = await sb
    .from('captures')
    .select('*')
    .eq('post_id', postId)
    .eq('success', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<CaptureRow>();
  if (res.error) throw new Error('capture fetch failed: ' + res.error.message);
  return res.data ?? null;
}

export interface ListPostsOptions {
  kind: 'all' | 'tweet' | 'article';
  review: 'all' | 'reviewed' | 'unreviewed';
  origin: 'all' | PostOrigin;
  company_id?: string;
  category?: 'all' | CompanyCategory | 'unclassified';
  date_range: 'all' | '24h' | '7d' | '30d';
  sort: 'posted_desc' | 'posted_asc' | 'captured_desc';
  q?: string;
  limit: number;
  offset: number;
  /** When true, return only soft-deleted rows (Recently Deleted view). */
  onlyDeleted?: boolean;
}

export async function listPosts(opts: ListPostsOptions): Promise<{ rows: PostRow[]; total: number }> {
  const sb = getSupabase();
  let query = sb.from('posts').select('*', { count: 'exact' });
  query = opts.onlyDeleted
    ? query.not('deleted_at', 'is', null)
    : query.is('deleted_at', null);

  if (opts.kind !== 'all') query = query.eq('kind', opts.kind);
  if (opts.review === 'reviewed') query = query.eq('reviewed', true);
  if (opts.review === 'unreviewed') query = query.eq('reviewed', false);
  if (opts.origin !== 'all') query = query.eq('origin', opts.origin);
  if (opts.company_id) query = query.eq('company_id', opts.company_id);
  if (opts.category && opts.category !== 'all') {
    if (opts.category === 'unclassified') {
      query = query.is('company_category', null).eq('origin', 'company');
    } else {
      query = query.eq('company_category', opts.category);
    }
  }

  if (opts.date_range !== 'all') {
    const cutoff = new Date(
      Date.now() -
        (opts.date_range === '24h' ? 1 : opts.date_range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte('posted_at', cutoff);
  }

  if (opts.q) {
    // ilike against url + metadata->>text gives a simple full-text feel.
    // For real search switch to tsvector in a later migration.
    query = query.or(
      'url.ilike.%' + opts.q + '%,title_override.ilike.%' + opts.q + '%,metadata->>text.ilike.%' + opts.q + '%,metadata->>author_handle.ilike.%' + opts.q + '%',
    );
  }

  if (opts.sort === 'posted_desc')
    query = query.order('posted_at', { ascending: false, nullsFirst: false });
  else if (opts.sort === 'posted_asc')
    query = query.order('posted_at', { ascending: true, nullsFirst: false });
  else query = query.order('captured_at', { ascending: false });

  query = query.range(opts.offset, opts.offset + opts.limit - 1);

  const res = await query;
  if (res.error) throw new Error('list posts failed: ' + res.error.message);
  return { rows: (res.data ?? []) as PostRow[], total: res.count ?? 0 };
}

export async function listCompanies(): Promise<CompanyRow[]> {
  const sb = getSupabase();
  const res = await sb.from('companies').select('*').order('name_en');
  if (res.error) throw new Error('list companies failed: ' + res.error.message);
  return (res.data ?? []) as CompanyRow[];
}
