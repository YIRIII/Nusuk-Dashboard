import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs: number;
}

interface ToastOptions {
  description?: string;
  durationMs?: number;
}

interface Ctx {
  toast: (title: string, kind?: ToastKind, opts?: ToastOptions) => void;
}

const ToastContext = createContext<Ctx | null>(null);

const DEFAULT_DURATION_MS = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback<Ctx['toast']>(
    (title, kind = 'info', opts = {}) => {
      const id = Date.now() + Math.random();
      const item: ToastItem = {
        id,
        kind,
        title,
        durationMs: opts.durationMs ?? DEFAULT_DURATION_MS,
        ...(opts.description ? { description: opts.description } : {}),
      };
      setItems((list) => [...list, item]);
      window.setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id));
      }, item.durationMs);
    },
    [],
  );

  const dismiss = (id: number) =>
    setItems((list) => list.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Positioned top-center so notifications land in the user's eye line. */}
      <div className="fixed top-20 inset-x-0 z-[60] flex flex-col items-center gap-3 px-4 pointer-events-none">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info;
            const borderKlass =
              t.kind === 'success'
                ? 'border-emerald-500/50'
                : t.kind === 'error'
                  ? 'border-red-500/50'
                  : 'border-primary/50';
            const iconKlass =
              t.kind === 'success'
                ? 'text-emerald-500'
                : t.kind === 'error'
                  ? 'text-red-500'
                  : 'text-primary';
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={
                  'pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-xl ' +
                  borderKlass
                }
              >
                <Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + iconKlass} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground break-words">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
