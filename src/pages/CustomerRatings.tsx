import { motion } from 'framer-motion';
import { Star, Smile, Meh, Frown } from 'lucide-react';
import { Card, Avatar } from '@components/ui';
import { useRatingStore } from '@/store/useRatingStore';
import { cn } from '@/utils/cn';

export default function CustomerRatings(): JSX.Element {
  const ratings = useRatingStore((s) => s.ratings);
  const submitted = ratings.filter((r) => r.submittedAt);

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
  const recent = [...submitted]
    .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto">
      <motion.div
        className="max-w-6xl mx-auto p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning fill-warning" />
          <h2 className="text-h2 font-bold">تقييمات العملاء</h2>
          <span className="ms-2 text-small text-muted-light dark:text-muted-dark">
            ({submitted.length} من {ratings.length} رابط)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-small text-muted-light dark:text-muted-dark mb-2">متوسط تقييم المحادثة</p>
            <div className="flex items-center gap-2">
              <p className="text-h1 font-bold tabular-nums">{avgConv.toFixed(1)}</p>
              <span className="text-muted-light dark:text-muted-dark">/ 5</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('h-4 w-4', n <= Math.round(avgConv) ? 'fill-warning text-warning' : 'text-border-light dark:text-border-dark')} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-small text-muted-light dark:text-muted-dark mb-2">متوسط تقييم الموظفين</p>
            <div className="flex items-center gap-2">
              <p className="text-h1 font-bold tabular-nums">{avgAgent.toFixed(1)}</p>
              <span className="text-muted-light dark:text-muted-dark">/ 5</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('h-4 w-4', n <= Math.round(avgAgent) ? 'fill-warning text-warning' : 'text-border-light dark:text-border-dark')} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-small text-muted-light dark:text-muted-dark mb-2">نسبة الاستجابة</p>
            <div className="flex items-baseline gap-1">
              <p className="text-h1 font-bold tabular-nums">{responseRate.toFixed(0)}</p>
              <span className="text-muted-light dark:text-muted-dark">%</span>
            </div>
            <p className="text-small text-muted-light dark:text-muted-dark mt-1.5">
              عملاء أكملوا التقييم
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-small text-muted-light dark:text-muted-dark mb-2">توزيع الرضا</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Smile className="h-4 w-4 text-success" />
                <span className="text-body font-bold tabular-nums">{satCounts.excellent}</span>
              </div>
              <div className="flex items-center gap-1">
                <Meh className="h-4 w-4 text-warning" />
                <span className="text-body font-bold tabular-nums">{satCounts.good}</span>
              </div>
              <div className="flex items-center gap-1">
                <Frown className="h-4 w-4 text-danger" />
                <span className="text-body font-bold tabular-nums">{satCounts.bad}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="text-body font-bold mb-3">أحدث التعليقات</h3>
          {recent.length === 0 ? (
            <p className="text-small text-muted-light dark:text-muted-dark text-center py-8">
              لم يتم استلام أي تقييمات بعد
            </p>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.token} className="p-3 rounded-card border border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.contactName} size="sm" />
                      <div>
                        <p className="text-small font-semibold">{r.contactName}</p>
                        <p className="text-[11px] text-muted-light dark:text-muted-dark">
                          مع {r.agentName} · {new Date(r.submittedAt!).toLocaleDateString('ar-OM-u-nu-latn')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn('h-3.5 w-3.5', n <= (r.ratingConversation ?? 0) ? 'fill-warning text-warning' : 'text-border-light dark:text-border-dark')} />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed pt-2 border-t border-border-light dark:border-border-dark">
                      "{r.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
