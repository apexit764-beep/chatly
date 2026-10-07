import { InfoTip } from '@components/ui';
import { useTranslation } from '@/i18n/useTranslation';
import { contactTypeHint, contactTypeLabel } from '@/utils/labels';
import type { ContactType } from '@/types';

const ORDER: ContactType[] = ['visitor', 'lead', 'customer', 'returning', 'vip', 'company'];

/** What each contact type means; the types also drive campaign audiences. */
export function ContactTypeHelp({ intro }: { intro?: string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <p className="mb-1.5">{intro ?? t('تصنيف يدوي للعميل، ويُستخدم لاستهداف الحملات.')}</p>
      <ul className="space-y-0.5">
        {ORDER.map((type) => (
          <li key={type}>
            <b className="font-semibold">{t(contactTypeLabel[type])}:</b> {t(contactTypeHint[type])}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The same explanation behind an ⓘ, for a label. */
export function ContactTypeTip({ intro }: { intro?: string }): JSX.Element {
  return (
    <InfoTip>
      <ContactTypeHelp intro={intro} />
    </InfoTip>
  );
}
