import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Building2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { api, type Post, type Origin, type CompanyCategory } from '@/lib/api';

interface Props {
  post: Post | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function QuickEditDialog({ post, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [titleOverride, setTitleOverride] = useState('');
  const [origin, setOrigin] = useState<Origin>('individual');
  const [category, setCategory] = useState<CompanyCategory | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!post) return;
    setTitleOverride(post.title_override ?? '');
    setOrigin(post.origin);
    setCategory(post.company_category);
    setNotes(post.notes ?? '');
  }, [post]);

  if (!post) return null;

  const meta = post.metadata ?? {};
  const authorHandle = (meta.author_handle as string | null | undefined) ?? '';

  async function save() {
    if (!post) return;
    setSaving(true);
    try {
      const result = await api.patchPost(post.id, {
        origin,
        company_category: origin === 'company' ? category : null,
        title_override: titleOverride.trim() ? titleOverride.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      const propagated = (result as unknown as { propagated?: number }).propagated ?? 0;
      toast(
        propagated > 0
          ? t('quick_edit.toast.saved_with_propagate', { n: propagated })
          : t('posts.toast.saved'),
        'success',
      );
      onSaved?.();
      onClose();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!post}
      onClose={onClose}
      title={t('common.edit')}
      className="max-w-md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('quick_edit.display_name')}>
          <input
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder={(meta.text as string | null | undefined) ?? ''}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field label={t('quick_edit.poster_name')}>
          <input
            value={authorHandle}
            readOnly
            dir="ltr"
            className="h-10 w-full rounded-lg border border-input bg-accent/40 px-3 text-sm text-muted-foreground"
          />
        </Field>

        <Field label={t('capture.category')}>
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
        </Field>

        {origin === 'company' && (
          <Field label={t('posts.filter_label.category')}>
            <div className="flex flex-wrap gap-2">
              {(['inner', 'outer', 'general', 'other'] as const).map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(active ? null : c)}
                    className={
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                      (active
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent hover:text-foreground')
                    }
                  >
                    {t('posts.category.' + c)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('quick_edit.category_hint')}
            </p>
          </Field>
        )}

        <Field label={t('posts.edit.notes')}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('quick_edit.notes_placeholder')}
            rows={3}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
