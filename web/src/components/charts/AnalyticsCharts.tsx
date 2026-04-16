import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

  // ----- Daily captures (last 30 days) -----
  const daily = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const p of posts) {
      const key = p.captured_at.slice(0, 10);
      if (key in buckets) buckets[key]! += 1;
    }
    return Object.entries(buckets).map(([k, v]) => ({
      day: shortDate(new Date(k), i18n.language),
      captures: v,
    }));
  }, [posts, i18n.language]);

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

  // ----- Capture stages -----
  const stageData = useMemo(() => {
    const buckets: Record<string, number> = {
      fxtwitter: 0,
      oembed: 0,
      puppeteer_embed: 0,
      puppeteer_direct: 0,
    };
    for (const p of posts) {
      const s = p.latest_capture?.stage;
      if (s && s in buckets) buckets[s]! += 1;
    }
    return [
      { stage: 'FxTwitter', count: buckets['fxtwitter'] ?? 0, color: COLORS.primary },
      { stage: 'oEmbed', count: buckets['oembed'] ?? 0, color: COLORS.emerald },
      { stage: 'Puppeteer (embed)', count: buckets['puppeteer_embed'] ?? 0, color: COLORS.amber },
      { stage: 'Puppeteer (direct)', count: buckets['puppeteer_direct'] ?? 0, color: COLORS.rose },
    ];
  }, [posts]);

  // ----- Hour of day (when posts are captured) -----
  const hourData = useMemo(() => {
    const buckets = new Array(24).fill(0);
    for (const p of posts) {
      const h = new Date(p.captured_at).getHours();
      buckets[h] += 1;
    }
    return buckets.map((v, h) => ({ hour: h + 'h', captures: v }));
  }, [posts]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <ChartCard title={t('dashboard.chart.daily')} className="lg:col-span-3">
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
      </ChartCard>

      <ChartCard title={t('dashboard.chart.origin')}>
        <Donut data={originData} />
      </ChartCard>

      <ChartCard title={t('dashboard.chart.kind')}>
        <Donut data={kindData} />
      </ChartCard>

      <ChartCard title={t('dashboard.chart.review')}>
        <Donut data={reviewData} />
      </ChartCard>

      <ChartCard title={t('dashboard.chart.stages')} className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="stage"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
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
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {stageData.map((s) => (
                <Cell key={s.stage} fill={s.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t('dashboard.chart.hours')}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              fontSize={9}
              tickLine={false}
              interval={3}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              hide
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="captures" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
