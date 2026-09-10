import { useRef, useState } from 'react';
import type { ConversationSession } from '@/types';
import { cn } from '@/utils/cn';

/** "اليوم · 10 سبتمبر 2026" — weekday for anything older than yesterday. */
export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  const full = d.toLocaleDateString('ar-OM-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  if (diffDays === 0) return `اليوم · ${full}`;
  if (diffDays === 1) return `أمس · ${full}`;
  return `${d.toLocaleDateString('ar-OM-u-nu-latn', { weekday: 'long' })} · ${full}`;
}

interface SessionRailProps {
  sessions: ConversationSession[];
  activeIndex: number;
  onJump: (session: ConversationSession) => void;
}

export default function SessionRail({ sessions, activeIndex, onJump }: SessionRailProps): JSX.Element | null {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; y: number } | null>(null);

  // A single cycle is just the thread itself — nothing to index.
  if (sessions.length < 2) return null;

  const open = (el: HTMLElement, index: number): void => {
    const root = rootRef.current;
    if (!root) return;
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    setHover({ index, y: a.top - b.top + a.height / 2 });
  };

  const hoveredSession = hover ? sessions.find((s) => s.index === hover.index) : undefined;

  return (
    <div
      ref={rootRef}
      className="absolute inset-y-0 end-2 w-8 z-20 flex flex-col items-end justify-center opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
      role="navigation"
      aria-label="فهرس دورات المحادثة"
    >
      {/* compact ruler centred on the edge: a short spine carrying one tick per cycle */}
      <div className="relative flex flex-col items-end gap-2 py-2 max-h-full overflow-y-auto scrollbar-thin">
        <span aria-hidden className="absolute inset-y-0 end-0 w-px bg-border-light dark:bg-border-dark" />
        {sessions.map((s) => {
          const lit = s.index === activeIndex || hover?.index === s.index;
          return (
            <button
              key={s.index}
              type="button"
              onClick={() => onJump(s)}
              onMouseEnter={(e) => open(e.currentTarget, s.index)}
              onMouseLeave={() => setHover(null)}
              onFocus={(e) => open(e.currentTarget, s.index)}
              onBlur={() => setHover(null)}
              className="relative shrink-0 h-4 w-8 flex items-center justify-end focus:outline-none"
              aria-label={`الدورة ${s.index} — ${formatSessionDate(s.startedAt)}`}
              aria-current={s.index === activeIndex ? 'true' : undefined}
            >
              <span
                className={cn(
                  'block transition-all duration-150',
                  lit ? 'w-5' : 'w-3',
                  s.inferred
                    ? cn('border-t border-dashed', lit ? 'border-primary' : 'border-primary/70')
                    : cn('rounded-full', lit ? 'h-0.5 bg-primary' : 'h-px bg-primary/70'),
                )}
              />
            </button>
          );
        })}
      </div>

      {/* kept outside the scrolling group, which would otherwise clip it */}
      {hoveredSession && hover && (
        <span
          style={{ top: hover.y }}
          className="absolute end-full -translate-y-1/2 me-1 z-30 pointer-events-none whitespace-nowrap rounded-card bg-surface-dark dark:bg-white px-3 py-2 text-start shadow-card-hover"
        >
          <span className="block text-[11px] font-semibold text-white dark:text-surface-dark">
            {formatSessionDate(hoveredSession.startedAt)}
          </span>
          <span className="block text-[10px] text-white/70 dark:text-surface-dark/70">
            {hoveredSession.messageCount} رسالة
            {hoveredSession.endedAt === null && ' · مفتوحة الآن'}
            {hoveredSession.inferred && ' · بداية تقديرية'}
          </span>
        </span>
      )}
    </div>
  );
}
