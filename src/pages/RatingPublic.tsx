import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Building, CheckCircle2, Smile, Meh, Frown, AlertCircle } from 'lucide-react';
import { useRatingStore, type Satisfaction } from '@/store/useRatingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/utils/cn';

const SATISFACTION_OPTIONS: { value: Satisfaction; label: string; icon: typeof Smile; activeBg: string; activeText: string }[] = [
  { value: 'bad', label: 'سيئة', icon: Frown, activeBg: 'bg-danger', activeText: 'text-white' },
  { value: 'good', label: 'جيدة', icon: Meh, activeBg: 'bg-warning', activeText: 'text-white' },
  { value: 'excellent', label: 'ممتازة', icon: Smile, activeBg: 'bg-success', activeText: 'text-white' },
];

function StarRating({ value, onChange, size = 'lg' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'lg' }): JSX.Element {
  const cls = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6';
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${n} نجوم`}
        >
          <Star
            className={cn(
              cls,
              n <= value ? 'fill-warning text-warning' : 'fill-transparent text-muted-light dark:text-muted-dark'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function RatingPublic(): JSX.Element {
  const { token = '' } = useParams<{ token: string }>();
  const general = useSettingsStore((s) => s.general);
  const ratingPrefs = useSettingsStore((s) => s.rating);
  const theme = useThemeStore((s) => s.theme);
  const findByToken = useRatingStore((s) => s.findByToken);
  const submitRating = useRatingStore((s) => s.submitRating);

  const rating = useMemo(() => findByToken(token), [findByToken, token]);

  const [convStars, setConvStars] = useState(0);
  const [agentStars, setAgentStars] = useState(0);
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(rating?.submittedAt != null);
  const [error, setError] = useState<string | null>(null);

  const expired = rating ? new Date(rating.expiresAt) < new Date() : false;

  const handleSubmit = (): void => {
    setError(null);
    if (!rating) return;
    if (!convStars) { setError('يرجى تقييم المحادثة بالنجوم'); return; }
    if (!satisfaction) { setError('يرجى اختيار مستوى الرضا'); return; }
    const ok = submitRating(token, {
      ratingConversation: convStars,
      ratingAgent: ratingPrefs.askAgentRating ? agentStars || null : null,
      satisfaction,
      comment: comment.trim(),
    });
    if (ok) setSubmitted(true);
    else setError('تعذّر إرسال التقييم. ربما تم إرساله مسبقاً أو انتهت صلاحيته.');
  };

  return (
    <div className={cn('min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center p-4', theme === 'dark' && 'dark')} dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-card shadow-xl overflow-hidden">
        {/* Branded header */}
        <div className="bg-gradient-to-l from-primary to-primary-dark text-white p-6 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/20 flex items-center justify-center overflow-hidden mb-3">
            {general.companyLogo ? (
              <img src={general.companyLogo} alt={general.siteName} className="h-full w-full object-cover" />
            ) : (
              <Building className="h-8 w-8 text-white/80" />
            )}
          </div>
          <p className="text-small opacity-90 mb-1">{general.siteName}</p>
          <h1 className="text-h2 font-bold">تقييم تجربتك</h1>
        </div>

        {/* Body */}
        <div className="p-6">
          {!rating ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-danger" />}
              title="رابط غير صالح"
              message="هذا الرابط غير صحيح أو تم استخدامه مسبقاً."
            />
          ) : expired ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-warning" />}
              title="انتهت صلاحية الرابط"
              message="عذراً، انتهت فترة التقييم لهذه المحادثة."
            />
          ) : submitted ? (
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12 text-success" />}
              title="شكراً لتقييمك!"
              message="ملاحظاتك تساعدنا على تطوير خدماتنا. نتمنى لك يوماً سعيداً."
            />
          ) : (
            <>
              <p className="text-body text-muted-light dark:text-muted-dark mb-6 text-center">
                مرحباً {rating.contactName.split(' ')[0]}، كيف كانت تجربتك معنا؟
              </p>

              {/* Satisfaction emojis */}
              <div className="mb-6">
                <p className="text-small font-semibold mb-2 text-center">رضاك العام</p>
                <div className="flex items-center justify-center gap-3">
                  {SATISFACTION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = satisfaction === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSatisfaction(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all',
                          isActive ? `${opt.activeBg} border-transparent ${opt.activeText}` : 'border-border-light dark:border-border-dark hover:border-primary/40'
                        )}
                      >
                        <Icon className="h-7 w-7" />
                        <span className="text-[11px] font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversation rating */}
              <div className="mb-5">
                <p className="text-small font-semibold mb-2 text-center">تقييم المحادثة</p>
                <StarRating value={convStars} onChange={setConvStars} />
              </div>

              {/* Agent rating */}
              {ratingPrefs.askAgentRating && (
                <div className="mb-5">
                  <p className="text-small font-semibold mb-2 text-center">
                    تقييم الموظف <span className="text-muted-light dark:text-muted-dark font-normal">({rating.agentName})</span>
                  </p>
                  <StarRating value={agentStars} onChange={setAgentStars} />
                </div>
              )}

              {/* Comment */}
              <div className="mb-5">
                <label className="text-small font-semibold mb-2 block">
                  ملاحظاتك <span className="text-muted-light dark:text-muted-dark font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="شاركنا تجربتك بالتفصيل..."
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-small px-3 py-2.5 rounded-xl mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                style={{ color: '#fff' }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white text-body font-semibold transition-colors shadow-lg shadow-primary/20"
              >
                إرسال التقييم
              </button>

              <p className="text-[11px] text-muted-light dark:text-muted-dark text-center mt-4">
                ملاحظاتك سرية ولن يتم مشاركتها مع أي طرف ثالث
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: JSX.Element; title: string; message: string }): JSX.Element {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-4">{icon}</div>
      <h2 className="text-h3 font-bold mb-2">{title}</h2>
      <p className="text-body text-muted-light dark:text-muted-dark">{message}</p>
    </div>
  );
}
