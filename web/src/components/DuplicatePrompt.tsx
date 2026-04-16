import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, Eye, RotateCw, X } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { swrFetcher, type Post } from '@/lib/api';

export interface DuplicateInfo {
  url: string;
  post_id: string;
  prior_captured_at?: string;
}

interface Props {
  dup: DuplicateInfo | null;
  onSkip: () => void;
  onRecapture: () => void;
  recapturing?: boolean;
}

export function DuplicatePrompt({ dup, onSkip, onRecapture, recapturing = false }: Props) {
  const { t, i18n } = useTranslation();
  const { data } = useSWR<{ post: Post }>(
    dup ? '/api/posts/' + dup.post_id : null,
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!!dup), [dup]);
  if (!dup) return null;

  const post = data?.post;
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-xl border border-amber-500/40 bg-card shadow-lg"
    >
      {/* Orange→red warning bar like v1 */}
      <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/15 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{t('capture.duplicate.header')}</h3>
            <p className="text-xs text-muted-foreground">
              {dup.prior_captured_at
                ? t('capture.duplicate.captured_on', {
                    when: fmt.format(new Date(dup.prior_captured_at)),
                  })
                : t('capture.duplicate.already_exists')}
            </p>
          </div>
          <button
            onClick={onSkip}
            aria-label={t('common.cancel')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 p-3 flex items-center gap-3">
          {post?.screenshot_url ? (
            <img
              src={post.screenshot_url}
              alt=""
              className="h-16 w-16 rounded-md object-cover object-top border border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-accent" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {post?.title_override ??
                post?.metadata?.author_name ??
                post?.metadata?.author_handle ??
                dup.url}
            </p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">
              {post?.metadata?.author_handle ?? ''}
            </p>
            {post?.metadata?.text && (
              <p className="truncate text-xs text-muted-foreground mt-1">
                {post.metadata.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link to={'/posts/' + dup.post_id}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 me-2" />
              {t('capture.duplicate.view')}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={recapturing}>
            {t('capture.duplicate.skip')}
          </Button>
          <Button size="sm" onClick={onRecapture} disabled={recapturing}>
            <RotateCw className={'h-4 w-4 me-2 ' + (recapturing ? 'animate-spin' : '')} />
            {recapturing ? t('common.loading') : t('capture.duplicate.recapture')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
