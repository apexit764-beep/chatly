import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { ChannelIcon } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { ChannelType } from '@/types';
import { CHANNEL_TYPES } from './channelTypes';

export default function Channels(): JSX.Element {
  const { t } = useTranslation();
  const channels = useDataStore((s) => s.channels);
  const [search, setSearch] = useState('');

  const filteredTypes = CHANNEL_TYPES.filter(
    (t) => !search || t.name.includes(search) || t.tagline.includes(search)
  );

  const countByType = (type: ChannelType): number =>
    channels.filter((c) => c.type === type).length;

  const connectedByType = (type: ChannelType): number =>
    channels.filter((c) => c.type === type && c.status === 'connected').length;

  return (
    <div className="p-4 lg:p-6 space-y-7 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold">{t('الحسابات والربط')}</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            {t('اربط قنوات التواصل ومنصات التجارة الإلكترونية لإدارة كل شيء من مكان واحد')}
          </p>
        </div>
        <div className="relative md:w-72">
          <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            placeholder={t('ابحث عن قناة...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Sections by category */}
      {[
        { key: 'communication' as const, title: 'قنوات التواصل', subtitle: 'القنوات التي يستخدمها عملاؤك للتواصل معك' },
        { key: 'email' as const, title: 'البريد الإلكتروني', subtitle: 'اربط بريدك الإلكتروني لإرسال الحملات التسويقية والإشعارات' },
        { key: 'ecommerce' as const, title: 'منصات التجارة الإلكترونية', subtitle: 'اربط متجرك لمزامنة الطلبات والعملاء تلقائياً' },
      ].map((section) => {
        const items = filteredTypes.filter((m) => m.category === section.key);
        if (items.length === 0) return null;
        return (
          <section key={section.key}>
            <div className="mb-3">
              <h2 className="text-h3 font-bold">{t(section.title)}</h2>
              <p className="text-small text-muted-light dark:text-muted-dark">{t(section.subtitle)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((meta) => {
                const total = countByType(meta.type);
                const connected = connectedByType(meta.type);
                return (
                  <Link
                    key={meta.type}
                    to={`/channels/${meta.type}`}
                    className="text-start bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card p-5 hover:shadow-card-hover hover:border-primary/40 transition-all group block"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
                        style={{ background: meta.brandColor }}
                      >
                        <ChannelIcon type={meta.type} size={24} plain className="text-white" />
                      </div>
                      {total > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                            {connected} {t('متصل')}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-h3 font-bold mb-1">{meta.name}</p>
                    <p className="text-small text-muted-light dark:text-muted-dark line-clamp-2 mb-4">
                      {meta.tagline}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
                      <span className="text-small text-muted-light dark:text-muted-dark">
                        {total === 0 ? t('لم يتم الربط بعد') : `${total} ${t('حساب')}${total > 2 ? t('ات') : ''}`}
                      </span>
                      <span className="text-small font-semibold text-primary group-hover:gap-2 gap-1 flex items-center transition-all">
                        {t('إدارة')}
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
