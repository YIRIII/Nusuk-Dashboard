import { useMemo } from 'react';
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
  const { data, isLoading } = usePosts({ sort: 'captured_desc', limit: 500 });
  const { data: companiesData } = useCompanies();
  void companiesData; // reserved for future per-company stats
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = rows.filter((p) => new Date(p.captured_at).getTime() >= weekAgo).length;
  const reviewed = rows.filter((p) => p.reviewed).length;
  const needsReview = rows.filter((p) => !p.reviewed).length;
  const companyPosts = rows.filter((p) => p.origin === 'company').length;
  const individualPosts = rows.filter((p) => p.origin === 'individual').length;
  void individualPosts;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('nav.dashboard')}
          <span className="gradient-text ms-2">·</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.welcome')}</p>
      </div>

      <motion.div
        variants={staggerGrid}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
      >
        {tiles.map(({ k, v, sub, Icon, accent, iconBg }) => (
          <motion.div key={k} variants={staggerItem}>
            <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className={'flex h-9 w-9 items-center justify-center rounded-lg ' + iconBg}>
                  <Icon className={'h-4 w-4 ' + accent} />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">{v}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{t(k)}</p>
              {sub && <p className="mt-1 text-[10px] text-muted-foreground/70">{sub}</p>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AnalyticsCharts posts={rows} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t('dashboard.top_posters')}</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : topPosters.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('dashboard.top_posters_empty')}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topPosters.map(({ handle, n, pct }) => (
                <li key={handle} className="grid grid-cols-[9rem,1fr,2rem] items-center gap-3">
                  <span className="truncate text-sm text-muted-foreground" dir="ltr">
                    {handle}
                  </span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-accent">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: pct + '%' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    />
                  </div>
                  <span className="text-xs font-medium text-end">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{t('dashboard.storage_usage')}</p>
          </div>
          <p className="mt-4 text-2xl font-bold">{(rows.length * 0.8).toFixed(1)} MB</p>
          <p className="text-xs text-muted-foreground">of 1024 MB</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: Math.min(rows.length * 0.08, 100) + '%' }}
            />
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            {t('dashboard.storage_hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
