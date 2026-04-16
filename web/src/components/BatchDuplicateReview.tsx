import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DuplicateRow {
  url: string;
  post_id?: string;
  prior_captured_at?: string;
}

interface Props {
  duplicates: DuplicateRow[];
  onRecaptureAll: (urls: string[]) => Promise<void>;
  onDismiss: () => void;
  recapturing?: boolean;
}

export function BatchDuplicateReview({
  duplicates,
  onRecaptureAll,
  onDismiss,
  recapturing = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(duplicates.map((d) => d.url)),
  );
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
  });

  if (duplicates.length === 0) return null;

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/40 bg-card shadow-lg">
      <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/15 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              {t('capture.duplicate.batch_header', { n: duplicates.length })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('capture.duplicate.batch_hint')}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
            aria-label={t('common.cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-accent/20">
          {duplicates.map((d) => (
            <li key={d.url} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(d.url)}
                onChange={() => toggle(d.url)}
                className="h-4 w-4 rounded accent-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-mono" dir="ltr">
                  {d.url}
                </p>
                {d.prior_captured_at && (
                  <p className="text-[10px] text-muted-foreground">
                    {t('capture.duplicate.captured_on', {
                      when: fmt.format(new Date(d.prior_captured_at)),
                    })}
                  </p>
                )}
              </div>
              {d.post_id && (
                <a
                  href={'/posts/' + d.post_id}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {t('capture.duplicate.view')}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground me-auto">
            {selected.size} / {duplicates.length} {t('capture.duplicate.selected')}
          </span>
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={recapturing}>
            {t('capture.duplicate.batch_skip_all')}
          </Button>
          <Button
            size="sm"
            disabled={recapturing || selected.size === 0}
            onClick={() => onRecaptureAll([...selected])}
          >
            <RotateCw className={'h-4 w-4 me-2 ' + (recapturing ? 'animate-spin' : '')} />
            {recapturing
              ? t('common.loading')
              : t('capture.duplicate.batch_recapture_selected', { n: selected.size })}
          </Button>
        </div>
      </div>
    </div>
  );
}
