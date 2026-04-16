import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Camera,
  FileText,
  Trash2,
  Activity,
  FolderArchive,
  Moon,
  Sun,
  Languages,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { setLocale } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

interface NavItem {
  to: string;
  key: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/capture', key: 'nav.capture', icon: Camera },
  { to: '/posts', key: 'nav.posts', icon: FileText },
  { to: '/recently-deleted', key: 'nav.recently_deleted', icon: Trash2 },
  { to: '/monitor', key: 'nav.monitor', icon: Activity },
  { to: '/backup', key: 'nav.backup', icon: FolderArchive },
];

const USER_EMAIL = 'hmztgr@gmail.com';

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const current = i18n.language as 'ar' | 'en';

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
          ن
        </div>
        <div>
          <p className="text-sm font-semibold">{t('app.title')}</p>
          <p className="text-xs text-muted-foreground">v2</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute start-0 top-2 bottom-2 w-1 rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4" />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center gap-2 px-2 py-2 text-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
            {USER_EMAIL.slice(0, 1).toUpperCase()}
          </div>
          <span className="truncate text-muted-foreground" dir="ltr">
            {USER_EMAIL}
          </span>
        </div>

        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === 'dark' ? t('theme.light') : t('theme.dark')}</span>
        </button>

        <button
          onClick={() => setLocale(current === 'ar' ? 'en' : 'ar')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Languages className="h-4 w-4" />
          <span>{current === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        <button
          disabled
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
          title="Stub — Cloudflare Access handles auth"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
