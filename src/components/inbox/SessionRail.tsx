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
  /** Each session's start as a 0..1 fraction of the thread's scroll height. */
  offsets: number[];
  activeIndex: number;
  onJump: (session: ConversationSession) => void;
}

export default function SessionRail({ sessions, offsets, activeIndex, onJump }: SessionRailProps): JSX.Element | null {
  const [hovered, setHovered] = useState<number | null>(null);

  // A single cycle is just the thread itself — nothing to index.
  if (sessions.length < 2) return null;

  // Before the first measurement, fall back to an even spread.
  const positionOf = (i: number): number =>
    offsets.length === sessions.length ? offsets[i] : i / (sessions.length - 1 || 1);

  return (
    <div
      className="absolute inset-y-0 end-2 w-8 z-20 opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
      role="navigation"
      aria-label="فهرس دورات المحادثة"
    >
      {/* the ruler's spine — ticks share its exact span so they map to real scroll positions */}
      <span aria-hidden className="absolute inset-y-4 end-0 w-px bg-border-light dark:bg-border-dark" />

      <div className="absolute inset-y-4 end-0 w-8">
      {sessions.map((s, i) => {
        const isActive = s.index === activeIndex;
        const isHovered = hovered === s.index;
        const lit = isActive || isHovered;
        return (
          <button
            key={s.index}
            type="button"
            onClick={() => onJump(s)}
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.index)}
            onBlur={() => setHovered(null)}
            style={{ top: `${positionOf(i) * 100}%` }}
            className="absolute end-0 h-5 w-8 -translate-y-1/2 flex items-center justify-end focus:outline-none"
            aria-label={`الدورة ${s.index} — ${formatSessionDate(s.startedAt)}`}
            aria-current={isActive ? 'true' : undefined}
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
            {isHovered && (
              <span className="absolute end-full top-1/2 -translate-y-1/2 me-1 z-30 pointer-events-none whitespace-nowrap rounded-card bg-surface-dark dark:bg-white px-3 py-2 text-start shadow-card-hover">
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
    </div>
  );
}
