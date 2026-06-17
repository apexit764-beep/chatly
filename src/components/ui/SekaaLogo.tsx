interface SekaaLogoProps {
  className?: string;
  size?: number;
}

export function SekaaLogo({ className, size }: SekaaLogoProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chatly"
    >
      <defs>
        <linearGradient id="sekaa-grad-top" x1="50" y1="0" x2="0" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="sekaa-grad-bottom" x1="100" y1="50" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M 50 4 L 50 34 C 50 43 43 50 34 50 L 4 50"
        stroke="url(#sekaa-grad-top)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 96 50 L 66 50 C 57 50 50 57 50 66 L 50 96"
        stroke="url(#sekaa-grad-bottom)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
