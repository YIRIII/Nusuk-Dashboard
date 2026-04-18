import useSWR from 'swr';
import { swrFetcher, type ListPostsResponse, type Company } from '@/lib/api';

export interface PostsQuery {
  kind?: 'all' | 'tweet' | 'article';
  review?: 'all' | 'reviewed' | 'unreviewed';
  origin?: 'all' | 'individual' | 'company';
  company?: string;
  category?: 'all' | 'inner' | 'outer' | 'general' | 'other' | 'unclassified';
  date_range?: 'all' | '24h' | '7d' | '30d';
  sort?: 'posted_desc' | 'posted_asc' | 'captured_desc';
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQs(q: PostsQuery): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === '' || v === 'all') continue;
    p.set(k, String(v));
  }
  return p.toString();
}

export function usePosts(query: PostsQuery) {
  const key = '/api/posts' + (buildQs(query) ? '?' + buildQs(query) : '');
  return useSWR<ListPostsResponse>(key, swrFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
}

export function useCompanies() {
  return useSWR<{ rows: Company[] }>('/api/companies', swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
