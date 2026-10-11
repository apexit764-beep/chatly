import { Fragment, ReactNode } from 'react';
import { ArrowUpRight, Copy, List, Phone } from 'lucide-react';
import type { TemplateButton } from '@/types';
import { cn } from '@/utils/cn';

/** Variables such as {{1}} are filled per customer at send time; the preview marks them. */
function withVariables(text: string): ReactNode {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <span key={i} className="inline-block rounded px-1 mx-0.5 text-[0.9em] bg-[#FEF3C7] text-[#92400E] dark:bg-warning/20 dark:text-warning" dir="ltr">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function ButtonRow({ button }: { button: Pick<TemplateButton, 'type' | 'text'> & { all?: boolean } }): JSX.Element {
  const icon =
    button.all ? <List className="h-4 w-4" />
    : button.type === 'url' ? <ArrowUpRight className="h-4 w-4" />
    : button.type === 'phone' ? <Phone className="h-4 w-4" />
    : button.type === 'copy_code' ? <Copy className="h-4 w-4" />
    : null;
  return (
    <div className="h-11 px-3 border-t border-[#E9EDEF] dark:border-white/10 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-[#0B84E8] dark:text-[#53BDEB]">
      <span className="truncate">{button.text || 'نص الزر'}</span>
      {icon}
    </div>
  );
}

/**
 * A WhatsApp chat bubble showing a template the way the customer receives it:
 * the body, then its buttons. Like WhatsApp, more than three buttons collapse to
 * the first two and «عرض كل الخيارات».
 */
export function WhatsAppTemplatePreview({
  message,
  buttons = [],
  className,
}: {
  message: string;
  buttons?: TemplateButton[];
  className?: string;
}): JSX.Element {
  const shown = buttons.length > 3 ? buttons.slice(0, 2) : buttons;
  const time = new Date().toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={cn('rounded-[18px] bg-[#EAE6DF] dark:bg-[#0B141A] p-4', className)}>
      <div className="max-w-[300px] rounded-[12px] rounded-ss-[4px] bg-white dark:bg-[#202C33] shadow-[0_1px_1px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-3 pt-2.5 pb-1.5">
          {message.trim() ? (
            <p className="text-[14.5px] leading-[1.7] whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF]">
              {withVariables(message)}
            </p>
          ) : (
            <p className="text-[14px] leading-[1.7] text-[#8696A0]">نص الرسالة يظهر هنا</p>
          )}
          <p className="text-[11px] text-[#667781] dark:text-[#8696A0] text-end mt-0.5" dir="rtl">{time}</p>
        </div>
        {shown.map((b, i) => (
          <ButtonRow key={i} button={b} />
        ))}
        {buttons.length > 3 && <ButtonRow button={{ type: 'quick_reply', text: 'عرض كل الخيارات', all: true }} />}
      </div>
    </div>
  );
}
