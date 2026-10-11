import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';

/** Meta Business Suite › Billing › Payment settings — where a WhatsApp Business account's card is added or fixed. */
export const META_PAYMENT_SETTINGS_URL = 'https://business.facebook.com/billing_hub/payment_settings';

/**
 * Shown when Meta refuses a WhatsApp campaign for the account's payment method
 * (error 131042). Closing it in any way leaves the campaign form as it was, so
 * the user can fix the card and send again.
 */
export function MetaPaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  useEffect(() => {
    if (!open) return;
    // Capture phase, and stopped there: the campaign drawer underneath also
    // closes on Escape, and it has to stay open with the form as it was.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const goToMeta = (): void => {
    window.open(META_PAYMENT_SETTINGS_URL, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="meta-payment-title"
          aria-describedby="meta-payment-text"
        >
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-[420px] bg-white dark:bg-surface-dark rounded-[20px] shadow-xl px-6 sm:px-8 pt-8 pb-7 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 end-4 h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-5 h-[72px] w-[72px] rounded-full bg-[#FEF3C7] dark:bg-warning/15 text-[#B45309] dark:text-warning flex items-center justify-center text-[30px] font-light leading-none" aria-hidden>
              !
            </div>
            <h2 id="meta-payment-title" className="text-[20px] font-bold leading-snug mb-2">
              تأكد من صلاحية وسيلة الدفع في ميتا
            </h2>
            <p id="meta-payment-text" className="text-body text-muted-light dark:text-muted-dark leading-relaxed mb-7">
              تعذّر إرسال الحملة. أضف وسيلة دفع صالحة في حسابك على Meta ثم أعد المحاولة.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={goToMeta}
                autoFocus
                className="h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{ color: '#fff' }}
              >
                الانتقال لميتا
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="h-11 rounded-full border-2 border-primary text-primary dark:text-[#60A5FA] dark:border-[#60A5FA] text-small font-semibold hover:bg-primary/5 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
