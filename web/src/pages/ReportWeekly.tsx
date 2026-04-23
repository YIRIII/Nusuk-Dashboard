import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePosts } from '@/hooks/usePosts';
import type { Post, CompanyCategory } from '@/lib/api';
import { Download, Printer } from 'lucide-react';
import { buildWeeklyPptx, type ReportData } from '@/lib/reportPptx';
import { Switch } from '@/components/ui/switch';
import { countHashtags } from '@/lib/hashtags';

type Category = CompanyCategory | 'unclassified';
type DateSystem = 'gregorian' | 'hijri';

const CATEGORY_ORDER: Category[] = ['inner', 'outer', 'general', 'other', 'unclassified'];

function baseLocale(locale: string): string {
  return locale === 'ar' ? 'ar-SA' : 'en-GB';
}

function fmtDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(baseLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function fmtHijri(d: Date): string {
  // Islamic Umm al-Qura — official Saudi calendar.
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function fmtHijriRange(start: Date, end: Date): string {
  return fmtHijri(start) + ' — ' + fmtHijri(end) + ' هـ';
}

function fmtWeekday(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(baseLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

function fmtDateSys(d: Date, locale: string, sys: DateSystem): string {
  if (sys === 'hijri') {
    const str = new Intl.DateTimeFormat(baseLocale(locale) + '-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return locale === 'ar' ? str + ' هـ' : str + ' AH';
  }
  return fmtDate(d, locale);
}

function fmtWeekdaySys(d: Date, locale: string, sys: DateSystem): string {
  if (sys === 'hijri') {
    return new Intl.DateTimeFormat(baseLocale(locale) + '-u-ca-islamic-umalqura', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }
  return fmtWeekday(d, locale);
}

function postDate(p: Post): Date {
  const raw = p.posted_at ?? p.metadata?.posted_at ?? p.captured_at;
  return new Date(raw);
}

function categoryOf(p: Post): Category | null {
  if (p.origin !== 'company') return null;
  return (p.company_category ?? 'unclassified') as Category;
}

export function ReportWeeklyPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isAr = locale === 'ar';

  // Pull a wide window so the client can slice into "this week" and "last week".
  const { data } = usePosts({ sort: 'posted_desc', limit: 500 });
  const allRows = data?.rows ?? [];

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const defaultStart = useMemo(() => {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() - 6);
    return d;
  }, [todayMidnight]);

  const [startISO, setStartISO] = useState(() => defaultStart.toISOString().slice(0, 10));
  const [endISO, setEndISO] = useState(() => todayMidnight.toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState(false);
  const [dateSystem, setDateSystem] = useState<DateSystem>('gregorian');

  const start = useMemo(() => new Date(startISO + 'T00:00:00'), [startISO]);
  const end = useMemo(() => {
    const d = new Date(endISO + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d;
  }, [endISO]);

  const prevStart = useMemo(() => {
    const span = end.getTime() - start.getTime();
    return new Date(start.getTime() - span);
  }, [start, end]);
  const prevEnd = start;

  const thisWeek = useMemo(
    () => allRows.filter((p) => {
      const t = postDate(p).getTime();
      return t >= start.getTime() && t < end.getTime();
    }),
    [allRows, start, end],
  );
  const lastWeek = useMemo(
    () => allRows.filter((p) => {
      const t = postDate(p).getTime();
      return t >= prevStart.getTime() && t < prevEnd.getTime();
    }),
    [allRows, prevStart, prevEnd],
  );

  const total = thisWeek.length;
  const prevTotal = lastWeek.length;
  const wow = prevTotal === 0 ? null : Math.round(((total - prevTotal) / prevTotal) * 100);

  const uniqueHandles = useMemo(() => {
    const s = new Set<string>();
    for (const p of thisWeek) {
      const h = p.metadata?.author_handle;
      if (h) s.add(h.toLowerCase());
    }
    return s.size;
  }, [thisWeek]);

  // Busiest day by posted date.
  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of thisWeek) {
      const d = postDate(p);
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [thisWeek]);

  const busiest = useMemo(() => {
    let bestKey: string | null = null;
    let bestN = 0;
    for (const [k, n] of perDay) {
      if (n > bestN) {
        bestN = n;
        bestKey = k;
      }
    }
    return bestKey ? { date: new Date(bestKey + 'T00:00:00'), count: bestN } : null;
  }, [perDay]);

  // Category breakdown
  const breakdown = useMemo(() => {
    const m: Record<Category, number> = {
      inner: 0,
      outer: 0,
      general: 0,
      other: 0,
      unclassified: 0,
    };
    for (const p of thisWeek) {
      const c = categoryOf(p);
      if (c) m[c]++;
    }
    return m;
  }, [thisWeek]);

  const prevBreakdown = useMemo(() => {
    const m: Record<Category, number> = {
      inner: 0,
      outer: 0,
      general: 0,
      other: 0,
      unclassified: 0,
    };
    for (const p of lastWeek) {
      const c = categoryOf(p);
      if (c) m[c]++;
    }
    return m;
  }, [lastWeek]);

  // Top 5 voices (by handle count in this week).
  const topVoices = useMemo(() => {
    const map = new Map<string, { handle: string; n: number; category: Category | null }>();
    for (const p of thisWeek) {
      const handle = p.metadata?.author_handle;
      if (!handle) continue;
      const key = handle.toLowerCase();
      const existing = map.get(key);
      const cat = categoryOf(p);
      if (existing) existing.n++;
      else map.set(key, { handle, n: 1, category: cat });
    }
    return [...map.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  }, [thisWeek]);

  // Auto-generated headline (Arabic or English based on locale).
  const headline = useMemo(() => {
    if (!thisWeek.length) {
      return isAr
        ? 'لا توجد منشورات ضمن النطاق المحدد — جرّب توسيع التاريخ.'
        : 'No posts in the selected range — try widening the date range.';
    }
    const topCat = (Object.entries(breakdown) as [Category, number][])
      .sort((a, b) => b[1] - a[1])[0];
    const catLabel = topCat && topCat[1] > 0 ? t('posts.category.' + topCat[0]) : '';
    const catPct = topCat && total > 0 ? Math.round((topCat[1] / total) * 100) : 0;
    const wowPart =
      wow === null
        ? isAr
          ? 'لا توجد بيانات مقارنة للأسبوع السابق.'
          : 'No comparison data for the prior week.'
        : wow >= 0
        ? isAr
          ? `ارتفاع بنسبة ${wow}% مقارنة بالأسبوع السابق`
          : `Up ${wow}% vs last week`
        : isAr
        ? `انخفاض بنسبة ${Math.abs(wow)}% مقارنة بالأسبوع السابق`
        : `Down ${Math.abs(wow)}% vs last week`;
    const busiestPart = busiest
      ? isAr
        ? `، ذروة النشاط يوم ${fmtWeekday(busiest.date, locale)} (${busiest.count} منشور)`
        : `, peak on ${fmtWeekday(busiest.date, locale)} (${busiest.count} posts)`
      : '';
    const catPart = catLabel
      ? isAr
        ? ` بقيادة فئة ${catLabel} (${catPct}%)`
        : ` led by ${catLabel} (${catPct}%)`
      : '';
    return wowPart + catPart + busiestPart + '.';
  }, [thisWeek, breakdown, wow, busiest, total, isAr, locale, t]);

  // 6 highlights: latest post from each of the top voices, then fill with latest overall.
  const highlights = useMemo(() => {
    const picks: Post[] = [];
    const seen = new Set<string>();
    const byHandle = new Map<string, Post[]>();
    for (const p of thisWeek) {
      const h = (p.metadata?.author_handle ?? '').toLowerCase();
      if (!h) continue;
      const arr = byHandle.get(h) ?? [];
      arr.push(p);
      byHandle.set(h, arr);
    }
    for (const v of topVoices) {
      const arr = byHandle.get(v.handle.toLowerCase()) ?? [];
      const latest = arr.sort(
        (a, b) => postDate(b).getTime() - postDate(a).getTime(),
      )[0];
      if (latest && !seen.has(latest.id)) {
        picks.push(latest);
        seen.add(latest.id);
      }
    }
    const sortedAll = [...thisWeek].sort(
      (a, b) => postDate(b).getTime() - postDate(a).getTime(),
    );
    for (const p of sortedAll) {
      if (picks.length >= 6) break;
      if (!seen.has(p.id)) {
        picks.push(p);
        seen.add(p.id);
      }
    }
    return picks.slice(0, 6);
  }, [thisWeek, topVoices]);

  const topHashtags = useMemo(
    () => countHashtags(thisWeek.map((p) => p.metadata?.text as string | undefined)).slice(0, 8),
    [thisWeek],
  );

  async function handleDownloadPptx() {
    if (downloading) return;
    setDownloading(true);
    try {
      const endInclusive = new Date(end.getTime() - 1);
      const categoryLabels: Record<Category, string> = {
        inner: t('posts.category.inner'),
        outer: t('posts.category.outer'),
        general: t('posts.category.general'),
        other: t('posts.category.other'),
        unclassified: t('posts.category.unclassified'),
      };
      const reportData: ReportData = {
        startLabel: fmtDate(start, locale),
        endLabel: fmtDate(endInclusive, locale),
        hijriLabel: fmtHijriRange(start, endInclusive),
        headline,
        total,
        wow,
        prevTotal,
        busiestLabel: busiest ? fmtWeekdaySys(busiest.date, locale, dateSystem) : '',
        busiestCount: busiest?.count ?? 0,
        uniqueHandles,
        categoryOrder: CATEGORY_ORDER,
        categoryCounts: breakdown,
        categoryPrevCounts: prevBreakdown,
        categoryLabels,
        topVoices,
        topHashtags,
        highlights,
        datePostedLabel: (p) => fmtDateSys(postDate(p), locale, dateSystem),
        labels: {
          brand: t('reports.weekly.brand'),
          execSummary: t('reports.weekly.exec_summary'),
          headline: t('reports.weekly.headline'),
          kpiTotal: t('reports.weekly.kpi.total'),
          kpiWow: t('reports.weekly.kpi.wow'),
          kpiPeak: t('reports.weekly.kpi.peak'),
          kpiUnique: t('reports.weekly.kpi.unique'),
          categories: t('reports.weekly.categories'),
          topVoices: t('reports.weekly.top_voices'),
          topHashtags: t('reports.weekly.top_hashtags'),
          highlights: t('reports.weekly.highlights'),
          noScreenshot: t('reports.weekly.no_screenshot'),
          period: t('reports.weekly.period'),
          originIndividual: t('posts.origin.individual'),
        },
        isRtl: isAr,
        dateSystem,
      };
      const fileName = 'nusuk-weekly-' + startISO + '-to-' + endISO + '.pptx';
      await buildWeeklyPptx(reportData, fileName);
    } finally {
      setDownloading(false);
    }
  }

  // --- Rendering helpers ---
  interface KpiTileProps {
    value: string;
    label: string;
    sub?: string | undefined;
  }
  const KpiTile = ({ value, label, sub }: KpiTileProps) => (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:p-6 min-h-[100px] sm:min-h-[150px]">
      <p className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">{value}</p>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );

  const catColor: Record<Category, string> = {
    inner: 'bg-emerald-500',
    outer: 'bg-sky-500',
    general: 'bg-violet-500',
    other: 'bg-zinc-500',
    unclassified: 'bg-rose-500',
  };
  const catPillColor: Record<Category, string> = {
    inner: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    outer: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    general: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    other: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
    unclassified: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  };

  const maxCount = Math.max(1, ...CATEGORY_ORDER.map((c) => breakdown[c]));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('reports.weekly.title')}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('reports.weekly.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t('reports.weekly.from')}
            <input
              type="date"
              value={startISO}
              onChange={(e) => setStartISO(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t('reports.weekly.to')}
            <input
              type="date"
              value={endISO}
              onChange={(e) => setEndISO(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <Switch<DateSystem>
            value={dateSystem}
            onChange={setDateSystem}
            options={[
              { value: 'gregorian', label: t('reports.weekly.cal.gregorian') },
              { value: 'hijri', label: t('reports.weekly.cal.hijri') },
            ]}
          />
          <button
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t('reports.weekly.print')}
          </button>
          <button
            onClick={handleDownloadPptx}
            disabled={downloading || thisWeek.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? t('reports.weekly.downloading') : t('reports.weekly.download_pptx')}
          </button>
        </div>
      </div>

      {/* ───── PAGE 1 — Executive Summary ───── */}
      <section
        className="report-slide relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:[aspect-ratio:16/9]"
        style={{ maxWidth: 1280 }}
      >
        <div className="flex h-full flex-col p-4 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t('reports.weekly.brand')}
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">
                {t('reports.weekly.exec_summary')}
              </h2>
            </div>
            <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-end shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('reports.weekly.period')}
              </p>
              {dateSystem === 'hijri' ? (
                <>
                  <p className="mt-1 text-sm font-bold text-foreground" dir="rtl">
                    {fmtHijriRange(start, new Date(end.getTime() - 1))}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {fmtDate(start, locale)} — {fmtDate(new Date(end.getTime() - 1), locale)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {fmtDate(start, locale)} — {fmtDate(new Date(end.getTime() - 1), locale)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground" dir="rtl">
                    {fmtHijriRange(start, new Date(end.getTime() - 1))}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t('reports.weekly.headline')}
            </p>
            <p className="mt-1 text-base leading-relaxed text-foreground">{headline}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiTile
              value={total.toLocaleString(locale)}
              label={t('reports.weekly.kpi.total')}
              sub={t('reports.weekly.kpi.total_sub')}
            />
            <KpiTile
              value={
                wow === null
                  ? '—'
                  : (wow >= 0 ? '↑ ' : '↓ ') + Math.abs(wow).toLocaleString(locale) + '%'
              }
              label={t('reports.weekly.kpi.wow')}
              sub={
                prevTotal > 0
                  ? t('reports.weekly.kpi.wow_sub', { n: prevTotal })
                  : t('reports.weekly.kpi.wow_empty')
              }
            />
            <KpiTile
              value={busiest ? fmtWeekdaySys(busiest.date, locale, dateSystem) : '—'}
              label={t('reports.weekly.kpi.peak')}
              sub={busiest ? t('reports.weekly.kpi.peak_sub', { n: busiest.count }) : undefined}
            />
            <KpiTile
              value={uniqueHandles.toLocaleString(locale)}
              label={t('reports.weekly.kpi.unique')}
              sub={t('reports.weekly.kpi.unique_sub')}
            />
          </div>

          <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-background/50 p-5">
              <p className="text-sm font-semibold text-foreground">
                {t('reports.weekly.categories')}
              </p>
              <div className="mt-4 space-y-3">
                {CATEGORY_ORDER.map((c) => {
                  const n = breakdown[c];
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  const delta = n - prevBreakdown[c];
                  return (
                    <div key={c} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-medium text-muted-foreground">
                        {t('posts.category.' + c)}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-accent">
                          <div
                            className={'h-full rounded-full ' + catColor[c]}
                            style={{ width: (n / maxCount) * 100 + '%' }}
                          />
                        </div>
                      </div>
                      <span className="w-10 text-end text-xs font-semibold">{n}</span>
                      <span className="w-12 text-end text-xs text-muted-foreground">{pct}%</span>
                      {delta !== 0 && (
                        <span
                          className={
                            'w-10 text-end text-[10px] font-semibold ' +
                            (delta > 0 ? 'text-emerald-500' : 'text-rose-500')
                          }
                        >
                          {delta > 0 ? '+' : ''}
                          {delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                {t('reports.weekly.top_voices')}
              </p>
              <ul className="mt-2 flex min-h-0 flex-1 flex-col justify-between">
                {topVoices.length === 0 ? (
                  <li className="text-xs text-muted-foreground">
                    {t('reports.weekly.top_voices_empty')}
                  </li>
                ) : (
                  topVoices.map((v, i) => (
                    <li
                      key={v.handle}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-0.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-xs font-medium" dir="ltr">
                        {v.handle}
                      </span>
                      {v.category && (
                        <span
                          className={
                            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ' +
                            catPillColor[v.category]
                          }
                        >
                          {t('posts.category.' + v.category)}
                        </span>
                      )}
                      <span className="w-6 shrink-0 text-end text-sm font-bold tabular-nums">{v.n}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                {t('reports.weekly.top_hashtags')}
              </p>
              <ul className="mt-2 flex min-h-0 flex-1 flex-col justify-between">
                {topHashtags.length === 0 ? (
                  <li className="text-xs text-muted-foreground">
                    {t('reports.weekly.top_hashtags_empty')}
                  </li>
                ) : (
                  topHashtags.slice(0, 5).map((tc, i) => (
                    <li
                      key={tc.tag}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-0.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-xs font-medium text-primary" dir="auto">
                        {tc.tag}
                      </span>
                      <span className="w-6 shrink-0 text-end text-sm font-bold tabular-nums">{tc.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───── PAGE 2 — Highlights ───── */}
      <section
        className="report-slide relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:[aspect-ratio:16/9]"
        style={{ maxWidth: 1280 }}
      >
        <div className="flex h-full flex-col p-4 sm:p-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
              {t('reports.weekly.highlights')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('reports.weekly.highlights_sub', { n: highlights.length })}
            </p>
          </div>

          <div className="mt-5 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:grid-rows-2 sm:gap-4">
            {highlights.length === 0 ? (
              <div className="col-span-3 row-span-2 flex items-center justify-center text-sm text-muted-foreground">
                {t('reports.weekly.highlights_empty')}
              </div>
            ) : (
              highlights.map((p) => {
                const handle = p.metadata?.author_handle ?? '';
                const text = p.metadata?.text ?? '';
                const d = postDate(p);
                const cat = categoryOf(p);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-background/50"
                  >
                    <div className="relative h-44 bg-accent/40 overflow-hidden">
                      {p.screenshot_url ? (
                        <img
                          src={p.screenshot_url}
                          alt={handle}
                          className="h-full w-full object-cover object-top"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          (no screenshot)
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold" dir="ltr">
                          {handle || p.metadata?.author_name || '—'}
                        </span>
                        {cat && (
                          <span
                            className={
                              'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ' +
                              catPillColor[cat]
                            }
                          >
                            {t('posts.category.' + cat)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtDateSys(d, locale, dateSystem)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80" dir="auto">
                        {text || '—'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
