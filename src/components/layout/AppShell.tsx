import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconSidebar } from './IconSidebar';
import { SectionSidebar } from './SectionSidebar';
import { TopHeader } from './TopHeader';
import { NotificationsPanel } from './NotificationsPanel';
import { OnboardingModal } from '@components/onboarding/OnboardingModal';
import { Toast } from '@components/ui';

export function AppShell(): JSX.Element {
  const location = useLocation();
  const isInbox = location.pathname.startsWith('/inbox');
  return (
    <div className="flex min-h-screen bg-bg-light dark:bg-bg-dark text-[14px] text-[#111827] dark:text-[#F1F5F9]">
      <IconSidebar />
      <SectionSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className={isInbox ? 'flex-1 overflow-hidden min-h-0' : 'flex-1 overflow-x-hidden'}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <NotificationsPanel />
      <OnboardingModal />
      <Toast />
    </div>
  );
}
