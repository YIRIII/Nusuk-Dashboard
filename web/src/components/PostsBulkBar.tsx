import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  RotateCw,
  Trash2,
  X,
  User,
  Building2,
  Tag,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

interface Props {
  selectedIds: string[];
  onClear: () => void;
  onChanged?: () => void;
}

interface Progress {
  total: number;
  done: number;
  captured: number;
  failed: number;
  cancelled?: boolean;
}

export function PostsBulkBar({ selectedIds, onClear, onChanged }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = selectedIds.length;

  // Close the category menu when clicking outside.
  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [categoryMenuOpen]);

  async function run(op: () => Promise<void>) {
    setBusy(true);
    try {
      await op();
      onChanged?.();
      onClear();
    } finally {
      setBusy(false);
    }
  }

  const markReviewed = () =>
    run(async () => {
      await Promise.all(selectedIds.map((id) => api.patchPost(id, { reviewed: true })));
      toast(t('posts.bulk.toast.marked_reviewed', { n: selectedIds.length }), 'success');
    });

  const makeCompany = () =>
    run(async () => {
      await Promise.all(selectedIds.map((id) => api.patchPost(id, { origin: 'company' })));
      toast(t('posts.bulk.toast.set_company', { n: selectedIds.length }), 'success');
    });

  const makeIndividual = () =>
    run(async () => {
      await Promise.all(
        selectedIds.map((id) =>
          api.patchPost(id, {
            origin: 'individual',
            company_id: null,
            company_category: null,
          }),
        ),
      );
      toast(t('posts.bulk.toast.set_individual', { n: selectedIds.length }), 'success');
    });

  const setCategory = (cat: 'inner' | 'outer' | 'general' | 'other') =>
    run(async () => {
      await Promise.all(
        selectedIds.map((id) =>
          api.patchPost(id, { origin: 'company', company_category: cat }),
        ),
      );
      toast(
        t('posts.bulk.toast.set_category', {
          n: selectedIds.length,
          cat: t('posts.category.' + cat),
        }),
        'success',
      );
    });

  // Sequential recapture so Chromium pool isn't overwhelmed. We capture the
  // ids into a local variable because `selectedIds` reference can change after
  // `onChanged?.()` triggers a re-render of the parent list.
  async function recapture() {
    const ids = [...selectedIds];
    setBusy(true);
    setProgress({ total: ids.length, done: 0, captured: 0, failed: 0 });
    let captured = 0;
    let failed = 0;
    let cancelled = false;
    try {
      for (let i = 0; i < ids.length; i++) {
        // read state via a functional update to detect cancellation
        let stopRequested = false;
        setProgress((prev) => {
          if (prev?.cancelled) stopRequested = true;
          return prev;
        });
        if (stopRequested) {
          cancelled = true;
          break;
        }

        const id = ids[i]!;
        try {
          const { post } = await api.getPost(id);
          await api.deletePost(id);
          const r = await api.capture({
            url: post.url,
            origin: post.origin,
            company_id: post.company_id,
          });
          if (r.status === 'captured') captured++;
          else failed++;
        } catch {
          failed++;
        }
        setProgress({
          total: ids.length,
          done: i + 1,
          captured,
          failed,
        });
        onChanged?.();
      }
      toast(
        cancelled
          ? t('posts.bulk.toast.recapture_cancelled', { captured, failed })
          : t('posts.bulk.toast.recapture_done', { captured, failed }),
        failed > 0 || cancelled ? 'error' : 'success',
      );
    } finally {
      setProgress(null);
      setBusy(false);
      onChanged?.();
      onClear();
    }
  }

  function cancelRecapture() {
    setProgress((prev) => (prev ? { ...prev, cancelled: true } : prev));
  }

  const softDelete = () =>
    run(async () => {
      await Promise.all(selectedIds.map((id) => api.deletePost(id)));
      toast(t('posts.bulk.toast.deleted', { n: selectedIds.length }), 'success');
    });

  const showingProgress = progress !== null;
  const progressPct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const remaining = progress ? progress.total - progress.done : 0;
  const visible = count > 0 || showingProgress;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          {showingProgress ? (
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <RotateCw className="h-4 w-4 text-primary animate-spin" />
                <p className="text-sm font-medium flex-1">
                  {t('posts.bulk.progress.title', {
                    done: progress!.done,
                    total: progress!.total,
                  })}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t('posts.bulk.progress.remaining', { n: remaining })}
                </span>
                <Button size="sm" variant="ghost" onClick={cancelRecapture}>
                  <X className="h-4 w-4 me-1" />
                  {t('common.cancel')}
                </Button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                  animate={{ width: progressPct + '%' }}
                  transition={{ duration: 0.25 }}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> {progress!.captured}{' '}
                  {t('import.status.captured').toLowerCase()}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <X className="h-3 w-3" /> {progress!.failed}{' '}
                  {t('import.status.failed').toLowerCase()}
                </span>
                <span className="ms-auto text-muted-foreground">{progressPct}%</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/95 px-2 py-2 shadow-2xl backdrop-blur-xl">
              <span className="px-3 text-sm font-medium">
                {t('posts.bulk.selected', { n: count })}
              </span>
              <span className="h-6 w-px bg-border mx-1" />
              <Button size="sm" variant="soft" onClick={markReviewed} disabled={busy}>
                <CheckCircle2 className="h-4 w-4 me-2" />
                {t('posts.bulk.mark_reviewed')}
              </Button>
              <Button size="sm" variant="ghost" onClick={makeCompany} disabled={busy}>
                <Building2 className="h-4 w-4 me-2" />
                {t('posts.bulk.to_company')}
              </Button>
              <Button size="sm" variant="ghost" onClick={makeIndividual} disabled={busy}>
                <User className="h-4 w-4 me-2" />
                {t('posts.bulk.to_individual')}
              </Button>
              <div className="relative" ref={menuRef}>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => setCategoryMenuOpen((v) => !v)}
                  disabled={busy}
                >
                  <Tag className="h-4 w-4 me-2" />
                  {t('posts.bulk.set_category_btn_v2')}
                  <ChevronUp
                    className={
                      'h-3 w-3 ms-1.5 transition-transform ' +
                      (categoryMenuOpen ? '' : 'rotate-180')
                    }
                  />
                </Button>
                <AnimatePresence>
                  {categoryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      className="absolute bottom-full mb-2 start-0 flex flex-col gap-1 rounded-xl border border-border bg-card p-1.5 shadow-2xl z-50 min-w-[10rem]"
                    >
                      {(['inner', 'outer', 'general', 'other'] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setCategoryMenuOpen(false);
                            setCategory(c);
                          }}
                          disabled={busy}
                          className="rounded-md px-3 py-2 text-start text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          {t('posts.category.' + c)}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button size="sm" variant="ghost" onClick={recapture} disabled={busy}>
                <RotateCw className="h-4 w-4 me-2" />
                {t('posts.bulk.recapture')}
              </Button>
              <Button size="sm" variant="destructive" onClick={softDelete} disabled={busy}>
                <Trash2 className="h-4 w-4 me-2" />
                {t('posts.bulk.delete')}
              </Button>
              <span className="h-6 w-px bg-border mx-1" />
              <Button
                size="icon"
                variant="ghost"
                onClick={onClear}
                aria-label={t('common.cancel')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
