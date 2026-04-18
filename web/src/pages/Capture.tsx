import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Camera,
  LinkIcon,
  Files,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  Copy,
  RotateCw,
  ClipboardPaste,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { DuplicatePrompt, type DuplicateInfo } from '@/components/DuplicatePrompt';
import { BatchDuplicateReview, type DuplicateRow } from '@/components/BatchDuplicateReview';
import { GrabFromX } from '@/components/GrabFromX';
import {
  api,
  swrFetcher,
  type Origin,
  type ListPostsResponse,
  type CaptureBatchResponse,
  type CaptureSingleResponse,
} from '@/lib/api';

type Mode = 'single' | 'batch';

// Extract http(s) URLs from arbitrary text — line breaks, spaces, commas, or
// embedded in Arabic sentences. Strips trailing punctuation and dedupes.
const URL_RE = /\bhttps?:\/\/[^\s<>"'`\]\)]+/gi;

function parseUrls(raw: string): string[] {
  const matches = raw.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const trimmed = m.replace(/[.,;:!?)}\]]+$/, '');
    const normalized = trimmed
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^(mobile\.)?twitter\.com/, 'x.com')
      .replace(/\/+$/, '')
      .toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(trimmed);
  }
  return out;
}

function ModePill({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { t } = useTranslation();
  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    { value: 'single', label: t('capture.single_mode'), icon: <LinkIcon className="h-4 w-4" /> },
    { value: 'batch', label: t('capture.batch_mode'), icon: <Files className="h-4 w-4" /> },
  ];
  return (
    <div className="relative inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
      {options.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative z-10 flex min-w-[8rem] items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors"
            style={{ color: active ? 'white' : undefined }}
          >
            {active && (
              <motion.span
                layoutId="capture-mode-pill"
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CapturePage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('single');

  const [singleUrl, setSingleUrl] = useState('');
  const [batchText, setBatchText] = useState('');
  const [lastBatchText, setLastBatchText] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>('individual');

  // Persist last batch paste to localStorage so users can restore after
  // submit clears the textarea or after closing the tab.
  useEffect(() => {
    const saved = localStorage.getItem('nusuk.lastBatchText');
    if (saved && saved.length > 0) setLastBatchText(saved);
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [recapturing, setRecapturing] = useState(false);
  const [batchResult, setBatchResult] = useState<CaptureBatchResponse | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [batchDuplicates, setBatchDuplicates] = useState<DuplicateRow[]>([]);

  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const batchUrls = useMemo(() => parseUrls(batchText), [batchText]);
  const overLimit = batchUrls.length > 100;

  const { data: recent, mutate: refreshRecent } = useSWR<ListPostsResponse>(
    '/api/posts?sort=captured_desc&limit=10',
    swrFetcher,
    { revalidateOnFocus: false },
  );
  const recentPosts = recent?.rows ?? [];

  const canSubmit =
    !submitting &&
    (mode === 'single' ? singleUrl.trim().length > 0 : batchUrls.length > 0 && !overLimit);

  async function submit() {
    setSubmitting(true);
    setBatchResult(null);
    setDuplicate(null);
    setBatchDuplicates([]);
    try {
      if (mode === 'single') {
        const r: CaptureSingleResponse = await api.capture({
          url: singleUrl.trim(),
          origin,
        });
        if (r.status === 'captured') {
          toast(t('capture.toast.captured'), 'success', {
            description: t('capture.toast.captured_desc', {
              stage: r.stage ?? '',
              sec: (r.duration_ms / 1000).toFixed(1),
            }),
          });
          setSingleUrl('');
        } else if (r.status === 'duplicate' && r.post_id) {
          setDuplicate({
            url: singleUrl.trim(),
            post_id: r.post_id,
            ...(r.prior_captured_at ? { prior_captured_at: r.prior_captured_at } : {}),
          });
        } else {
          toast(t('capture.toast.failed'), 'error', {
            description: r.error ?? '',
            durationMs: 10000,
          });
        }
      } else {
        // Save before any state changes so we can restore the exact paste.
        localStorage.setItem('nusuk.lastBatchText', batchText);
        setLastBatchText(batchText);
        const r = await api.batchCapture({ urls: batchUrls, origin });
        setBatchResult(r);
        const dups: DuplicateRow[] = r.results
          .filter((x) => x.status === 'duplicate')
          .map((x) => {
            const row: DuplicateRow = { url: x.url };
            if (x.post_id) row.post_id = x.post_id;
            if (x.prior_captured_at) row.prior_captured_at = x.prior_captured_at;
            return row;
          });
        setBatchDuplicates(dups);
        toast(
          t('capture.toast.batch_done', {
            captured: r.summary.captured,
            dup: r.summary.duplicate,
            failed: r.summary.failed,
          }),
          r.summary.failed > 0 ? 'error' : 'success',
          { durationMs: 7000 },
        );
        if (dups.length === 0) setBatchText('');
      }
      void refreshRecent();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function recaptureSingle() {
    if (!duplicate) return;
    setRecapturing(true);
    try {
      const r = await api.capture({
        url: duplicate.url,
        origin,
        force_recapture: true,
      });
      if (r.status === 'captured') {
        toast(t('posts.toast.recaptured', { stage: r.stage ?? '' }), 'success');
      } else {
        toast(t('posts.toast.failed'), 'error');
      }
      setDuplicate(null);
      setSingleUrl('');
      void refreshRecent();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setRecapturing(false);
    }
  }

  async function recaptureBatch(urls: string[]) {
    if (urls.length === 0) return;
    setRecapturing(true);
    try {
      const r = await api.batchCapture({
        urls,
        origin,
        force_recapture_urls: urls,
      });
      toast(
        t('capture.toast.batch_done', {
          captured: r.summary.captured,
          dup: r.summary.duplicate,
          failed: r.summary.failed,
        }),
        r.summary.failed > 0 ? 'error' : 'success',
        { durationMs: 7000 },
      );
      setBatchDuplicates([]);
      setBatchText('');
      void refreshRecent();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setRecapturing(false);
    }
  }

  async function retryFailed() {
    if (!batchResult) return;
    const failedUrls = batchResult.results
      .filter((r) => r.status === 'failed')
      .map((r) => r.url);
    if (failedUrls.length === 0) return;
    setRecapturing(true);
    try {
      const r = await api.batchCapture({ urls: failedUrls, origin });
      toast(
        t('capture.toast.batch_done', {
          captured: r.summary.captured,
          dup: r.summary.duplicate,
          failed: r.summary.failed,
        }),
        r.summary.failed > 0 ? 'error' : 'success',
        { durationMs: 7000 },
      );
      setBatchResult(r);
      void refreshRecent();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setRecapturing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.capture')}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <ModePill mode={mode} onChange={setMode} />

        {mode === 'single' ? (
          <input
            value={singleUrl}
            onChange={(e) => setSingleUrl(e.target.value)}
            placeholder="https://twitter.com/..."
            dir="ltr"
            className="h-11 w-full rounded-lg border border-input bg-background px-4 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <div className="space-y-2">
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={t('capture.batch_placeholder')}
              rows={6}
              dir="ltr"
              className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{t('capture.url_hint')}</p>
                {lastBatchText && lastBatchText !== batchText && (
                  <button
                    type="button"
                    onClick={() => setBatchText(lastBatchText)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ClipboardPaste className="h-3 w-3" />
                    {t('capture.restore_last')}
                  </button>
                )}
              </div>
              <p
                className={'text-xs font-medium ' + (overLimit ? 'text-red-500' : 'text-primary')}
              >
                {t('capture.urls_detected', { n: batchUrls.length })}
                {overLimit ? ' · > 100' : ''}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('capture.category')}</p>
          <Switch<Origin>
            value={origin}
            onChange={setOrigin}
            options={[
              {
                value: 'individual',
                label: t('posts.edit.origin.individual'),
                icon: <User className="h-3.5 w-3.5" />,
              },
              {
                value: 'company',
                label: t('posts.edit.origin.company'),
                icon: <Building2 className="h-3.5 w-3.5" />,
              },
            ]}
          />
        </div>

        <Button size="lg" className="w-full rounded-xl" disabled={!canSubmit} onClick={submit}>
          <Camera className="h-5 w-5 me-2" />
          {submitting ? t('common.loading') : t('capture.capture_btn')}
        </Button>

        {duplicate && (
          <DuplicatePrompt
            dup={duplicate}
            onSkip={() => {
              setDuplicate(null);
              setSingleUrl('');
            }}
            onRecapture={recaptureSingle}
            recapturing={recapturing}
          />
        )}

        {batchResult && (
          <div className="rounded-lg border border-border bg-accent/30 p-4 text-sm space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {batchResult.summary.captured} {t('import.status.captured')}
              </span>
              <span className="flex items-center gap-1">
                <Copy className="h-4 w-4 text-amber-500" />
                {batchResult.summary.duplicate} {t('import.status.duplicate')}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                {batchResult.summary.failed} {t('import.status.failed')}
              </span>
              <span className="text-muted-foreground ms-auto">
                {(batchResult.duration_ms / 1000).toFixed(1)}s
              </span>
            </div>

            {batchResult.summary.failed > 0 && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-500">
                    {t('capture.batch.failed_header', { n: batchResult.summary.failed })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={recapturing}
                    onClick={retryFailed}
                  >
                    <RotateCw className={'h-3.5 w-3.5 me-1.5 ' + (recapturing ? 'animate-spin' : '')} />
                    {t('capture.batch.retry_failed')}
                  </Button>
                </div>
                <ul className="space-y-1 text-xs">
                  {batchResult.results
                    .filter((r) => r.status === 'failed')
                    .map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <XCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-muted-foreground" dir="ltr">
                            {r.url}
                          </p>
                          {r.error && (
                            <p className="text-[10px] text-red-500/80">{r.error}</p>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {batchDuplicates.length > 0 && (
          <BatchDuplicateReview
            duplicates={batchDuplicates}
            onRecaptureAll={recaptureBatch}
            onDismiss={() => {
              setBatchDuplicates([]);
              setBatchText('');
            }}
            recapturing={recapturing}
          />
        )}
      </div>

      <GrabFromX />

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">{t('capture.recent')}</p>
        <ul className="mt-4 divide-y divide-border">
          {recentPosts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-accent">
                {p.screenshot_url && (
                  <img src={p.screenshot_url} alt="" className="h-full w-full object-cover object-top" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.title_override ?? p.metadata?.text ?? p.url}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {(p.metadata?.author_handle ?? '—') + ' · ' + fmt.format(new Date(p.captured_at))}
                </p>
              </div>
              <div className="flex gap-1">
                {p.origin === 'company' && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                    {t('posts.origin.company')}
                  </span>
                )}
                {p.reviewed && (
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                    {t('posts.reviewed')}
                  </span>
                )}
              </div>
            </li>
          ))}
          {recentPosts.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {t('capture.recent_empty')}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
