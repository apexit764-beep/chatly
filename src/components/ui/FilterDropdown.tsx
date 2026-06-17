import { useState, useRef, useEffect, ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional leading element (avatar, icon, color dot) */
  leading?: ReactNode;
  /** Optional badge (count, etc.) */
  badge?: string | number;
}

interface FilterDropdownProps<T extends string = string> {
  label: string;
  value: T;
  /** "all" or empty-string sentinel that means "no filter" — shown with the label only */
  noFilterValue?: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  /** Optional searchable input inside popover */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Show clear button when filter is active */
  clearable?: boolean;
  className?: string;
  align?: 'start' | 'end';
}

/**
 * Unified filter trigger component (shadcn-style).
 *
 * Looks like a small outline button with a chevron. Opens a popover with the options.
 * When a filter is active, shows the selected value next to the label.
 */
export function FilterDropdown<T extends string = string>({
  label,
  value,
  noFilterValue,
  options,
  onChange,
  searchable,
  searchPlaceholder = 'ابحث...',
  clearable = true,
  className,
  align = 'end',
}: FilterDropdownProps<T>): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on click outside (overlay handles this) and on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = noFilterValue !== undefined ? value !== noFilterValue : !!value;
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter(
    (o) => !query || o.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (val: T): void => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (noFilterValue !== undefined) onChange(noFilterValue);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-8 ps-3 pe-2 rounded-md border text-[12px] font-medium flex items-center gap-1.5 transition-colors',
          isActive
            ? 'border-primary/40 bg-primary/5 text-current hover:bg-primary/10'
            : 'border-border-light dark:border-border-dark text-current hover:bg-bg-light dark:hover:bg-bg-dark'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={isActive ? 'text-muted-light dark:text-muted-dark' : ''}>{label}</span>
        {isActive && selected && (
          <>
            <span className="text-border-light dark:text-border-dark">|</span>
            <span className="flex items-center gap-1 max-w-[140px] truncate">
              {selected.leading}
              <span className="truncate font-semibold">{selected.label}</span>
            </span>
            {clearable && noFilterValue !== undefined && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent); }}
                className="h-4 w-4 ms-0.5 rounded-full hover:bg-danger/15 hover:text-danger flex items-center justify-center cursor-pointer"
                aria-label={'مسح فلتر ' + label}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180', !isActive && 'opacity-60')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery(''); }} />
          <div
            role="listbox"
            className={cn(
              'absolute mt-1 w-56 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md shadow-card-hover z-20 overflow-hidden',
              align === 'start' ? 'start-0' : 'end-0'
            )}
          >
            {searchable && (
              <div className="p-1.5 border-b border-border-light dark:border-border-dark">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-7 px-2 rounded-sm bg-bg-light dark:bg-bg-dark border border-transparent text-[12px] focus:outline-none focus:border-primary"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-muted-light dark:text-muted-dark text-center">لا نتائج</p>
              ) : (
                filtered.map((o) => {
                  const isSelected = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(o.value)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
                        isSelected && 'font-semibold'
                      )}
                    >
                      {o.leading && <span className="flex-shrink-0 flex items-center">{o.leading}</span>}
                      <span className="flex-1 truncate">{o.label}</span>
                      {typeof o.badge !== 'undefined' && (
                        <span className="text-[10px] tabular-nums text-muted-light dark:text-muted-dark">
                          {o.badge}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
