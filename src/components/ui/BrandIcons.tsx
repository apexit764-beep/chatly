interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function WhatsAppIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function MessengerIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
    </svg>
  );
}

export function InstagramIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export function TelegramIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** Salla — simplified monogram (Arabic "س" stylized as a flower/petal) */
export function SallaIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id="salla-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A0E8C5" />
          <stop offset="100%" stopColor="#5BC79F" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#salla-grad)" />
      <path
        d="M 12 6.5 C 14 6.5 15.5 8 15.5 10 C 15.5 11.5 14.5 12.5 13 13 L 13 14.5 C 13 16 11.5 17 10 17 L 9 17 L 9 15 L 10 15 C 10.5 15 11 14.7 11 14 L 11 12.5 C 9 12 7.5 10.5 7.5 8.5 C 7.5 7.5 8 6.5 9 6.5 L 12 6.5 Z"
        fill="white"
      />
    </svg>
  );
}

/** Zid — simplified "Z" monogram on purple background */
export function ZidIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#7B61FF" />
      <path
        d="M 7 7.5 L 17 7.5 L 17 9.5 L 10 14.5 L 17 14.5 L 17 16.5 L 7 16.5 L 7 14.5 L 14 9.5 L 7 9.5 Z"
        fill="white"
      />
    </svg>
  );
}

/** Shopify — simplified "S" shopping bag monogram */
export function ShopifyIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M 7 4 L 17 4 C 17.5 4 18 4.4 18 5 L 19 20.5 C 19 21 18.5 21.5 18 21.5 L 6 21.5 C 5.5 21.5 5 21 5 20.5 L 6 5 C 6 4.4 6.5 4 7 4 Z M 9 4 C 9 2 10.3 1 12 1 C 13.7 1 15 2 15 4"
        fill="#95BF47"
        stroke="#5E8E3E"
        strokeWidth="0.4"
      />
      <path
        d="M 14.5 9.5 C 14.5 9 14 8.5 13 8.5 C 12 8.5 11.5 9 11.5 9.7 C 11.5 11.3 14.5 11 14.5 13.3 C 14.5 14.5 13.3 15.5 11.7 15.5 C 10 15.5 9 14.5 9 14.5 L 9.5 12.8 C 9.5 12.8 10.3 13.5 11.5 13.5 C 12.3 13.5 12.5 13 12.5 12.7 C 12.5 11.3 9.7 11.5 9.7 9.3 C 9.7 8 10.7 7 12.5 7 C 14 7 14.7 7.7 14.7 7.7 L 14.5 9.5 Z"
        fill="white"
      />
    </svg>
  );
}

/** WooCommerce — simplified "W" monogram */
export function WooCommerceIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#7F54B3" />
      <path
        d="M 4 9 L 6.5 9 L 7.8 14 L 9.5 9 L 11 9 L 12.7 14 L 14 9 L 16.5 9 L 14 16 L 12 16 L 10.3 11.5 L 8.5 16 L 6.5 16 L 4 9 Z"
        fill="white"
      />
      <circle cx="18.5" cy="11" r="1.2" fill="white" />
      <circle cx="20.5" cy="13" r="0.8" fill="white" opacity="0.7" />
    </svg>
  );
}

export function XIcon({ className, style }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
