import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { FileSpreadsheet, Search, CheckCircle2, Circle, CheckSquare, Square } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { PostsBulkBar } from '@/components/PostsBulkBar';
import { QuickEditDialog } from '@/components/QuickEditDialog';
import { usePosts, useCompanies, type PostsQuery } from '@/hooks/usePosts';
import type { Post } from '@/lib/api';
import { extractHashtags, countHashtags } from '@/lib/hashtags';
import { getCompanyDisplayName } from '@/lib/companyNames';

type KindFilter = 'all' | 'tweet' | 'article';
type ReviewFilter = 'all' | 'reviewed' | 'unreviewed';
type OriginFilter = 'all' | 'individual' | 'company';
type CategoryFilter = 'all' | 'inner' | 'outer' | 'general' | 'other' | 'unclassified';
type DateFilter = 'all' | '24h' | '7d' | '30d';
type SortMode = 'posted_desc' | 'posted_asc' | 'captured_desc';

// v1-style chip — rounded, border, subtle bg, purple tint when active.
const CHIP = (active: boolean) =>
  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' +
  (active
    ? 'bg-primary/15 text-primary border-primary/40'
    : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground');

export function PostsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { mutate } = useSWRConfig();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [kind, setKind] = useState<KindFilter>('all');
  const [review, setReview] = useState<ReviewFilter>((params.get('review') as ReviewFilter) ?? 'all');
  const [origin, setOrigin] = useState<OriginFilter>('all');
  const [company] = useState<string>(params.get('company') ?? 'all');
  const handleFilter = params.get('handle') ?? '';
  const [category, setCategory] = useState<CategoryFilter>(
    (params.get('category') as CategoryFilter) ?? 'all',
  );
  const [dateRange, setDateRange] = useState<DateFilter>(
    (params.get('date_range') as DateFilter) ?? 'all',
  );
  const [sort, setSort] = useState<SortMode>('posted_desc');
  const [selectedTag, setSelectedTag] = useState<string>(params.get('tag') ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickEditPost, setQuickEditPost] = useState<Post | null>(null);

  const PAGE_SIZE = 40;
  const [pages, setPages] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query: PostsQuery = useMemo(
    () => ({
      kind,
      review,
      origin,
      ...(company !== 'all' ? { company } : {}),
      category,
      date_range: dateRange,
      sort,
      ...(q ? { q } : {}),
      limit: pages * PAGE_SIZE,
    }),
    [kind, review, origin, company, category, dateRange, sort, q, pages],
  );

  // Reset when filters change.
  const filterKey = `${kind}-${review}-${origin}-${company}-${category}-${dateRange}-${sort}-${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPages(1);
  }

  const { data, isLoading, error, mutate: mutatePosts } = usePosts(query);
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.rows ?? [];
  const allPosts = data?.rows ?? [];

  const hasMore = allPosts.length < (data?.total ?? 0);
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) setPages((p) => p + 1);
  }, [hasMore, isLoading]);

  // Infinite scroll — load more when the sentinel enters the viewport.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const topTags = useMemo(
    () => countHashtags(allPosts.map((p) => p.metadata?.text as string | undefined)),
    [allPosts],
  );

  const posts = useMemo(() => {
    let filtered = allPosts;
    if (handleFilter) {
      filtered = filtered.filter((p) => {
        const h = (p.metadata?.author_handle as string | null | undefined) ?? '';
        return h.toLowerCase() === handleFilter.toLowerCase();
      });
    }
    if (selectedTag) {
      filtered = filtered.filter((p) => {
        const tags = extractHashtags(p.metadata?.text as string | undefined);
        return tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      });
    }
    return filtered;
  }, [allPosts, selectedTag, handleFilter]);

  const total = data?.total ?? 0;
  const unreviewedCount = posts.filter((p) => !p.reviewed).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  void companies;
  void i18n;

  const refresh = () => {
    void mutatePosts();
    void mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'));
  };

  const exportIds = selected.size > 0 ? '?ids=' + [...selected].join(',') : '';

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {handleFilter ? getCompanyDisplayName(handleFilter) : t('nav.posts')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} {t('posts.total_count')} ·{' '}
            <button
              onClick={() => {
                setReview('unreviewed');
                updateParam('review', 'unreviewed', 'all');
              }}
              className="font-medium text-amber-600 hover:underline dark:text-amber-400"
            >
              {unreviewedCount} {t('posts.unreviewed_in_view')}
            </button>
          </p>
        </div>
        {isAdmin && (
        <div className="ms-auto flex gap-2">
          <button
            onClick={() => {
              if (selected.size === posts.length) setSelected(new Set());
              else setSelected(new Set(posts.map((p) => p.id)));
            }}
            disabled={posts.length === 0}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {selected.size > 0 && selected.size === posts.length ? (
              <>
                <CheckSquare className="h-4 w-4 me-2" />
                {t('posts.deselect_all')}
              </>
            ) : (
              <>
                <Square className="h-4 w-4 me-2" />
                {t('posts.select_all')}
              </>
            )}
          </button>
          <a
            href={'/api/export/xlsx' + exportIds}
            download
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <FileSpreadsheet className="h-4 w-4 me-2" />
            {t('posts.export_excel')}
          </a>
        </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('posts.search')}
            className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterGroup label={t('posts.filter_label.kind')}>
            {(['all', 'tweet', 'article'] as const).map((f) => (
              <button key={f} onClick={() => setKind(f)} className={CHIP(kind === f)}>
                {t(
                  f === 'all'
                    ? 'posts.filter.all'
                    : f === 'tweet'
                      ? 'posts.filter.tweets'
                      : 'posts.filter.articles',
                )}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label={t('posts.filter_label.status')}>
            {(['all', 'reviewed', 'unreviewed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setReview(f);
                  updateParam('review', f, 'all');
                }}
                className={CHIP(review === f)}
              >
                {f === 'reviewed' && <CheckCircle2 className="h-3 w-3 me-1 inline" />}
                {f === 'unreviewed' && <Circle className="h-3 w-3 me-1 inline" />}
                {t('posts.review.' + f)}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label={t('posts.filter_label.origin')}>
            {(['all', 'individual', 'company'] as const).map((f) => (
              <button key={f} onClick={() => setOrigin(f)} className={CHIP(origin === f)}>
                {t('posts.origin_filter.' + f)}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label={t('posts.filter_label.category')}>
            {(['all', 'inner', 'outer', 'general', 'other', 'unclassified'] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => {
                    setCategory(f);
                    updateParam('category', f, 'all');
                  }}
                  className={CHIP(category === f)}
                >
                  {t('posts.category.' + f)}
                </button>
              ),
            )}
          </FilterGroup>

          {topTags.length > 0 && (
            <FilterGroup label={t('posts.filter_label.hashtag')}>
              <select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  updateParam('tag', e.target.value, '');
                }}
                className="h-8 rounded-lg border border-border bg-accent/40 px-3 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dir="auto"
              >
                <option value="">{t('posts.filter.all')}</option>
                {topTags.slice(0, 20).map((tc) => (
                  <option key={tc.tag} value={tc.tag}>
                    {tc.tag} ({tc.count})
                  </option>
                ))}
              </select>
            </FilterGroup>
          )}

          <FilterGroup label={t('posts.filter_label.date')}>
            {(['all', '24h', '7d', '30d'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={CHIP(dateRange === d)}
              >
                {t('posts.date_filter.' + d)}
              </button>
            ))}
          </FilterGroup>

          <FilterGroup label={t('posts.filter_label.sort')}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-8 rounded-lg border border-border bg-accent/40 px-3 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="posted_desc">{t('posts.sort.posted_desc')}</option>
              <option value="posted_asc">{t('posts.sort.posted_asc')}</option>
              <option value="captured_desc">{t('posts.sort.captured_desc')}</option>
            </select>
          </FilterGroup>
        </div>
      </div>

      {isLoading && posts.length === 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="h-40 rounded-lg bg-accent/40" />
              <div className="h-4 w-3/4 rounded bg-accent/40" />
              <div className="h-3 w-1/2 rounded bg-accent/30" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('posts.error_message')}
          </p>
          <button
            onClick={() => void mutatePosts()}
            className="inline-flex h-9 items-center rounded-lg border border-red-500/40 bg-background px-4 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            {t('posts.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              companies={companies}
              isAdmin={isAdmin}
              selected={isAdmin && selected.has(p.id)}
              {...(isAdmin ? {
                onToggleSelect: () => toggleSelect(p.id),
                onQuickEdit: () => setQuickEditPost(p),
                onRecaptured: refresh,
                onChanged: refresh,
              } : {})}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-accent/20 p-12 text-center text-sm text-muted-foreground">
          {t('posts.empty')}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-1" />
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="inline-flex h-9 items-center rounded-lg border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t('posts.pagination.load_more')}
          </button>
        </div>
      )}

      <PostsBulkBar
        selectedIds={[...selected]}
        onClear={() => setSelected(new Set())}
        onChanged={refresh}
      />

      <QuickEditDialog
        post={quickEditPost}
        onClose={() => setQuickEditPost(null)}
        onSaved={refresh}
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}
