import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  /** When true, shows only OK button (no cancel) */
  alertOnly?: boolean;
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: Omit<ConfirmOptions, 'alertOnly'>) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const variantStyle: Record<ConfirmVariant, { bg: string; ring: string; text: string; icon: JSX.Element; btn: string }> = {
  danger: {
    bg: 'bg-danger/10',
    ring: 'ring-danger/30',
    text: 'text-danger',
    icon: <AlertTriangle className="h-6 w-6" />,
    btn: 'bg-danger hover:bg-danger/90 text-white',
  },
  warning: {
    bg: 'bg-warning/10',
    ring: 'ring-warning/30',
    text: 'text-warning',
    icon: <AlertTriangle className="h-6 w-6" />,
    btn: 'bg-warning hover:bg-warning/90 text-white',
  },
  info: {
    bg: 'bg-primary/10',
    ring: 'ring-primary/30',
    text: 'text-primary',
    icon: <Info className="h-6 w-6" />,
    btn: 'bg-primary hover:bg-primary-dark text-white',
  },
  success: {
    bg: 'bg-success/10',
    ring: 'ring-success/30',
    text: 'text-success',
    icon: <CheckCircle2 className="h-6 w-6" />,
    btn: 'bg-success hover:bg-success/90 text-white',
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  const close = useCallback((value: boolean) => {
    setOpen(false);
    if (resolver) resolver(value);
    setTimeout(() => {
      setOpts(null);
      setResolver(null);
    }, 200);
  }, [resolver]);

  const confirm = useCallback((newOpts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOpts(newOpts);
      setResolver(() => resolve);
      setOpen(true);
    });
  }, []);

  const alert = useCallback((newOpts: Omit<ConfirmOptions, 'alertOnly'>): Promise<void> => {
    return confirm({ ...newOpts, alertOnly: true }).then(() => undefined);
  }, [confirm]);

  const variant = opts?.variant ?? 'danger';
  const style = variantStyle[variant];

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <AnimatePresence>
        {open && opts && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => opts.alertOnly && close(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-md bg-white dark:bg-surface-dark rounded-card shadow-xl border border-border-light dark:border-border-dark overflow-hidden"
            >
              <button
                onClick={() => close(false)}
                className="absolute top-3 end-3 h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center z-10"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="p-6">
                <div className={cn('h-12 w-12 rounded-full flex items-center justify-center mb-4', style.bg, style.text)}>
                  {style.icon}
                </div>
                <h3 id="confirm-title" className="text-h3 font-bold mb-1.5">{opts.title}</h3>
                {opts.message && (
                  <div className="text-body text-muted-light dark:text-muted-dark">
                    {opts.message}
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex items-center justify-end gap-2">
                {!opts.alertOnly && (
                  <button
                    onClick={() => close(false)}
                    className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                  >
                    {opts.cancelText ?? 'إلغاء'}
                  </button>
                )}
                <button
                  onClick={() => close(true)}
                  autoFocus
                  className={cn('h-10 px-5 rounded-full text-small font-semibold transition-colors', style.btn)}
                >
                  {opts.confirmText ?? (opts.alertOnly ? 'حسناً' : 'تأكيد')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback: native confirm — should never happen if provider is mounted
    return {
      confirm: (o) => Promise.resolve(window.confirm(o.title)),
      alert: (o) => { window.alert(o.title); return Promise.resolve(); },
    };
  }
  return ctx;
}
