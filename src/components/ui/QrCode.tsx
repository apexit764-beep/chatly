import { useEffect, useState } from 'react';

interface QrCodeProps {
  /** The payload to encode. For 2FA this is the otpauth:// URI. */
  value: string;
  /** Rendered size in pixels. */
  size?: number;
  className?: string;
}

/**
 * Renders a genuinely scannable QR code.
 *
 * The SVG is produced with fixed black-on-white colours rather than
 * `currentColor`: scanners need the dark/light contrast to survive, and in dark
 * mode an inherited light foreground would invert the code and make it
 * unreadable. The white quiet-zone margin is part of the spec, not padding.
 */
export function QrCode({ value, size = 176, className }: QrCodeProps): JSX.Element {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    // Imported on demand: the encoder is ~60 kB and only the 2FA setup dialog
    // ever needs it, so it should not ride along in the settings chunk.
    import('qrcode')
      .then((mod) => mod.default.toString(value, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      }))
      .then((markup) => { if (active) setSvg(markup); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [value]);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center p-4 text-center"
      >
        <span className="text-small text-muted-light dark:text-muted-dark">
          تعذّر توليد رمز QR — استخدم المفتاح اليدوي بالأسفل
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={className}
      // The library returns a complete <svg> document; there is no user input in
      // it beyond the encoded value, which it escapes itself.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      aria-label="رمز QR لإعداد المصادقة الثنائية"
      role="img"
    />
  );
}
