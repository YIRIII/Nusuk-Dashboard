import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  Building2,
  CalendarDays,
  AlertCircle,
  TrendingUp,
  Database,
} from 'lucide-react';
import { usePosts, useCompanies } from '@/hooks/usePosts';
import { staggerGrid, staggerItem } from '@/lib/motion';
import { AnalyticsCharts } from '@/components/charts/AnalyticsCharts';

// Reserving 'government' for future expansion — users may want to split
// government/official entities out of the general bucket later.
type CategoryFilter = 'all' | 'inner' | 'outer' | 'general' | 'other' | 'unclassified';

interface Tile {
  k: string;
  v: string;
  sub?: string;
  Icon: typeof FileText;
  accent: string;
  iconBg: string;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const { data, isLoading } = usePosts({ sort: 'captured_desc', limit: 500 });
  const { data: companiesData } = useCompanies();
  void companiesData;
  const allRows = data?.rows ?? [];

  // Apply the category filter to everything below — KPIs, charts, breakdown.
  const rows = useMemo(() => {
    if (categoryFilter === 'all') return allRows;
    if (categoryFilter === 'unclassified') {
      return allRows.filter((p) => p.origin === 'company' && !p.company_category);
    }
    return allRows.filter((p) => p.company_category === categoryFilter);
  }, [allRows, categoryFilter]);

  const total = categoryFilter === 'all' ? data?.total ?? 0 : rows.length;

  // Breakdown always reflects the unfiltered totals so the analyst can see
  // what's in each bucket at a glance.
  const breakdown = useMemo(
    () => ({
      inner: allRows.filter((p) => p.company_category === 'inner').length,
      outer: allRows.filter((p) => p.company_category === 'outer').length,
      general: allRows.filter((p) => p.company_category === 'general').length,
      other: allRows.filter((p) => p.company_category === 'other').length,
      unclassified: allRows.filter(
        (p) => p.origin === 'company' && !p.company_category,
      ).length,
    }),
    [allRows],
  );

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = rows.filter((p) => new Date(p.captured_at).getTime() >= weekAgo).length;
  const reviewed = rows.filter((p) => p.reviewed).length;
  const needsReview = rows.filter((p) => !p.reviewed).length;
  const companyPosts = rows.filter((p) => p.origin === 'company').length;

  const tiles: Tile[] = [
    {
      k: 'dashboard.kpi.total_posts',
      v: total.toLocaleString(i18n.language),
      sub: 'All-time archive',
      Icon: FileText,
      accent: 'text-indigo-500',
      iconBg: 'bg-indigo-500/10',
    },
    {
      k: 'dashboard.kpi.reviewed',
      v: reviewed.toString(),
      sub: total > 0 ? Math.round((reviewed / total) * 100) + '% complete' : '',
      Icon: CheckCircle2,
      accent: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
    },
    {
      k: 'dashboard.kpi.company_posts',
      v: companyPosts.toString(),
      sub: total > 0 ? Math.round((companyPosts / total) * 100) + '% of total' : '',
      Icon: Building2,
      accent: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      k: 'dashboard.kpi.this_week',
      v: thisWeek.toString(),
      sub: 'Last 7 days',
      Icon: CalendarDays,
      accent: 'text-sky-500',
      iconBg: 'bg-sky-500/10',
    },
    {
      k: 'dashboard.kpi.needs_review',
      v: needsReview.toString(),
      sub: needsReview > 0 ? 'Pending action' : 'All caught up',
      Icon: AlertCircle,
      accent: 'text-rose-500',
      iconBg: 'bg-rose-500/10',
    },
  ];

  const topPosters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of rows) {
      const handle = (p.metadata?.author_handle as string | null | undefined) ?? '';
      if (!handle) continue;
      counts.set(handle, (counts.get(handle) ?? 0) + 1);
    }
    const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = arr[0]?.[1] ?? 1;
    return arr.map(([handle, n]) => ({ handle, n, pct: (n / max) * 100 }));
  }, [rows]);

  const categories: { key: CategoryFilter; count: number }[] = [
    { key: 'all', count: allRows.length },
    { key: 'inner', count: breakdown.inner },
    { key: 'outer', count: breakdown.outer },
    { key: 'general', count: breakdown.general },
    { key: 'other', count: breakdown.other },
    { key: 'unclassified', count: breakdown.unclassified },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('nav.dashboard')}
            <span className="gradient-text ms-2">·</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(({ key, count }) => {
            const active = categoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' +
                  (active
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground')
                }
              >
                {t('posts.category.' + key)}
                <span
                  className={
                    'rounded-md px-1.5 py-0.5 text-[10px] font-semibold ' +
                    (active ? 'bg-primary/20 text-primary' : 'bg-background/60 text-muted-foreground')
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        variants={staggerGrid}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
      >
        {tiles.map(({ k, v, sub, Icon, accent, iconBg }) => (
          <motion.div key={k} variants={staggerItem}>
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className={'flex h-9 w-9 items-center justify-center rounded-lg ' + iconBg}>
                  <Icon className={'h-4 w-4 ' + accent} />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">{v}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{t(k)}</p>
              {sub && <p className="mt-1 text-[10px] text-muted-foreground/70">{sub}</p>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{t('dashboard.top_posters')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.top_posters_hint')}</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : topPosters.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('dashboard.top_posters_empty')}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {topPosters.map(({ handle, n, pct }, i) => {
              const initial = handle.replace(/^@/, '').charAt(0).toUpperCase();
              const rankColors = [
                'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
                'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
                'bg-gradient-to-br from-amber-700 to-amber-900 text-white',
                'bg-accent text-muted-foreground',
                'bg-accent text-muted-foreground',
              ];
              return (
                <motion.li
                  key={handle}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/40"
                >
                  <div
                    className={
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ' +
                      (rankColors[i] ?? 'bg-accent text-muted-foreground')
                    }
                  >
                    {i + 1}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" dir="ltr">
                      {handle}
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-accent">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: pct + '%' }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-lg font-bold tracking-tight">{n}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('dashboard.posts_count')}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <AnalyticsCharts posts={rows} />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{t('dashboard.storage_usage')}</p>
          <span className="ms-auto text-xs text-muted-foreground">
            {(rows.length * 0.8).toFixed(1)} MB / 1024 MB
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: Math.min(rows.length * 0.08, 100) + '%' }}
          />
        </div>
      </div>
    </div>
  );
}
