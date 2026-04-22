import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ToastProvider } from '@/components/ui/toast';
import { DashboardPage } from '@/pages/Dashboard';
import { CapturePage } from '@/pages/Capture';
import { PostsPage } from '@/pages/Posts';
import { PostDetailPage } from '@/pages/PostDetail';
import { RecentlyDeletedPage } from '@/pages/RecentlyDeleted';
import { MonitorPage } from '@/pages/Monitor';
import { BackupPage } from '@/pages/Backup';
import { ReportWeeklyPage } from '@/pages/ReportWeekly';
import { LoginPage } from '@/pages/Login';
import { useAuth } from '@/hooks/useAuth';

function AdminRoute({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AnimatedRoutes({ isAdmin }: { isAdmin: boolean }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, position: 'absolute' }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/reports/weekly" element={<ReportWeeklyPage />} />
          <Route path="/capture" element={<AdminRoute isAdmin={isAdmin}><CapturePage /></AdminRoute>} />
          <Route path="/recently-deleted" element={<AdminRoute isAdmin={isAdmin}><RecentlyDeletedPage /></AdminRoute>} />
          <Route path="/monitor" element={<AdminRoute isAdmin={isAdmin}><MonitorPage /></AdminRoute>} />
          <Route path="/backup" element={<AdminRoute isAdmin={isAdmin}><BackupPage /></AdminRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  const { isAdmin, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={
            isAdmin ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />
          } />
          <Route path="*" element={
            <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible bg-background text-foreground">
              <Sidebar isAdmin={isAdmin} onLogout={logout} />
              <div className="flex-1 flex flex-col min-w-0 h-full print:h-auto print:overflow-visible">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-3 pt-14 md:p-6 md:pt-6 relative print:overflow-visible print:h-auto">
                  <AnimatedRoutes isAdmin={isAdmin} />
                </main>
              </div>
            </div>
          } />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
