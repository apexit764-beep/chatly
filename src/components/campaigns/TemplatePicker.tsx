import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CampaignTemplate } from '@/types';
import { TemplateStatusBadge } from './TemplateStatusBadge';
import { cn } from '@/utils/cn';

/**
 * The campaign form's template list. Only templates a campaign can send are
 * offered: approved WhatsApp templates, or any Gmail template.
 */
export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: CampaignTemplate[];
  value: string | null;
  onChange: (t: CampaignTemplate) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = templates.find((t) => t.id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full h-10 ps-3 pe-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body flex items-center gap-2 text-start transition-colors',
          open ? 'border-primary' : 'border-transparent',
        )}
      >
        <span className={cn('flex-1 truncate', !selected && 'text-muted-light dark:text-muted-dark')}>
          {selected ? selected.name : 'اختر قالبًا'}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-light dark:text-muted-dark transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-card-hover py-1">
          {templates.length === 0 ? (
            <li className="px-3 py-3 text-small text-muted-light dark:text-muted-dark">لا توجد قوالب جاهزة للاستخدام بعد</li>
          ) : (
            templates.map((t) => (
              <li key={t.id} role="option" aria-selected={t.id === value}>
                <button
                  type="button"
                  onClick={() => { onChange(t); setOpen(false); }}
                  className={cn('w-full px-3 h-11 flex items-center gap-2 text-start hover:bg-bg-light dark:hover:bg-bg-dark', t.id === value && 'bg-primary/5')}
                >
                  <span className="flex-1 truncate text-body">{t.name}</span>
                  {t.id === value && <Check className="h-4 w-4 text-primary" />}
                  {t.channel === 'whatsapp' && t.status && <TemplateStatusBadge status={t.status} />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
