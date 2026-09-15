import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface OtpInputProps {
  /** The whole code as one string — shorter than the field count until it is filled. */
  value: string;
  onChange: (next: string) => void;
  /** Fired when the last box is filled, so the form can submit itself. */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * One code, rendered as separate boxes.
 *
 * Held as a single string rather than an array of characters: paste, truncation and
 * "is it complete" all become string operations, and the boxes stay a rendering
 * detail. The row is forced to LTR — a verification code is a number read
 * left-to-right, and under the page's RTL direction the boxes would otherwise fill
 * from the right and read back reversed.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: OtpInputProps): JSX.Element {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string): void => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return;
  };

  const focusBox = (i: number): void => {
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  };

  const handleChange = (idx: number, raw: string): void => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    // Typing over a filled box replaces that one digit; a longer burst (autofill,
    // or a fast paste the paste handler missed) spills into the boxes after it.
    const chars = value.padEnd(length, ' ').split('');
    digits.split('').forEach((d, k) => {
      if (idx + k < length) chars[idx + k] = d;
    });
    commit(chars.join('').trimEnd());
    focusBox(idx + digits.length);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = value.padEnd(length, ' ').split('');
      if (chars[idx] !== ' ' && chars[idx] !== undefined) {
        chars[idx] = ' ';
        commit(chars.join('').trimEnd());
      } else if (idx > 0) {
        chars[idx - 1] = ' ';
        commit(chars.join('').trimEnd());
        focusBox(idx - 1);
      }
      return;
    }
    // The boxes are visually LTR, so the arrows follow the boxes, not the page.
    if (e.key === 'ArrowLeft') { e.preventDefault(); focusBox(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); focusBox(idx + 1); }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusBox(pasted.length);
  };

  return (
    <div className="flex items-center justify-between gap-2" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          // Lets iOS and Android offer the code straight from the SMS/mail notification.
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`الرقم ${i + 1} من ${length}`}
          aria-invalid={invalid}
          className={cn(
            'h-14 w-12 rounded-xl bg-bg-light dark:bg-bg-dark border text-center text-h2 font-extrabold tabular-nums',
            'focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            invalid
              ? 'border-danger focus:border-danger focus:ring-danger/10'
              : 'border-border-light dark:border-border-dark focus:border-primary',
          )}
        />
      ))}
    </div>
  );
}
