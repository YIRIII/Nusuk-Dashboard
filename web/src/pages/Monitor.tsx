import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { staggerGrid, staggerItem } from '@/lib/motion';
import { swrFetcher, type ActivityEntry, type ActivityType } from '@/lib/api';

const ICONS: Record<ActivityType, { Icon: typeof CheckCircle2; klass: string }> = {
  captured: { Icon: CheckCircle2, klass: 'text-emerald-500' },
  recaptured: { Icon: RotateCw, klass: 'text-blue-500' },
  failed: { Icon: XCircle, klass: 'text-red-500' },
};

export function MonitorPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useSWR<{ rows: ActivityEntry[] }>(
    '/api/activity',
    swrFetcher,
    { revalidateOnFocus: false, refreshInterval: 30_000 },
  );
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.monitor')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('monitor.hint')}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">
          {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {t('activity.empty')}
              </p>
            ) : (
              <motion.ul
                variants={staggerGrid}
                initial="hidden"
                animate="visible"
                className="divide-y divide-border"
              >
                {rows.map((a) => {
                  const meta = ICONS[a.type] ?? ICONS.captured;
                  const { Icon, klass } = meta;
                  return (
                    <motion.li
                      key={a.id}
                      variants={staggerItem}
                      className="flex items-start gap-4 p-4"
                    >
                      <Icon className={'h-5 w-5 shrink-0 mt-0.5 ' + klass} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{t('activity.event.' + a.type)}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-muted-foreground break-all" dir="ltr">
                            {a.target}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fmt.format(new Date(a.at))} · stage: {a.stage}
                          {a.error ? ' · ' + a.error : ''}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
