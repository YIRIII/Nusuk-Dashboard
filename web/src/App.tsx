import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
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

function AnimatedRoutes() {
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
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/recently-deleted" element={<RecentlyDeletedPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/reports/weekly" element={<ReportWeeklyPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full print:h-auto print:overflow-visible">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6 relative print:overflow-visible print:h-auto">
              <AnimatedRoutes />
            </main>
          </div>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
