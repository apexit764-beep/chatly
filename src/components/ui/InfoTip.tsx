import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InfoTipProps {
  /** The explanation shown in the bubble. */
  children: ReactNode;
  className?: string;
}

const BUBBLE_WIDTH = 260;
const GAP = 8;
const MARGIN = 12;

/**
 * A small ⓘ after a label that explains it. Opens on hover or keyboard focus,
 * toggles on tap (touch has no hover). The bubble is portalled and fixed so
 * cards, tables and drawers with `overflow: hidden` don't clip it.
 */
export function InfoTip({ children, className }: InfoTipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number; below: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>();
  const pointerType = useRef<string | null>(null);
  const id = useId();

  const place = useCallback(() => {
    const btn = buttonRef.current;
    const bubble = bubbleRef.current;
    if (!btn || !bubble) return;
    const r = btn.getBoundingClientRect();
    const h = bubble.offsetHeight;
    const width = Math.min(BUBBLE_WIDTH, window.innerWidth - MARGIN * 2);
    const centre = r.left + r.width / 2;
    const left = Math.min(Math.max(centre - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    const below = r.bottom + GAP + h <= window.innerHeight - MARGIN || r.top - GAP - h < MARGIN;
    setPos({
      top: below ? r.bottom + GAP : r.top - GAP - h,
      left,
      arrow: Math.min(Math.max(centre - left, 14), width - 14),
      below,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent): void => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !bubbleRef.current?.contains(target)) close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const hover = (next: boolean): void => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpen(next), next ? 120 : 80);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="شرح"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onClick={(e) => {
          // Inside a <label> or a clickable row, the tap is for the bubble only.
          e.preventDefault();
          e.stopPropagation();
          // A mouse already opened it on hover, so a click keeps it; a tap toggles.
          if (pointerType.current === 'mouse') setOpen(true);
          else setOpen((v) => !v);
          pointerType.current = null;
        }}
        onMouseEnter={() => hover(true)}
        onMouseLeave={() => hover(false)}
        onFocus={() => {
          // Keyboard focus opens it; a pointer press is handled by the click.
          if (!pointerType.current) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className={cn(
          'inline-flex items-center justify-center h-4 w-4 align-middle rounded-full flex-shrink-0 cursor-help transition-colors',
          'text-muted-light/70 dark:text-muted-dark/70 hover:text-primary dark:hover:text-[#60A5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open && 'text-primary dark:text-[#60A5FA]',
          className
        )}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            id={id}
            role="tooltip"
            onMouseEnter={() => hover(true)}
            onMouseLeave={() => hover(false)}
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: Math.min(BUBBLE_WIDTH, window.innerWidth - MARGIN * 2),
            }}
            className="fixed z-[120] rounded-[10px] bg-[#111827] text-[#F9FAFB] text-[12px] leading-relaxed font-normal text-start whitespace-normal normal-case tracking-normal px-3 py-2 shadow-[0_10px_24px_rgba(16,24,40,0.22)] dark:ring-1 dark:ring-white/10"
          >
            {children}
            {pos && (
              <span
                aria-hidden
                className={cn('absolute h-2.5 w-2.5 rotate-45 bg-[#111827]', pos.below ? '-top-[5px]' : '-bottom-[5px]')}
                style={{ left: pos.arrow - 5 }}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}
