import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
  /** Anchor: align panel to this side */
  align?: 'start' | 'end';
}

const groups: Array<{ name: string; emojis: string[] }> = [
  { name: 'وجوه', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '🤪', '😝', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😤', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😢', '😭'] },
  { name: 'إيماءات', emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁'] },
  { name: 'قلوب', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💤'] },
  { name: 'أعمال', emojis: ['💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '💰', '💸', '💵', '💴', '💶', '💷', '🧾'] },
  { name: 'تجاري', emojis: ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋'] },
  { name: 'حركة', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛺', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛸', '🚉', '🚆', '🚄'] },
  { name: 'علم', emojis: ['🇴🇲', '🇸🇦', '🇦🇪', '🇰🇼', '🇶🇦', '🇧🇭', '🇪🇬', '🇯🇴', '🇸🇾', '🇱🇧', '🇮🇶', '🇾🇪', '🇵🇸', '🇲🇦', '🇹🇳', '🇩🇿', '🇱🇾', '🇸🇩', '🇲🇷', '🇸🇴'] },
];

export function EmojiPicker({ onPick, onClose, align = 'start' }: Props): JSX.Element {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const displayed = query
    ? groups.flatMap((g) => g.emojis).slice(0, 64)
    : groups[active].emojis;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute bottom-full mb-2 w-[300px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-xl z-30',
        align === 'start' ? 'start-0' : 'end-0'
      )}
    >
      <div className="p-2 border-b border-border-light dark:border-border-dark">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث..."
          className="w-full h-8 px-2 rounded-md bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        />
      </div>
      {!query && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border-light dark:border-border-dark overflow-x-auto">
          {groups.map((g, i) => (
            <button
              key={g.name}
              onClick={() => setActive(i)}
              className={cn(
                'flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors',
                active === i ? 'bg-primary/15 text-primary' : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {displayed.map((e, i) => (
          <button
            key={`${e}-${i}`}
            onClick={() => onPick(e)}
            className="aspect-square text-xl rounded-md hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            type="button"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
