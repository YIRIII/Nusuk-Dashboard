// Lightweight API client. SWR handles caching/revalidation; these helpers
// wrap fetch so every call is uniform and trace-ID aware.

const API_BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super('api error ' + status);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const swrFetcher = <T>(path: string): Promise<T> => request<T>(path);

// ----- Types (match backend responses) -----

export type PostKind = 'tweet' | 'article' | 'unknown';
export type MediaType = 'image' | 'video' | 'gif' | 'none';
export type Origin = 'individual' | 'company';
export type CompanyCategory = 'inner' | 'outer' | 'general' | 'other';

export interface Company {
  id: string;
  name_ar: string;
  name_en: string;
  handle: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface CaptureRef {
  id: string;
  stage: string;
  storage_path: string;
  media: MediaType;
  created_at: string;
}

export interface Post {
  id: string;
  url: string;
  kind: PostKind;
  metadata: {
    author_name?: string | null;
    author_handle?: string | null;
    text?: string | null;
    posted_at?: string | null;
    final_url?: string | null;
  };
  captured_at: string;
  posted_at: string | null;
  origin: Origin;
  company_id: string | null;
  company_category: CompanyCategory | null;
  reviewed: boolean;
  reviewed_at: string | null;
  title_override: string | null;
  notes: string | null;
  latest_capture: CaptureRef | null;
  screenshot_url: string | null;
}

export interface ListPostsResponse {
  trace_id: string;
  total: number;
  rows: Post[];
}

export interface CaptureSingleResponse {
  trace_id: string;
  url: string;
  status: 'captured' | 'duplicate' | 'failed';
  post_id?: string;
  capture_id?: string;
  stage?: string;
  screenshot_url?: string;
  duration_ms: number;
  error?: string;
  prior_captured_at?: string;
}

export interface CaptureBatchResponse {
  trace_id: string;
  total_urls: number;
  duration_ms: number;
  summary: { captured: number; duplicate: number; failed: number };
  results: CaptureSingleResponse[];
}

// ----- Operations -----

export const api = {
  listPosts: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<ListPostsResponse>('/api/posts?' + qs.toString());
  },
  getPost: (id: string) => request<{ post: Post }>('/api/posts/' + id),
  patchPost: (id: string, patch: Partial<Post> & Record<string, unknown>) =>
    request<{ post: Post }>('/api/posts/' + id, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deletePost: (id: string) =>
    request<{ ok: true }>('/api/posts/' + id, { method: 'DELETE' }),
  restorePost: (id: string) =>
    request<{ post: Post }>('/api/posts/' + id + '/restore', { method: 'PATCH' }),
  listCompanies: () => request<{ rows: Company[] }>('/api/companies'),
  capture: (body: {
    url: string;
    origin: Origin;
    company_id?: string | null;
    force_recapture?: boolean;
  }) =>
    request<CaptureSingleResponse>('/api/capture', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  batchCapture: (body: {
    urls: string[];
    origin: Origin;
    company_id?: string | null;
    force_recapture_urls?: string[];
  }) =>
    request<CaptureBatchResponse>('/api/capture/batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listActivity: () => request<{ rows: ActivityEntry[] }>('/api/activity'),
};

export type ActivityType = 'captured' | 'recaptured' | 'failed';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  post_id: string;
  target: string;
  stage: string;
  at: string;
  error: string | null;
}
