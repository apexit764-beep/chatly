import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';

const iconMap = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  info: <Info className="h-5 w-5 text-info" />,
};

const borderMap = {
  success: 'border-success/40',
  error: 'border-danger/40',
  info: 'border-info/40',
};

export function Toast(): JSX.Element {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className={cn(
            'fixed bottom-6 start-6 z-[100] bg-surface-light dark:bg-surface-dark border-2 shadow-xl rounded-card px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[90vw]',
            borderMap[toast.type]
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={hideToast}
        >
          {iconMap[toast.type]}
          <span className="text-body font-medium">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
