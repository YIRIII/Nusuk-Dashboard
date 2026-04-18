import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Post } from '@/lib/api';

const COLORS = {
  primary: 'hsl(245 75% 60%)',
  emerald: 'hsl(160 55% 45%)',
  amber: 'hsl(30 80% 55%)',
  rose: 'hsl(345 70% 58%)',
};

export function StagesChart({ posts }: { posts: Post[] }) {
  const { t } = useTranslation();
  const data = useMemo(() => {
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

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold">{t('dashboard.chart.stages')}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('monitor.stages_hint')}</p>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              {data.map((s) => (
                <Cell key={s.stage} fill={s.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
