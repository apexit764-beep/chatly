import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconSidebar } from './IconSidebar';
import { SectionSidebar } from './SectionSidebar';
import { TopHeader } from './TopHeader';
import { OnboardingModal } from '@components/onboarding/OnboardingModal';
import { Toast } from '@components/ui';
import { SupportChat } from '@components/support/SupportChat';
import { SubscriptionExpiredModal } from '@components/billing/SubscriptionExpiredModal';
import { TrialExpiredModal } from '@components/billing/TrialExpiredModal';
import { TrialBanner } from '@components/billing/TrialBanner';
import { useUIStore } from '@/store/useUIStore';
import { useLiveSimulator } from '@/hooks/useLiveSimulator';
import { useAutoClose } from '@/hooks/useAutoClose';
import { getAppMode } from '@/utils/mode';
import { Footer } from './Footer';

export function AppShell(): JSX.Element {
  const location = useLocation();
  const isInbox = location.pathname.startsWith('/inbox');
  const inboxFocus = useUIStore((s) => s.inboxFocus);
  // Focus mode only applies on the inbox page
  const focused = isInbox && inboxFocus;
  // Drives live activity (new messages, notifications, AI replies)
  useLiveSimulator();
  // Closes idle conversations on each account's own auto-close period
  useAutoClose();
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-light dark:bg-bg-dark text-[14px] text-[#111827] dark:text-[#F1F5F9]">
      <div className="flex flex-1 min-h-0">
        {!focused && <IconSidebar />}
        {!focused && <SectionSidebar />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!focused && <TopHeader />}
          <main className={isInbox ? 'flex-1 overflow-hidden min-h-0 flex flex-col' : 'flex-1 overflow-y-auto overflow-x-hidden'}>
            {/* داخل المحتوى أعلى عنوان الصفحة، خارج انتقال الصفحات فلا يومض
                مع كل تنقّل. هامشه بحشو الصفحات نفسه، وحشو الصفحة العلويّ هو
                الفاصل بينه وبين العنوان. */}
            {getAppMode() === 'client' && <TrialBanner className={isInbox ? 'px-2 pt-2' : 'px-4 lg:px-6 pt-4 lg:pt-6'} />}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className={isInbox ? 'flex-1 min-h-0' : 'h-full'}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          {!isInbox && getAppMode() === 'client' && <Footer />}
        </div>
      </div>
      <OnboardingModal />
      <Toast />
      {getAppMode() === 'client' && !isInbox && <SupportChat />}
      {getAppMode() === 'client' && <SubscriptionExpiredModal />}
      {getAppMode() === 'client' && <TrialExpiredModal />}
    </div>
  );
}
