import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Gift, Info, Lock, X } from 'lucide-react';
import { Avatar, ChannelIcon } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { channelTypeAllowed } from '@/utils/planChannels';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Agent, Channel, Plan } from '@/types';

type StepKey = 'offer' | 'keep' | 'confirm';

const STEP_LABEL: Record<StepKey, string> = {
  offer: 'عرض خاص',
  keep: 'ما يبقى شغّالًا',
  confirm: 'تأكيد',
};

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  currentPlan: Plan;
  newPlan: Plan;
  cycle: 'monthly' | 'yearly';
  /** When the lower plan takes over — the end of the current period. */
  effectiveAt: string;
  currentPrice: number;
  newPrice: number;
  currency: string;
  /** Features the current plan has and the new one does not. */
  lostFeatures: string[];
}

/** Arabic counted noun: 1 شهر، 2 شهرين، 3–10 أشهر، 11+ شهرًا. */
function periodsLabel(n: number, cycle: 'monthly' | 'yearly'): string {
  const [one, two, few, many] = cycle === 'monthly'
    ? ['شهر', 'شهرين', 'أشهر', 'شهرًا']
    : ['سنة', 'سنتين', 'سنوات', 'سنة'];
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}

const countLabel = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

const isOwner = (a: Agent): boolean => a.roleId === 'role_owner';

/**
 * تخفيض الباقة على خطوات: عرض الاحتفاظ أولًا، ثم اختيار ما يبقى شغّالًا إن كان
 * الاستخدام الحالي أكبر من حدود الباقة الأقل، ثم التأكيد. ما لا يُختار يتوقف في
 * تاريخ التخفيض ويبقى محفوظًا بدون حذف.
 */
export function DowngradeDialog({
  open,
  onClose,
  clientId,
  currentPlan,
  newPlan,
  cycle,
  effectiveAt,
  currentPrice,
  newPrice,
  currency,
  lostFeatures,
}: Props): JSX.Element | null {
  const retentionOffer = useAdminStore((s) => s.retentionOffer);
  const retentionOfferUsedBy = useAdminStore((s) => s.retentionOfferUsedBy);
  const schedulePlanChange = useAdminStore((s) => s.schedulePlanChange);
  const acceptRetentionOffer = useAdminStore((s) => s.acceptRetentionOffer);
  const agents = useDataStore((s) => s.agents);
  const channels = useDataStore((s) => s.channels);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  // Suspended staff are already off and stay that way, so they are not candidates.
  const candidateAgents = useMemo(() => agents.filter((a) => a.invitationStatus !== 'suspended'), [agents]);
  const sortedChannels = useMemo(
    () => [...channels].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [channels],
  );
  const eligibleChannels = useMemo(
    () => sortedChannels.filter((c) => channelTypeAllowed(newPlan.tier, c.type)),
    [sortedChannels, newPlan.tier],
  );

  const agentLimit = newPlan.limits.agents;
  const channelLimit = newPlan.limits.channels;
  const agentsOver = agentLimit !== -1 && candidateAgents.length > agentLimit;
  const channelsOver = channelLimit !== -1 && channels.length > channelLimit;
  const blockedTypes = eligibleChannels.length < channels.length;
  const agentsToKeep = agentLimit === -1 ? candidateAgents.length : Math.min(agentLimit, candidateAgents.length);
  const channelsToKeep = channelLimit === -1 ? eligibleChannels.length : Math.min(channelLimit, eligibleChannels.length);

  const offerAvailable = retentionOffer.enabled && retentionOffer.percent > 0 && !retentionOfferUsedBy.includes(clientId);
  const needsKeep = agentsOver || channelsOver || blockedTypes;

  const steps: StepKey[] = useMemo(
    () => [...(offerAvailable ? (['offer'] as const) : []), ...(needsKeep ? (['keep'] as const) : []), 'confirm'],
    // The step list is fixed for one opening — accepting the offer closes the dialog anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );
  const [step, setStep] = useState(0);

  // The oldest stay by default; the owner always does.
  const defaultAgents = (): string[] => {
    const owners = candidateAgents.filter(isOwner);
    const rest = candidateAgents.filter((a) => !isOwner(a));
    return [...owners, ...rest].slice(0, Math.max(agentsToKeep, owners.length)).map((a) => a.id);
  };
  const defaultChannels = (): string[] => eligibleChannels.slice(0, channelsToKeep).map((c) => c.id);

  const [keepAgents, setKeepAgents] = useState<string[]>([]);
  const [keepChannels, setKeepChannels] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setKeepAgents(defaultAgents());
    setKeepChannels(defaultChannels());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const key = steps[step];
  const isLast = step === steps.length - 1;
  const cycleWord = cycle === 'yearly' ? 'سنة' : 'شهر';
  const discountedPrice = Math.round(currentPrice * (1 - retentionOffer.percent / 100) * 1000) / 1000;
  const offerDuration = periodsLabel(retentionOffer.periods, cycle);

  const agentsOk = !agentsOver || keepAgents.length === agentsToKeep;
  const channelsOk = keepChannels.length === channelsToKeep;
  const keepValid = agentsOk && channelsOk;

  const stoppedAgents = candidateAgents.filter((a) => !keepAgents.includes(a.id));
  const stoppedChannels = channels.filter((c) => !keepChannels.includes(c.id));

  const toggle = (list: string[], set: (v: string[]) => void, id: string, cap: number): void => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else if (list.length < cap) set([...list, id]);
  };

  const takeOffer = (): void => {
    acceptRetentionOffer(clientId);
    showToast(`تم تفعيل خصم ${retentionOffer.percent}% على باقة ${currentPlan.nameAr} لمدة ${offerDuration}`, 'success');
    onClose();
  };

  const confirm = (): void => {
    schedulePlanChange(
      clientId,
      newPlan.id,
      cycle,
      needsKeep ? { agentIds: keepAgents, channelIds: keepChannels } : undefined,
    );
    showToast(`تمت جدولة باقة ${newPlan.nameAr} في ${formatDate(effectiveAt)}`, 'success');
    navigate('/billing');
  };

  const title = key === 'offer' ? 'قبل ما تخفّض باقتك' : `تخفيض إلى باقة ${newPlan.nameAr}`;
  const limitText = (n: number): string => (n === -1 ? 'بدون حد' : n.toLocaleString('en'));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border-light dark:border-border-dark flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
                aria-label="رجوع"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="text-h3 font-bold">{title}</h2>
              <p className="text-[11px] text-muted-light dark:text-muted-dark">
                {steps.length > 1 ? `الخطوة ${step + 1} من ${steps.length} · ${STEP_LABEL[key]}` : STEP_LABEL[key]}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>

        {steps.length > 1 && (
          <div className="h-1 bg-bg-light dark:bg-bg-dark flex-shrink-0">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {key === 'offer' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-card border border-success/30 bg-success/5 p-5 flex flex-col">
                <div className="h-10 w-10 rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
                  <Gift className="h-5 w-5" />
                </div>
                <p className="text-small text-muted-light dark:text-muted-dark">عرض لك</p>
                <p className="text-h2 font-bold mt-1">
                  خصم {retentionOffer.percent}% لمدة {offerDuration}
                </p>
                <p className="text-body text-muted-light dark:text-muted-dark mt-1 leading-relaxed">
                  خليك على باقة {currentPlan.nameAr} بكل مزاياها وحدودها، بسعر أقل.
                </p>
                <div className="mt-auto pt-5 flex items-baseline gap-2">
                  <span className="text-h2 font-bold text-success">{formatMoney(discountedPrice, currency)}</span>
                  <span className="text-small text-muted-light dark:text-muted-dark">/ {cycleWord}</span>
                  <span className="text-small text-muted-light dark:text-muted-dark line-through ms-2">
                    {formatMoney(currentPrice, currency)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1">
                  يرجع السعر العادي بعد {offerDuration}. العرض متاح مرة واحدة لكل حساب.
                </p>
              </div>

              <div className="rounded-card border border-border-light dark:border-border-dark p-5">
                <p className="text-body font-semibold mb-3">تحتفظ بكل اللي عندك الآن</p>
                <ul className="space-y-2 text-small">
                  <LimitLine label="موظفين" limit={currentPlan.limits.agents} used={candidateAgents.length} />
                  <LimitLine label="قنوات" limit={currentPlan.limits.channels} used={channels.length} />
                  <LimitLine label="محادثة شهريًا" limit={currentPlan.limits.conversations} />
                  {lostFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {lostFeatures.length > 0 && (
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-3">
                    هذه المزايا غير موجودة في باقة {newPlan.nameAr}.
                  </p>
                )}
              </div>
            </div>
          )}

          {key === 'keep' && (
            <div className="space-y-4">
              <div className="rounded-card border border-border-light dark:border-border-dark overflow-hidden">
                <table className="w-full text-small">
                  <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className="text-start font-medium px-4 py-2">الحد</th>
                      <th className="text-start font-medium px-4 py-2">الباقة الحالية</th>
                      <th className="text-start font-medium px-4 py-2">{newPlan.nameAr}</th>
                      <th className="text-start font-medium px-4 py-2">يتوقف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {agentsOver && (
                      <tr>
                        <td className="px-4 py-2.5">الموظفون</td>
                        <td className="px-4 py-2.5">{candidateAgents.length}</td>
                        <td className="px-4 py-2.5">{limitText(agentLimit)}</td>
                        <td className="px-4 py-2.5">
                          <Pill className="bg-warning/10 text-warning border-warning/20">{candidateAgents.length - agentsToKeep}</Pill>
                        </td>
                      </tr>
                    )}
                    {(channelsOver || blockedTypes) && (
                      <tr>
                        <td className="px-4 py-2.5">القنوات</td>
                        <td className="px-4 py-2.5">{channels.length}</td>
                        <td className="px-4 py-2.5">{limitText(channelLimit)}</td>
                        <td className="px-4 py-2.5">
                          <Pill className="bg-warning/10 text-warning border-warning/20">{channels.length - channelsToKeep}</Pill>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-small text-muted-light dark:text-muted-dark">
                اختر ما يبقى شغّالًا بعد {formatDate(effectiveAt)}. الباقي يتوقف بدون حذف، ويرجع إذا رقّيت.
              </p>

              <div className={cn('grid gap-4', agentsOver && (channelsOver || blockedTypes) && 'md:grid-cols-2')}>
                {agentsOver && (
                  <KeepPanel title="الموظفون" selected={keepAgents.length} required={agentsToKeep}>
                    {candidateAgents.map((a) => {
                      const locked = isOwner(a);
                      const checked = keepAgents.includes(a.id);
                      const full = !checked && keepAgents.length >= agentsToKeep;
                      return (
                        <KeepRow
                          key={a.id}
                          checked={checked}
                          disabled={locked || full}
                          onToggle={() => !locked && toggle(keepAgents, setKeepAgents, a.id, agentsToKeep)}
                          icon={<Avatar name={a.name} size="sm" />}
                          title={a.name}
                          subtitle={a.email}
                          tag={
                            locked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-light dark:text-muted-dark">
                                <Lock className="h-3 w-3" /> المالك
                              </span>
                            ) : !checked ? (
                              <Pill className="bg-danger/10 text-danger border-danger/20">
                                {a.invitationStatus === 'pending' ? 'دعوة تُلغى' : 'يتوقف'}
                              </Pill>
                            ) : a.invitationStatus === 'pending' ? (
                              <Pill className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark">دعوة معلّقة</Pill>
                            ) : null
                          }
                        />
                      );
                    })}
                  </KeepPanel>
                )}

                {(channelsOver || blockedTypes) && (
                  <KeepPanel title="القنوات" selected={keepChannels.length} required={channelsToKeep}>
                    {sortedChannels.map((c: Channel) => {
                      const allowed = channelTypeAllowed(newPlan.tier, c.type);
                      const checked = keepChannels.includes(c.id);
                      const full = !checked && keepChannels.length >= channelsToKeep;
                      return (
                        <KeepRow
                          key={c.id}
                          checked={checked}
                          disabled={!allowed || full}
                          onToggle={() => allowed && toggle(keepChannels, setKeepChannels, c.id, channelsToKeep)}
                          icon={<ChannelIcon type={c.type} size={16} />}
                          title={c.name}
                          subtitle={c.identifier}
                          tag={
                            !allowed ? (
                              <Pill className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark">
                                غير متاحة في {newPlan.nameAr}
                              </Pill>
                            ) : !checked ? (
                              <Pill className="bg-danger/10 text-danger border-danger/20">يتوقف</Pill>
                            ) : null
                          }
                        />
                      );
                    })}
                  </KeepPanel>
                )}
              </div>
            </div>
          )}

          {key === 'confirm' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-card border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark text-small h-fit">
                <SummaryRow label="الباقة الجديدة" value={newPlan.nameAr} />
                <SummaryRow label="تبدأ في" value={formatDate(effectiveAt)} />
                <SummaryRow
                  label="السعر الجديد"
                  value={
                    <span className="font-bold text-primary">
                      {formatMoney(newPrice, currency)}
                      <span className="font-normal text-muted-light dark:text-muted-dark"> / {cycleWord}</span>
                    </span>
                  }
                />
                {needsKeep && (
                  <SummaryRow
                    label="يتوقف"
                    value={[
                      stoppedAgents.length > 0 ? countLabel(stoppedAgents.length, 'موظف', 'موظفين') : null,
                      stoppedChannels.length > 0 ? countLabel(stoppedChannels.length, 'قناة', 'قنوات') : null,
                    ].filter(Boolean).join(' · ') || 'لا شيء'}
                  />
                )}
              </div>

              <div className="space-y-4">
                {lostFeatures.length > 0 && (
                  <div>
                    <p className="text-small font-semibold mb-2">مزايا تتوقف</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lostFeatures.map((f) => (
                        <Pill key={f} className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark">
                          {f}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-card bg-primary/5 border border-primary/20 p-4 flex gap-3 text-small leading-relaxed">
                  <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p>
                    تكمل باقتك الحالية طبيعيًا حتى {formatDate(effectiveAt)}. المحادثات وجهات الاتصال الفعّالة يبدأ
                    عدّها من جديد فور التخفيض. كل ما يتوقف يبقى محفوظًا بدون حذف ويرجع إذا رقّيت، وتقدر تعدّل
                    اختيارك أو تلغي التخفيض لحد {formatDate(effectiveAt)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2 flex-shrink-0">
          {key === 'offer' ? (
            <>
              <button
                onClick={() => setStep(step + 1)}
                className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
              >
                متابعة التخفيض
              </button>
              <button
                onClick={takeOffer}
                className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors"
                style={{ color: '#fff' }}
              >
                خذ الخصم وابقَ على {currentPlan.nameAr}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-full text-small font-medium text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark"
              >
                إلغاء
              </button>
              <button
                onClick={isLast ? confirm : () => setStep(step + 1)}
                disabled={key === 'keep' && !keepValid}
                className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#fff' }}
              >
                {isLast ? 'تأكيد التخفيض' : 'التالي'}
                {!isLast && <ArrowLeft className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Status pill in the same shape as the template status badge. `Badge` itself can't
 * take a colour here: twMerge reads `text-small` and `text-danger` as one group and
 * keeps only the colour, so the label falls back to body size.
 */
function Pill({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full border text-[11.5px] font-semibold whitespace-nowrap flex-shrink-0', className)}>
      {children}
    </span>
  );
}

function LimitLine({ label, limit, used }: { label: string; limit: number; used?: number }): JSX.Element {
  return (
    <li className="flex items-start gap-2">
      <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
      <span>
        {limit === -1 ? `${label} بدون حد` : `${limit.toLocaleString('en')} ${label}`}
        {used !== undefined && <span className="text-muted-light dark:text-muted-dark"> (عندك {used})</span>}
      </span>
    </li>
  );
}

function KeepPanel({ title, selected, required, children }: { title: string; selected: number; required: number; children: ReactNode }): JSX.Element {
  const done = selected === required;
  return (
    <div className="rounded-card border border-border-light dark:border-border-dark overflow-hidden">
      <div className="px-4 py-2.5 bg-bg-light dark:bg-bg-dark flex items-center justify-between">
        <span className="text-small font-semibold">{title}</span>
        <span className={cn('text-small font-semibold', done ? 'text-success' : 'text-warning')}>
          {selected} / {required}
        </span>
      </div>
      <div className="divide-y divide-border-light dark:divide-border-dark max-h-72 overflow-y-auto">{children}</div>
    </div>
  );
}

function KeepRow({
  checked,
  disabled,
  onToggle,
  icon,
  title,
  subtitle,
  tag,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  tag: ReactNode;
}): JSX.Element {
  return (
    <label
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark',
        !checked && 'opacity-70',
      )}
    >
      <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} disabled={disabled} onChange={onToggle} />
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-small font-medium truncate">{title}</p>
        <p className="text-[11px] text-muted-light dark:text-muted-dark truncate" dir="ltr" style={{ textAlign: 'right' }}>{subtitle}</p>
      </div>
      {tag}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="flex justify-between gap-3 p-4">
      <span className="text-muted-light dark:text-muted-dark">{label}</span>
      <span className="font-semibold text-end">{value}</span>
    </div>
  );
}
