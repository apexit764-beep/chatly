import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CountryOption {
  code: string;
  flag: string;
  name: string;
  iso?: string;
}

export const PHONE_COUNTRIES: CountryOption[] = [
  { code: '+968', flag: '🇴🇲', name: 'عُمان', iso: 'OM' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات', iso: 'AE' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية', iso: 'SA' },
  { code: '+974', flag: '🇶🇦', name: 'قطر', iso: 'QA' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين', iso: 'BH' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت', iso: 'KW' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن', iso: 'JO' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان', iso: 'LB' },
  { code: '+972', flag: '🇵🇸', name: 'فلسطين', iso: 'PS' },
  { code: '+20', flag: '🇪🇬', name: 'مصر', iso: 'EG' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب', iso: 'MA' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر', iso: 'DZ' },
  { code: '+216', flag: '🇹🇳', name: 'تونس', iso: 'TN' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا/كندا', iso: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا', iso: 'GB' },
  { code: '+33', flag: '🇫🇷', name: 'فرنسا', iso: 'FR' },
  { code: '+49', flag: '🇩🇪', name: 'ألمانيا', iso: 'DE' },
  { code: '+90', flag: '🇹🇷', name: 'تركيا', iso: 'TR' },
  { code: '+91', flag: '🇮🇳', name: 'الهند', iso: 'IN' },
];

export interface PhoneFieldProps {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  countries?: CountryOption[];
  /** Disable manual phone editing (e.g., locked country) */
  disabled?: boolean;
}

/**
 * Reusable international phone input.
 * Country chip sits at the logical start (visual right in RTL); the digits
 * align to the same side so the entered number reads adjacent to the prefix.
 */
export function PhoneField({
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  label,
  error,
  placeholder = '9999 1111',
  countries = PHONE_COUNTRIES,
  disabled,
}: PhoneFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => countries.filter((c) => !search || c.name.includes(search) || c.code.includes(search) || (c.iso ?? '').toLowerCase().includes(search.toLowerCase())),
    [countries, search],
  );
  const current = countries.find((c) => c.code === countryCode) ?? countries[0];

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
          {label}
        </label>
      )}
      <div
        dir="ltr"
        className={cn(
          'flex items-stretch h-10 bg-surface-light dark:bg-bg-dark border rounded-input transition-all',
          error
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/20'
            : 'border-border-light dark:border-border-dark focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
        )}
      >
        {/* Country chip on the LEFT (the prefix +968 reads naturally before the digits) */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className="h-full px-2.5 flex items-center gap-1.5 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors border-r border-border-light dark:border-border-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">{current?.flag}</span>
            {current?.iso && (
              <span className="text-[11px] font-semibold text-muted-light dark:text-muted-dark">{current.iso}</span>
            )}
            <span className="font-mono text-small tabular-nums text-muted-light dark:text-muted-dark">{current?.code}</span>
            <ChevronDown className={cn('h-3 w-3 text-muted-light dark:text-muted-dark transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => { setOpen(false); setSearch(''); }} />
              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-[120]" dir="rtl">
                <div className="relative p-2">
                  <Search className="h-3.5 w-3.5 absolute end-4 top-1/2 -translate-y-1/2 text-muted-light pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="ابحث..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-8 ps-3 pe-8 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-small text-muted-light dark:text-muted-dark text-center">لا نتائج</p>
                  ) : filtered.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { onCountryCodeChange(c.code); setOpen(false); setSearch(''); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-muted-light dark:text-muted-dark tabular-nums font-mono">{c.code}</span>
                      {countryCode === c.code && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Phone digits — country code is at the left; digits flow LTR starting just to its right */}
        <input
          type="tel"
          dir="ltr"
          inputMode="tel"
          disabled={disabled}
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d\s+\-()]/g, ''))}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-full bg-transparent px-3 text-body focus:outline-none placeholder:text-muted-light/60 dark:placeholder:text-muted-dark/50 text-left disabled:opacity-60"
        />
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
