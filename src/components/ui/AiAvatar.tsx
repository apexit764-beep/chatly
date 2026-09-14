import { cn } from '@/utils/cn';

type AiAvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AiAvatarProps {
  size?: AiAvatarSize;
  /** Speeds the idle motion up while the assistant is composing a reply. */
  thinking?: boolean;
  className?: string;
  title?: string;
}

const box: Record<AiAvatarSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const glyph: Record<AiAvatarSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * The assistant's face. Drawn here rather than taken from lucide's `Bot` because the
 * eyes and the antenna have to be addressable to animate — a single icon component
 * gives no handle on its own strokes. Geometry, stroke width and caps match lucide's
 * 24px grid so it sits correctly beside the rest of the icon set.
 */
export function AiAvatar({ size = 'sm', thinking = false, className, title }: AiAvatarProps): JSX.Element {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full flex-shrink-0',
        'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm',
        box[size],
        className,
      )}
      title={title}
    >
      {/* Halo. Sits behind the face and never intercepts a click. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-full bg-fuchsia-500/40 pointer-events-none qh-ai-halo',
          thinking && 'qh-ai-halo--fast',
        )}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('relative qh-ai-bob', thinking && 'qh-ai-bob--fast', glyph[size])}
        role="img"
        aria-label="المساعد الذكي"
      >
        {/* antenna */}
        <path d="M12 8V5" />
        <circle cx="12" cy="3.4" r="1.4" fill="currentColor" stroke="none" className="qh-ai-beacon" />
        {/* head */}
        <rect x="4" y="8" width="16" height="12" rx="2.5" />
        {/* ears */}
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        {/* eyes — scaled from their own centre so a blink closes rather than slides */}
        <path d="M9 13v2" className="qh-ai-eye" style={{ transformOrigin: '9px 14px' }} />
        <path d="M15 13v2" className="qh-ai-eye" style={{ transformOrigin: '15px 14px' }} />
      </svg>
    </span>
  );
}
