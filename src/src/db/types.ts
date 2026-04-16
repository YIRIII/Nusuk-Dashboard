// Placeholder for `supabase gen types typescript` output.
// Regenerate with: npm run gen:supabase-types
// Until a Supabase project is linked (step 0.10), we re-export Zod-derived types.

export type PostKind = 'tweet' | 'article' | 'unknown';
export type MediaType = 'image' | 'video' | 'gif' | 'none';
export type CaptureStage = 'fxtwitter' | 'oembed' | 'puppeteer_embed' | 'puppeteer_direct';
export type PostOrigin = 'individual' | 'company';

export interface CompanyRow {
  id: string;
  name_ar: string;
  name_en: string;
  handle: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface PostRow {
  id: string;
  url: string;
  normalized_url: string;
  kind: PostKind;
  metadata: Record<string, unknown>;
  parent_id: string | null;
  captured_at: string;
  deleted_at: string | null;
  origin: PostOrigin;
  company_id: string | null;
  reviewed: boolean;
  reviewed_at: string | null;
  title_override: string | null;
  notes: string | null;
  posted_at: string | null;
}

export interface CaptureRow {
  id: string;
  post_id: string;
  media: MediaType;
  stage: CaptureStage;
  storage_path: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  duration_ms: number | null;
  success: boolean;
  error: string | null;
  created_at: string;
}
