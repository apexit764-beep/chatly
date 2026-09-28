import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { AsYouType, getExampleNumber, parsePhoneNumberFromString } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import type { CountryCode } from 'libphonenumber-js';
import OM from 'country-flag-icons/react/3x2/OM';
import AE from 'country-flag-icons/react/3x2/AE';
import SA from 'country-flag-icons/react/3x2/SA';
import QA from 'country-flag-icons/react/3x2/QA';
import BH from 'country-flag-icons/react/3x2/BH';
import KW from 'country-flag-icons/react/3x2/KW';
import JO from 'country-flag-icons/react/3x2/JO';
import LB from 'country-flag-icons/react/3x2/LB';
import PS from 'country-flag-icons/react/3x2/PS';
import EG from 'country-flag-icons/react/3x2/EG';
import MA from 'country-flag-icons/react/3x2/MA';
import DZ from 'country-flag-icons/react/3x2/DZ';
import TN from 'country-flag-icons/react/3x2/TN';
import US from 'country-flag-icons/react/3x2/US';
import GB from 'country-flag-icons/react/3x2/GB';
import FR from 'country-flag-icons/react/3x2/FR';
import DE from 'country-flag-icons/react/3x2/DE';
import TR from 'country-flag-icons/react/3x2/TR';
import IN from 'country-flag-icons/react/3x2/IN';
import { cn } from '@/utils/cn';

export interface CountryOption {
  code: string;
  name: string;
  iso: CountryCode;
}

/**
 * الأعلام ملفّات SVG لا محارف إيموجي.
 *
 * كانت `'🇴🇲'` نصّاً في القائمة، فكان رسمها موكولاً إلى خطّ النظام —
 * وويندوز لا يحمل رموز أعلام الدول أصلاً، فتطلع «OM» أو مربّعاً فارغاً
 * على كل متصفّح عليه. ولأن ماك ولينكس يرسمانها، لا يرى العطب من يطوّر
 * عليهما أبداً.
 */
const FLAGS: Record<string, React.ComponentType<{ className?: string }>> = {
  OM, AE, SA, QA, BH, KW, JO, LB, PS, EG, MA, DZ, TN, US, GB, FR, DE, TR, IN,
};

export const PHONE_COUNTRIES: CountryOption[] = [
  { code: '+968', name: 'عُمان', iso: 'OM' },
  { code: '+971', name: 'الإمارات', iso: 'AE' },
  { code: '+966', name: 'السعودية', iso: 'SA' },
  { code: '+974', name: 'قطر', iso: 'QA' },
  { code: '+973', name: 'البحرين', iso: 'BH' },
  { code: '+965', name: 'الكويت', iso: 'KW' },
  { code: '+962', name: 'الأردن', iso: 'JO' },
  { code: '+961', name: 'لبنان', iso: 'LB' },
  { code: '+972', name: 'فلسطين', iso: 'PS' },
  { code: '+20', name: 'مصر', iso: 'EG' },
  { code: '+212', name: 'المغرب', iso: 'MA' },
  { code: '+213', name: 'الجزائر', iso: 'DZ' },
  { code: '+216', name: 'تونس', iso: 'TN' },
  { code: '+1', name: 'أمريكا/كندا', iso: 'US' },
  { code: '+44', name: 'بريطانيا', iso: 'GB' },
  { code: '+33', name: 'فرنسا', iso: 'FR' },
  { code: '+49', name: 'ألمانيا', iso: 'DE' },
  { code: '+90', name: 'تركيا', iso: 'TR' },
  { code: '+91', name: 'الهند', iso: 'IN' },
];

/** الحدّ الخفيف يفصل الأعلام البيضاء (قطر، البحرين) عن الخلفية. */
function Flag({ iso, className }: { iso: CountryCode; className?: string }): JSX.Element | null {
  const F = FLAGS[iso];
  return F ? <F className={cn('h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10', className)} /> : null;
}

/**
 * الرقم بصيغة E.164 من مقدّمة الدولة والرقم المكتوب، أو `''` إن لم يكن
 * رقماً صالحاً لتلك الدولة.
 *
 * البناء بالمكتبة لا بلصق المقدّمة على ما كُتب: المصري يكتب
 * `01012345678` بصفر الخطّ المحلّي، ولصق `+20` كما هي يعطي
 * `+2001012345678` — رقماً لا وجود له. والمكتبة تُسقط الصفر.
 */
export function toE164(countryCode: string, phone: string): string {
  const iso = PHONE_COUNTRIES.find((c) => c.code === countryCode)?.iso;
  if (!iso || !phone.trim()) return '';
  const parsed = parsePhoneNumberFromString(phone, iso);
  // المكتبة تُخرج E.164 لأي مدخل تفهم شكله وإن كان رقماً لا وجود له
  // (`+96811234567` مثلاً)، فالصلاحية تُشترط هنا صراحةً: ما يُخزَّن رقمٌ
  // قائم أو لا شيء، لا شكلٌ صحيح لرقم خاطئ.
  return parsed?.isValid() ? parsed.number : '';
}

/** هل الرقم صالح لدولته فعلاً — لا بطوله وحده بل بمقدّمة مشغّله. */
export function isValidPhone(countryCode: string, phone: string): boolean {
  const iso = PHONE_COUNTRIES.find((c) => c.code === countryCode)?.iso;
  if (!iso || !phone.trim()) return false;
  return parsePhoneNumberFromString(phone, iso)?.isValid() ?? false;
}

export interface PhoneFieldProps {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  /** الرقم بصيغة E.164 عند كل تغيير — `''` ما دام غير صالح. */
  onE164Change?: (e164: string) => void;
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  countries?: CountryOption[];
  /** Disable manual phone editing (e.g., locked country) */
  disabled?: boolean;
}

/**
 * حقل هاتف دوليّ مشترك.
 *
 * مقدّمة الدولة في الطرف المنطقيّ الأول (يمين الشاشة في العربية)، والأرقام
 * تليها مباشرة فيُقرأ الرقم متّصلاً بمقدّمته.
 *
 * والمحرّك `libphonenumber-js/max` — بيانات مشغّلي Google الكاملة: `+20 13…`
 * تُرفض لأن مشغّلي مصر هم `10` و`11` و`12` و`15`، بينما تقبلها النسخة
 * المصغّرة ما دام الطول صحيحاً. وهو نفسه محرّك الموقع التعريفي، فالأرقام
 * تتطابق بين الاثنين بدل أن يصل الرقم الواحد بثلاثة أشكال.
 */
export function PhoneField({
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  onE164Change,
  label,
  error,
  placeholder,
  countries = PHONE_COUNTRIES,
  disabled,
}: PhoneFieldProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => countries.filter((c) => !search || c.name.includes(search) || c.code.includes(search) || c.iso.toLowerCase().includes(search.toLowerCase())),
    [countries, search],
  );
  const current = countries.find((c) => c.code === countryCode) ?? countries[0];

  /* المثال رقم حقيقي من بيانات المكتبة، فيراه الزائر بشكل بلده لا بشكل ثابت. */
  const example = useMemo(() => {
    try {
      return getExampleNumber(current.iso, examples)?.formatNational() ?? '';
    } catch {
      return '';
    }
  }, [current.iso]);

  /*
    التنسيق أثناء الكتابة: `AsYouType` يعيد بناء النصّ كاملاً من الأرقام في
    كل ضغطة، فالمسح للخلف يشتغل طبيعياً ولا تعلق الفواصل.
  */
  const emit = (rawDigits: string, iso: CountryCode, dial: string): void => {
    const formatted = rawDigits ? new AsYouType(iso).input(rawDigits) : '';
    onPhoneChange(formatted);
    onE164Change?.(toE164(dial, formatted));
  };

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
            <Flag iso={current.iso} />
            <span className="text-[11px] font-semibold text-muted-light dark:text-muted-dark">{current.iso}</span>
            <span className="font-mono text-small tabular-nums text-muted-light dark:text-muted-dark">{current.code}</span>
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
                      onClick={() => {
                        onCountryCodeChange(c.code);
                        /* الرقم المكتوب يُعاد تنسيقه بقواعد الدولة الجديدة لا يُمسح. */
                        emit(phone.replace(/\D/g, ''), c.iso, c.code);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
                    >
                      <Flag iso={c.iso} />
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
          autoComplete="tel-national"
          disabled={disabled}
          value={phone}
          onChange={(e) => emit(e.target.value.replace(/\D/g, ''), current.iso, current.code)}
          placeholder={placeholder ?? example}
          className="flex-1 min-w-0 h-full bg-transparent px-3 text-body focus:outline-none placeholder:text-muted-light/60 dark:placeholder:text-muted-dark/50 text-left disabled:opacity-60"
        />
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
