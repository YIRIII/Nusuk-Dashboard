import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSWRConfig } from 'swr';
import { FileSpreadsheet, Search, CheckCircle2, Circle, CheckSquare, Square } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { PostsBulkBar } from '@/components/PostsBulkBar';
import { QuickEditDialog } from '@/components/QuickEditDialog';
import { staggerGrid } from '@/lib/motion';
import { usePosts, useCompanies, type PostsQuery } from '@/hooks/usePosts';
import type { Post } from '@/lib/api';

type KindFilter = 'all' | 'tweet' | 'article';
type ReviewFilter = 'all' | 'reviewed' | 'unreviewed';
type OriginFilter = 'all' | 'individual' | 'company';
type DateFilter = 'all' | '24h' | '7d' | '30d';
type SortMode = 'posted_desc' | 'posted_asc' | 'captured_desc';

// v1-style chip — rounded, border, subtle bg, purple tint when active.
const CHIP = (active: boolean) =>
  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' +
  (active
    ? 'bg-primary/15 text-primary border-primary/40'
    : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground');

export function PostsPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { mutate } = useSWRConfig();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [review, setReview] = useState<ReviewFilter>((params.get('review') as ReviewFilter) ?? 'all');
  const [origin, setOrigin] = useState<OriginFilter>('all');
  const [company] = useState<string>(params.get('company') ?? 'all');
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [sort, setSort] = useState<SortMode>('posted_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickEditPost, setQuickEditPost] = useState<Post | null>(null);

  const query: PostsQuery = useMemo(
    () => ({
      kind,
      review,
      origin,
      ...(company !== 'all' ? { company } : {}),
      date_range: dateRange,
      sort,
      ...(q ? { q } : {}),
      limit: 100,
    }),
    [kind, review, origin, company, dateRange, sort, q],
  );

  const { data, isLoading, error } = usePosts(query);
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.rows ?? [];
  const posts = data?.rows ?? [];
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
    void mutate((key) => typeof key === 'string' && key.startsWith('/api/posts'));
  };

  const exportIds = selected.size > 0 ? '?ids=' + [...selected].join(',') : '';

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.posts')}</h1>
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

      {isLoading && (
        <div className="rounded-xl border border-dashed border-border bg-accent/20 p-12 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-600">
          {t('common.error')}: {String((error as Error).message)}
        </div>
      )}

      {!isLoading && !error && (
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              companies={companies}
              selected={selected.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
              onQuickEdit={() => setQuickEditPost(p)}
              onRecaptured={refresh}
              onChanged={refresh}
            />
          ))}
        </motion.div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-accent/20 p-12 text-center text-sm text-muted-foreground">
          {t('posts.empty')}
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
