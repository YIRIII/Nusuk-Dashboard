import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { api, swrFetcher, type ListPostsResponse } from '@/lib/api';
import { useCompanies } from '@/hooks/usePosts';
import { staggerGrid, staggerItem } from '@/lib/motion';

export function RecentlyDeletedPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data, isLoading, mutate } = useSWR<ListPostsResponse>(
    '/api/posts?deleted=true&sort=captured_desc&limit=100',
    swrFetcher,
    { revalidateOnFocus: false },
  );
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.rows ?? [];
  const rows = data?.rows ?? [];

  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
  });

  async function restore(id: string) {
    try {
      await api.restorePost(id);
      toast(t('recently_deleted.restored'), 'success');
      void mutate();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.recently_deleted')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('recently_deleted.hint')}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Trash2 className="h-8 w-8 opacity-40" />
            <p>{t('recently_deleted.empty')}</p>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {rows.map((p) => {
            const company = p.company_id ? companies.find((c) => c.id === p.company_id) : null;
            return (
              <motion.div key={p.id} variants={staggerItem}>
                <Card className="overflow-hidden border-red-500/30 bg-red-500/5">
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-accent">
                      {p.screenshot_url && (
                        <img
                          src={p.screenshot_url}
                          alt=""
                          className="h-full w-full object-cover object-top opacity-60"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.title_override ?? p.metadata?.text ?? p.url}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {p.metadata?.author_handle ?? '—'}
                      </p>
                      {company && (
                        <p className="text-xs text-muted-foreground">
                          {i18n.language === 'ar' ? company.name_ar : company.name_en}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-red-500/20 bg-background/40 px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      {t('recently_deleted.captured_at')}: {fmt.format(new Date(p.captured_at))}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => restore(p.id)}>
                      <RotateCcw className="h-3.5 w-3.5 me-2" />
                      {t('recently_deleted.restore')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
