import { useMemo, useState } from 'react';
import {
  Star,
  Smile,
  Meh,
  Frown,
  MessageSquare,
  Users,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  Clock,
  Hash,
  Eye,
  X,
} from 'lucide-react';
import { Card, StatCard, Avatar, Modal } from '@components/ui';
import { useRatingStore, type Rating } from '@/store/useRatingStore';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const SATISFACTION_MAP = {
  excellent: { label: 'ممتاز', icon: Smile, color: '#10B981', bg: 'bg-success/10' },
  good: { label: 'جيد', icon: Meh, color: '#F59E0B', bg: 'bg-warning/10' },
  bad: { label: 'سيء', icon: Frown, color: '#EF4444', bg: 'bg-danger/10' },
} as const;

export default function CustomerRatings(): JSX.Element {
  const ratings = useRatingStore((s) => s.ratings);
  const submitted = ratings.filter((r) => r.submittedAt);

  const [search, setSearch] = useState('');
  const [filterSat, setFilterSat] = useState<'all' | 'excellent' | 'good' | 'bad'>('all');
  const [viewRating, setViewRating] = useState<Rating | null>(null);

  const avgConv = submitted.length > 0
    ? submitted.reduce((s, r) => s + (r.ratingConversation ?? 0), 0) / submitted.length
    : 0;
  const ratedAgent = submitted.filter((r) => r.ratingAgent != null);
  const avgAgent = ratedAgent.length > 0
    ? ratedAgent.reduce((s, r) => s + (r.ratingAgent ?? 0), 0) / ratedAgent.length
    : 0;
  const responseRate = ratings.length > 0 ? (submitted.length / ratings.length) * 100 : 0;
  const satCounts = {
    excellent: submitted.filter((r) => r.satisfaction === 'excellent').length,
    good: submitted.filter((r) => r.satisfaction === 'good').length,
    bad: submitted.filter((r) => r.satisfaction === 'bad').length,
  };

  const filtered = useMemo(() => {
    return [...submitted]
      .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
      .filter((r) => {
        if (filterSat !== 'all' && r.satisfaction !== filterSat) return false;
        if (search) {
          const lc = search.toLowerCase();
          if (
            !r.contactName.toLowerCase().includes(lc) &&
            !r.agentName.toLowerCase().includes(lc) &&
            !(r.comment ?? '').toLowerCase().includes(lc)
          )
            return false;
        }
        return true;
      });
  }, [submitted, search, filterSat]);

  const pending = ratings.filter((r) => !r.submittedAt);
  const expired = pending.filter((r) => new Date(r.expiresAt) < new Date());

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning fill-warning" />
          <h1 className="text-h1 font-bold">تقييمات العملاء</h1>
        </div>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">
          تابع رضا العملاء وتقييمات المحادثات والموظفين
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="متوسط تقييم المحادثة"
          value={`${avgConv.toFixed(1)} / 5`}
          icon={<MessageSquare className="h-5 w-5" />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          label="متوسط تقييم الموظفين"
          value={`${avgAgent.toFixed(1)} / 5`}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-info/10"
          iconColor="text-info"
        />
        <StatCard
          label="نسبة الاستجابة"
          value={`${responseRate.toFixed(0)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-success/10"
          iconColor="text-success"
        />
        <StatCard
          label="إجمالي الروابط"
          value={String(ratings.length)}
          icon={<Hash className="h-5 w-5" />}
          iconBg="bg-warning/10"
          iconColor="text-warning"
        />
      </div>

      {/* Satisfaction distribution + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribution card */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-light dark:text-muted-dark" />
            <h3 className="text-body font-bold">توزيع الرضا</h3>
          </div>
          {submitted.length === 0 ? (
            <p className="text-small text-muted-light dark:text-muted-dark text-center py-8">
              لا توجد تقييمات بعد
            </p>
          ) : (
            <div className="space-y-4">
              {(['excellent', 'good', 'bad'] as const).map((key) => {
                const info = SATISFACTION_MAP[key];
                const Icon = info.icon;
                const count = satCounts[key];
                const pct = submitted.length > 0 ? (count / submitted.length) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${info.color}15` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: info.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-small font-medium">{info.label}</span>
                        <span className="text-small text-muted-light dark:text-muted-dark tabular-nums">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: info.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick summary */}
        <Card className="p-5">
          <h3 className="text-body font-bold mb-4">ملخص سريع</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              <span className="text-small text-muted-light dark:text-muted-dark">تقييمات مكتملة</span>
              <span className="text-body font-bold text-success tabular-nums">{submitted.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              <span className="text-small text-muted-light dark:text-muted-dark">بانتظار الرد</span>
              <span className="text-body font-bold text-warning tabular-nums">{pending.length - expired.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              <span className="text-small text-muted-light dark:text-muted-dark">منتهية الصلاحية</span>
              <span className="text-body font-bold text-danger tabular-nums">{expired.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              <span className="text-small text-muted-light dark:text-muted-dark">التقييم العام</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'h-3.5 w-3.5',
                      n <= Math.round(avgConv)
                        ? 'fill-warning text-warning'
                        : 'text-border-light dark:text-border-dark',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter bar */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو التعليق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterSat}
          onChange={(e) => setFilterSat(e.target.value as typeof filterSat)}
          className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        >
          <option value="all">كل التقييمات</option>
          <option value="excellent">ممتاز</option>
          <option value="good">جيد</option>
          <option value="bad">سيء</option>
        </select>
      </Card>

      {/* Ratings table */}
      <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">العميل</th>
                <th className="text-start font-medium px-4 py-3">الموظف</th>
                <th className="text-start font-medium px-4 py-3">تقييم المحادثة</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">تقييم الموظف</th>
                <th className="text-start font-medium px-4 py-3">الرضا</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">التعليق</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">التاريخ</th>
                <th className="text-start font-medium px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map((r) => {
                const satInfo = r.satisfaction ? SATISFACTION_MAP[r.satisfaction] : null;
                const SatIcon = satInfo?.icon;
                return (
                  <tr key={r.token} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.contactName} size="sm" />
                        <span className="text-small font-semibold">{r.contactName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-small">{r.agentName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'h-3.5 w-3.5',
                              n <= (r.ratingConversation ?? 0)
                                ? 'fill-warning text-warning'
                                : 'text-border-light dark:text-border-dark',
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {r.ratingAgent != null ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={cn(
                                'h-3.5 w-3.5',
                                n <= (r.ratingAgent ?? 0)
                                  ? 'fill-primary text-primary'
                                  : 'text-border-light dark:text-border-dark',
                              )}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-small text-muted-light dark:text-muted-dark">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {satInfo && SatIcon && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-small font-medium"
                          style={{ background: `${satInfo.color}15`, color: satInfo.color }}
                        >
                          <SatIcon className="h-3 w-3" />
                          {satInfo.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {r.comment ? (
                        <p className="text-small text-muted-light dark:text-muted-dark line-clamp-1 max-w-[200px]">
                          "{r.comment}"
                        </p>
                      ) : (
                        <span className="text-small text-muted-light dark:text-muted-dark">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-small text-muted-light dark:text-muted-dark">
                      {formatDate(r.submittedAt!)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewRating(r)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-primary/10 hover:text-primary transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-light dark:text-muted-dark">
                    {submitted.length === 0 ? (
                      <div className="space-y-2">
                        <Star className="h-10 w-10 mx-auto text-border-light dark:text-border-dark" />
                        <p className="text-body font-medium">لا توجد تقييمات بعد</p>
                        <p className="text-small">
                          سيتم عرض التقييمات هنا بمجرد استجابة العملاء لروابط التقييم
                        </p>
                      </div>
                    ) : (
                      'لا توجد تقييمات مطابقة للبحث'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rating detail modal */}
      {viewRating && (
        <Modal open onClose={() => setViewRating(null)} title="تفاصيل التقييم" size="md">
          <div className="space-y-5 p-1">
            {/* Customer & Agent */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">العميل</span>
                <div className="flex items-center gap-2">
                  <Avatar name={viewRating.contactName} size="sm" />
                  <span className="text-small font-semibold">{viewRating.contactName}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">الموظف</span>
                <div className="flex items-center gap-2">
                  <Avatar name={viewRating.agentName} size="sm" />
                  <span className="text-small font-semibold">{viewRating.agentName}</span>
                </div>
              </div>
            </div>

            {/* Channel & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">القناة</span>
                <p className="text-small">{viewRating.channelName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">تاريخ التقييم</span>
                <p className="text-small">{viewRating.submittedAt ? formatDate(viewRating.submittedAt) : '—'}</p>
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">تقييم المحادثة</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        'h-4 w-4',
                        n <= (viewRating.ratingConversation ?? 0)
                          ? 'fill-warning text-warning'
                          : 'text-border-light dark:text-border-dark',
                      )}
                    />
                  ))}
                  <span className="text-small font-bold ms-1.5">{viewRating.ratingConversation ?? '—'}/5</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">تقييم الموظف</span>
                {viewRating.ratingAgent != null ? (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          'h-4 w-4',
                          n <= (viewRating.ratingAgent ?? 0)
                            ? 'fill-primary text-primary'
                            : 'text-border-light dark:text-border-dark',
                        )}
                      />
                    ))}
                    <span className="text-small font-bold ms-1.5">{viewRating.ratingAgent}/5</span>
                  </div>
                ) : (
                  <p className="text-small text-muted-light dark:text-muted-dark">لم يتم التقييم</p>
                )}
              </div>
            </div>

            {/* Satisfaction */}
            {viewRating.satisfaction && (() => {
              const info = SATISFACTION_MAP[viewRating.satisfaction];
              const SatIcon = info.icon;
              return (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">مستوى الرضا</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-medium"
                    style={{ background: `${info.color}15`, color: info.color }}
                  >
                    <SatIcon className="h-4 w-4" />
                    {info.label}
                  </span>
                </div>
              );
            })()}

            {/* Comment */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark">تعليق العميل</span>
              {viewRating.comment ? (
                <p className="text-small bg-bg-light dark:bg-bg-dark rounded-card p-3 leading-relaxed">
                  "{viewRating.comment}"
                </p>
              ) : (
                <p className="text-small text-muted-light dark:text-muted-dark">لا يوجد تعليق</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
