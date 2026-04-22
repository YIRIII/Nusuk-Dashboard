import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import {
  ArrowLeft,
  RotateCw,
  Download,
  Pencil,
  Trash2,
  CheckCircle2,
  User,
  Building2,
  ExternalLink,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { api, swrFetcher, type Post, type Company, type Origin } from '@/lib/api';
import { useCompanies } from '@/hooks/usePosts';

interface PostResponse {
  post: Post;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

export function PostDetailPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, mutate, isLoading, error } = useSWR<PostResponse>(
    id ? '/api/posts/' + id : null,
    swrFetcher,
    { revalidateOnFocus: false },
  );
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.rows ?? [];

  const post = data?.post ?? null;

  const [editing, setEditing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [origin, setOrigin] = useState<Origin>('individual');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [postedAt, setPostedAt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!post) return;
    setReviewed(post.reviewed);
    setOrigin(post.origin);
    setCompanyId(post.company_id);
    setTitleOverride(post.title_override ?? '');
    setNotes(post.notes ?? '');
    setPostedAt(toLocalInput(post.posted_at ?? post.metadata?.posted_at ?? null));
  }, [post]);

  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (isLoading)
    return <p className="p-6 text-sm text-muted-foreground">{t('common.loading')}</p>;
  if (error || !post)
    return (
      <div className="p-6 text-sm text-red-500">
        {t('common.error')}: {(error as Error | undefined)?.message ?? 'not found'}
      </div>
    );

  const meta = post.metadata ?? {};
  const company = post.company_id ? companies.find((c) => c.id === post.company_id) : null;

  async function save() {
    if (!post) return;
    setBusy(true);
    try {
      await api.patchPost(post.id, {
        reviewed,
        origin,
        company_id: origin === 'company' ? companyId : null,
        title_override: titleOverride.trim() ? titleOverride.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        ...(postedAt ? { posted_at: new Date(postedAt).toISOString() } : {}),
      });
      toast(t('posts.toast.saved'), 'success');
      setEditing(false);
      void mutate();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function recapture() {
    if (!post) return;
    setBusy(true);
    try {
      await api.deletePost(post.id);
      const r = await api.capture({
        url: post.url,
        origin: post.origin,
        company_id: post.company_id,
      });
      if (r.status === 'captured') {
        toast(t('posts.toast.recaptured', { stage: r.stage ?? '' }), 'success');
        // The delete+re-insert creates a new post_id. Navigate to the new post.
        if (r.post_id) navigate('/posts/' + r.post_id);
        else navigate('/posts');
      } else {
        toast(t('posts.toast.failed'), 'error');
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!post) return;
    if (!confirm(t('posts.confirm_delete'))) return;
    setBusy(true);
    try {
      await api.deletePost(post.id);
      toast(t('posts.toast.deleted'), 'success');
      navigate('/posts');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/posts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('post_detail.back')}
        </Link>
        <h1 className="text-xl font-bold ms-4">{t('post_detail.title')}</h1>

        <div className="flex flex-wrap items-center gap-2 ms-auto">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={recapture} disabled={busy}>
              <RotateCw className={'h-4 w-4 me-2 ' + (busy ? 'animate-spin' : '')} />
              {t('common.recapture')}
            </Button>
          )}
          {post.screenshot_url && (
            <a
              href={post.screenshot_url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4 me-2" />
              {t('post_detail.download')}
            </a>
          )}
          {isAdmin && !editing && (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 me-2" />
              {t('common.edit')}
            </Button>
          )}
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={del} disabled={busy}>
              <Trash2 className="h-4 w-4 me-2" />
              {t('posts.action.delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {post.screenshot_url ? (
              <a href={post.screenshot_url} target="_blank" rel="noreferrer">
                <img src={post.screenshot_url} alt="" className="w-full" />
              </a>
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center text-sm text-muted-foreground">
                {t('posts.edit.no_screenshot')}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {(meta.author_name ?? meta.author_handle ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{meta.author_name ?? t('posts.unknown_author')}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {meta.author_handle ?? '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {t('posts.kind.' + post.kind)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium">
                {post.origin === 'company' ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {t('posts.origin.' + post.origin)}
              </span>
              {post.reviewed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('posts.reviewed')}
                </span>
              )}
            </div>

            {meta.text && (
              <p className="whitespace-pre-wrap text-sm leading-7">{post.title_override ?? meta.text}</p>
            )}

            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              dir="ltr"
            >
              <ExternalLink className="h-3 w-3" />
              {post.url}
            </a>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> {t('post_detail.published')}
              </span>
              <span className="font-medium">
                {post.posted_at || meta.posted_at
                  ? fmt.format(new Date(post.posted_at ?? meta.posted_at ?? ''))
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> {t('post_detail.captured')}
              </span>
              <span className="font-medium">{fmt.format(new Date(post.captured_at))}</span>
            </div>
            {company && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('posts.edit.company')}</span>
                <span className="font-medium">
                  {i18n.language === 'ar' ? company.name_ar : company.name_en}
                </span>
              </div>
            )}
            {post.notes && (
              <div>
                <p className="text-xs text-muted-foreground">{t('posts.edit.notes')}</p>
                <p className="mt-1 whitespace-pre-wrap">{post.notes}</p>
              </div>
            )}
          </div>

          {editing && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('common.edit')}
              </p>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                  className="h-5 w-5 rounded-md accent-primary"
                />
                <span className="text-sm font-medium">{t('posts.edit.reviewed')}</span>
              </label>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('posts.edit.origin')}</p>
                <Switch<Origin>
                  value={origin}
                  onChange={(v) => {
                    setOrigin(v);
                    if (v === 'individual') setCompanyId(null);
                  }}
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

              {origin === 'company' && (
                <select
                  value={companyId ?? ''}
                  onChange={(e) => setCompanyId(e.target.value || null)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t('posts.edit.company_placeholder')}</option>
                  {companies.map((c: Company) => (
                    <option key={c.id} value={c.id}>
                      {(i18n.language === 'ar' ? c.name_ar : c.name_en) +
                        (c.handle ? ' · ' + c.handle : '')}
                    </option>
                  ))}
                </select>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('posts.edit.posted_at')}</p>
                <input
                  type="datetime-local"
                  value={postedAt}
                  onChange={(e) => setPostedAt(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('posts.edit.title_override')}
                </p>
                <textarea
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('posts.edit.notes')}</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={save} disabled={busy}>
                  {busy ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
