import { useState } from 'react';
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
  const [hovered, setHovered] = useState<number | null>(null);

  // A single cycle is just the thread itself — nothing to index.
  if (sessions.length < 2) return null;

  const total = sessions.reduce((sum, s) => sum + s.messageCount, 0);

  return (
    <div
      className="relative shrink-0 w-9 py-6 flex flex-col gap-1 items-center bg-white dark:bg-surface-dark"
      role="navigation"
      aria-label="فهرس دورات المحادثة"
    >
      {sessions.map((s) => {
        const isActive = s.index === activeIndex;
        const isHovered = hovered === s.index;
        return (
          <button
            key={s.index}
            type="button"
            onClick={() => onJump(s)}
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.index)}
            onBlur={() => setHovered(null)}
            style={{ flexGrow: Math.max(s.messageCount / total, 0.05) }}
            className={cn(
              'relative w-1.5 min-h-[20px] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isActive ? 'bg-primary' : isHovered ? 'bg-primary/60' : 'bg-primary/25',
              s.inferred && !isActive && 'bg-primary/15 outline-dashed outline-1 outline-offset-1 outline-primary/40',
            )}
            aria-label={`الدورة ${s.index} — ${formatSessionDate(s.startedAt)}`}
            aria-current={isActive ? 'true' : undefined}
          >
            {isHovered && (
              <span className="absolute end-full top-1/2 -translate-y-1/2 me-2 z-30 pointer-events-none whitespace-nowrap rounded-card bg-surface-dark dark:bg-white px-3 py-2 text-start shadow-card-hover">
                <span className="block text-[11px] font-semibold text-white dark:text-surface-dark">
                  {formatSessionDate(s.startedAt)}
                </span>
                <span className="block text-[10px] text-white/70 dark:text-surface-dark/70">
                  {s.messageCount} رسالة
                  {s.endedAt === null && ' · مفتوحة الآن'}
                  {s.inferred && ' · بداية تقديرية'}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
