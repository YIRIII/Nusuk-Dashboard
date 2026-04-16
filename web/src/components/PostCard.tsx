import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  RotateCw,
  FileText,
  User,
  Building2,
  CheckCircle2,
  Pencil,
  Trash2,
  Circle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { api, type Post, type Company } from '@/lib/api';
import { cardHover, staggerItem } from '@/lib/motion';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface Props {
  post: Post;
  companies: Company[];
  compact?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onQuickEdit?: () => void;
  onRecaptured?: () => void;
  onChanged?: () => void;
}

export function PostCard({
  post,
  companies,
  compact = false,
  selected = false,
  onToggleSelect,
  onQuickEdit,
  onRecaptured,
  onChanged,
}: Props) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
  });

  const company = post.company_id
    ? companies.find((c) => c.id === post.company_id) ?? null
    : null;
  const meta = post.metadata ?? {};
  const displayName = post.title_override ?? meta.author_name ?? company?.name_en ?? post.url;
  const content = meta.text ?? '';
  const thumb = post.screenshot_url;
  const postedAt = post.posted_at ?? meta.posted_at;

  const openDetail = () => navigate('/posts/' + post.id);

  async function recapture(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      await api.deletePost(post.id);
      const result = await api.capture({
        url: post.url,
        origin: post.origin,
        company_id: post.company_id,
      });
      if (result.status === 'captured')
        toast(t('posts.toast.recaptured', { stage: result.stage ?? '' }), 'success');
      else if (result.status === 'duplicate') toast(t('posts.toast.duplicate'), 'info');
      else toast(t('posts.toast.failed'), 'error');
      onRecaptured?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function markReviewed(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.patchPost(post.id, { reviewed: !post.reviewed });
      onChanged?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function del(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t('posts.confirm_delete'))) return;
    try {
      await api.deletePost(post.id);
      toast(t('posts.toast.deleted'), 'success');
      onChanged?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  return (
    <motion.div
      variants={staggerItem}
      whileHover={cardHover.whileHover}
      whileTap={cardHover.whileTap}
      className="h-full"
    >
      <Card
        className={cn(
          'group relative h-full overflow-hidden flex flex-col border-border/80 bg-card transition-all',
          'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
          selected && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
        )}
      >
        {thumb ? (
          <div
            className="relative h-64 overflow-hidden rounded-t-xl cursor-pointer bg-accent"
            onClick={openDetail}
          >
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {/* Bottom fade so the cutoff doesn't look harsh */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/70 to-transparent" />
          </div>
        ) : (
          <div
            className="h-64 rounded-t-xl bg-accent flex items-center justify-center cursor-pointer text-muted-foreground"
            onClick={openDetail}
          >
            <FileText className="h-10 w-10 opacity-40" />
          </div>
        )}

        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              'absolute top-2 start-2 rounded-lg p-1 backdrop-blur-sm transition-all',
              selected
                ? 'bg-primary/20 text-primary'
                : 'bg-background/70 text-muted-foreground opacity-0 group-hover:opacity-100',
            )}
          >
            {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
        )}

        <div className="absolute top-2 start-10">
          {post.reviewed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 backdrop-blur border border-emerald-500/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {t('posts.reviewed')}
            </span>
          ) : (
            <button
              onClick={markReviewed}
              title={t('quick_edit.mark_reviewed')}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500 backdrop-blur border border-amber-500/30 transition-colors hover:bg-emerald-500/20 hover:text-emerald-500 hover:border-emerald-500/30"
            >
              <Circle className="h-2 w-2" fill="currentColor" />
              {t('posts.unreviewed')}
            </button>
          )}
        </div>

        <div className="absolute top-2 end-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={recapture}
            disabled={busy}
            title={t('common.recapture')}
            className="rounded-lg bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary disabled:opacity-50"
          >
            <RotateCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          </button>
          {onQuickEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickEdit();
              }}
              title={t('common.edit')}
              className="rounded-lg bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={del}
            title={t('posts.action.delete')}
            className="rounded-lg bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className="flex flex-1 flex-col gap-2 p-4 cursor-pointer"
          onClick={openDetail}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="flex-1 truncate text-sm font-semibold hover:text-primary transition-colors">
              {displayName}
            </h4>
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {t('posts.kind.' + post.kind)}
            </span>
          </div>

          {content && (
            <p className={cn('text-xs text-muted-foreground', compact ? 'line-clamp-1' : 'line-clamp-2')}>
              {content}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              {post.origin === 'company' ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {t('posts.origin.' + post.origin)}
            </div>
            <span>{postedAt ? fmt.format(new Date(postedAt)) : fmt.format(new Date(post.captured_at))}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
