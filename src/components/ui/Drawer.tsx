import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'start' | 'end';
  width?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'start',
  width = 'w-[420px]',
}: DrawerProps): JSX.Element {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className={cn(
              'fixed top-0 bottom-0 z-50 bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark flex flex-col max-w-full',
              width,
              side === 'start'
                ? 'start-0 border-e'
                : 'end-0 border-s'
            )}
            initial={{ x: side === 'start' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'start' ? '100%' : '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
              <h3 className="text-h3 font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="text-muted-light dark:text-muted-dark hover:text-current p-1 rounded-btn hover:bg-bg-light dark:hover:bg-bg-dark"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
