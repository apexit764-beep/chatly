/**
 * Provider logos, inlined rather than fetched — an auth screen should not wait on
 * a CDN, and these never change.
 */

export function GoogleMark({ className = 'h-[18px] w-[18px]' }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

/** Monochrome, so it inverts with the theme. */
export function AppleMark({ className = 'h-[19px] w-[19px]' }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden>
      <path d="M16.36 12.78c.02 2.6 2.27 3.46 2.3 3.47-.02.06-.36 1.24-1.19 2.45-.72 1.05-1.46 2.1-2.63 2.12-1.15.02-1.52-.68-2.83-.68-1.32 0-1.73.66-2.82.7-1.13.04-1.99-1.13-2.72-2.18-1.48-2.15-2.62-6.08-1.1-8.73.76-1.32 2.11-2.15 3.58-2.17 1.11-.02 2.16.75 2.84.75.68 0 1.95-.93 3.29-.79.56.02 2.13.23 3.14 1.7-.08.05-1.87 1.1-1.86 3.28M14.2 4.6c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.49 2.57-1.23" />
    </svg>
  );
}
