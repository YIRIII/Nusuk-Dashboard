import type { SupabaseClient } from '@supabase/supabase-js';

export type CompanyCategory = 'inner' | 'outer' | 'general' | 'other';

// Unambiguous government / media entities — only category auto-assigned
// without needing a prior manually-classified post for the handle.
const GENERAL_KEYWORDS: RegExp[] = [
  /وزارة|إمارة|هيئة|وكالة|إدارة|مجلس|رسمي/,
  /صحيفة|قناة|جريدة|وكالة.*أنباء/,
  /press\s+agency|ministry|authority|council/i,
];

export interface ClassifyInput {
  origin: 'individual' | 'company';
  author_handle?: string | null;
  author_name?: string | null;
  text?: string | null;
}

/**
 * Classifies a company post by learning from prior manual classifications of
 * the same `author_handle`. Returns null for individual posts or when no
 * history exists and no general-keyword match is found.
 */
export async function classifyCompanyByHandle(
  sb: SupabaseClient,
  input: ClassifyInput,
): Promise<CompanyCategory | null> {
  if (input.origin !== 'company') return null;

  const handle = (input.author_handle ?? '').toLowerCase().trim();
  if (handle) {
    const prior = await sb
      .from('posts')
      .select('company_category')
      .filter('metadata->>author_handle', 'ilike', handle)
      .not('company_category', 'is', null)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle<{ company_category: CompanyCategory | null }>();
    if (prior.data?.company_category) return prior.data.company_category;
  }

  const blob = [input.author_name, input.text].filter(Boolean).join(' ');
  if (GENERAL_KEYWORDS.some((re) => re.test(blob))) return 'general';

  return null;
}
