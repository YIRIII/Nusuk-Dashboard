import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { Post } from '@/lib/api';

interface Props {
  posts: Post[];
}

const DAYS = 30;

function shortDate(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

const COLORS = {
  primary: 'hsl(245 75% 60%)',
  emerald: 'hsl(160 55% 45%)',
  amber: 'hsl(30 80% 55%)',
  rose: 'hsl(345 70% 58%)',
  sky: 'hsl(205 75% 52%)',
  purple: 'hsl(265 70% 60%)',
  gray: 'hsl(220 10% 55%)',
};

export function AnalyticsCharts({ posts }: Props) {
  const { t, i18n } = useTranslation();
  const [dateAxis, setDateAxis] = useState<'posted' | 'captured'>('posted');

  // ----- Daily series (last 30 days window — driven by dateAxis toggle) -----
  const { daily, busiestLabel, busiestCount } = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const p of posts) {
      const stamp = dateAxis === 'posted' ? p.posted_at ?? p.captured_at : p.captured_at;
      if (!stamp) continue;
      const key = stamp.slice(0, 10);
      if (key in buckets) buckets[key]! += 1;
    }
    const entries = Object.entries(buckets);
    let bestKey = entries[0]?.[0] ?? '';
    let bestN = 0;
    for (const [k, v] of entries) {
      if (v > bestN) {
        bestN = v;
        bestKey = k;
      }
    }
    return {
      daily: entries.map(([k, v]) => ({
        day: shortDate(new Date(k), i18n.language),
        captures: v,
      })),
      busiestLabel: bestKey ? shortDate(new Date(bestKey), i18n.language) : '',
      busiestCount: bestN,
    };
  }, [posts, i18n.language, dateAxis]);

  // ----- Origin split -----
  const originData = useMemo(() => {
    const ind = posts.filter((p) => p.origin === 'individual').length;
    const co = posts.filter((p) => p.origin === 'company').length;
    return [
      { name: t('posts.origin.individual'), value: ind, color: COLORS.sky },
      { name: t('posts.origin.company'), value: co, color: COLORS.amber },
    ];
  }, [posts, t]);

  // ----- Kind split -----
  const kindData = useMemo(() => {
    const tw = posts.filter((p) => p.kind === 'tweet').length;
    const art = posts.filter((p) => p.kind === 'article').length;
    return [
      { name: t('posts.kind.tweet'), value: tw, color: COLORS.primary },
      { name: t('posts.kind.article'), value: art, color: COLORS.emerald },
    ];
  }, [posts, t]);

  // ----- Review status -----
  const reviewData = useMemo(() => {
    const r = posts.filter((p) => p.reviewed).length;
    const u = posts.filter((p) => !p.reviewed).length;
    return [
      { name: t('posts.reviewed'), value: r, color: COLORS.emerald },
      { name: t('posts.unreviewed'), value: u, color: COLORS.amber },
    ];
  }, [posts, t]);


  const chartTitle =
    dateAxis === 'posted'
      ? t('dashboard.chart.daily_posted')
      : t('dashboard.chart.daily_captured');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{chartTitle}</p>
          <div className="inline-flex rounded-lg border border-border bg-accent/40 p-0.5 text-[11px] font-medium">
            {(['posted', 'captured'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setDateAxis(v)}
                className={
                  'rounded-md px-3 py-1 transition-colors ' +
                  (dateAxis === v
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {t('dashboard.chart.date_axis.' + v)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              interval={Math.floor(DAYS / 6)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="captures"
              stroke={COLORS.primary}
              strokeWidth={2}
              fill="url(#gradCap)"
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        {busiestCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('dashboard.chart.busiest_day', {
              day: busiestLabel,
              n: busiestCount,
            })}
          </p>
        )}
      </div>

      <ChartCard title={t('dashboard.chart.origin')}>
        <Donut data={originData} />
      </ChartCard>

      <ChartCard title={t('dashboard.chart.kind')}>
        <Donut data={kindData} />
      </ChartCard>

      <ChartCard title={t('dashboard.chart.review')}>
        <Donut data={reviewData} />
      </ChartCard>

    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={'rounded-xl border border-border bg-card p-5 ' + (className ?? '')}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center -mt-6">
        <div className="text-center">
          <p className="text-2xl font-bold">{total}</p>
        </div>
      </div>
    </div>
  );
}
