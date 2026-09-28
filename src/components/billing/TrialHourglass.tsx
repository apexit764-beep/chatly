/**
 * ساعة رمليّة يتساقط رملها ثم تنقلب.
 *
 * أيقونة `Hourglass` من lucide مسارٌ جامد لا رمل فيه يُحرَّك، فبُنيت هنا
 * لتؤدّي المعنى نفسه الذي يؤدّيه العدّاد جانبها: مدّة تنفد.
 *
 * الحركة كلّها في `global.css` تحت `qh-hg-*`، ودورتها تسع ثوانٍ: نزولٌ
 * بطيء ثم انقلابة. وتُقاس على دوام الشريط لا على لفت النظر، وتسكن كلّها
 * مع `prefers-reduced-motion`.
 */
export function TrialHourglass({ className = '' }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`qh-hg ${className}`}
      aria-hidden
    >
      {/* الإطار: يدور مع الانقلابة ويبقى الرمل داخله */}
      <g className="qh-hg-frame">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />

        {/* رمل الحجرة العليا: ينكمش نحو العنق */}
        <polygon className="qh-hg-top" points="8.2,3.6 15.8,3.6 12,10.4" fill="currentColor" stroke="none" />
        {/* خيط الرمل المتساقط */}
        <line className="qh-hg-stream" x1="12" y1="10.6" x2="12" y2="18.4" strokeWidth={1.1} />
        {/* رمل الحجرة السفلى: يتراكم من القاع */}
        <polygon className="qh-hg-bottom" points="12,13.6 15.8,20.4 8.2,20.4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
