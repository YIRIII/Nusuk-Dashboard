import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Camera,
  FileText,
  Trash2,
  Activity,
  FolderArchive,
  FileBarChart2,
  Moon,
  Sun,
  Languages,
  LogOut,
  LogIn,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { setLocale } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

interface NavItem {
  to: string;
  key: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/capture', key: 'nav.capture', icon: Camera, admin: true },
  { to: '/posts', key: 'nav.posts', icon: FileText },
  { to: '/reports/weekly', key: 'nav.report_weekly', icon: FileBarChart2 },
  { to: '/recently-deleted', key: 'nav.recently_deleted', icon: Trash2, admin: true },
  { to: '/monitor', key: 'nav.monitor', icon: Activity, admin: true },
  { to: '/backup', key: 'nav.backup', icon: FolderArchive, admin: true },
];

interface SidebarProps {
  isAdmin: boolean;
  onLogout: () => void;
}

export function Sidebar({ isAdmin, onLogout }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const current = i18n.language as 'ar' | 'en';
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const visibleNav = NAV.filter((item) => !item.admin || isAdmin);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 start-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border shadow-md text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={cn(
        "flex h-full w-64 shrink-0 flex-col border-e border-border bg-sidebar text-sidebar-foreground",
        "fixed inset-y-0 start-0 z-50 transition-transform duration-200 md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <p className="text-sm font-semibold">Nusuk Social</p>
          <button onClick={() => setOpen(false)} className="md:hidden text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, key, icon: Icon, end }) => (
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

          {isAdmin ? (
            <button
              onClick={() => { onLogout(); navigate('/'); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('auth.logout')}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogIn className="h-4 w-4" />
              <span>{t('auth.login')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
