import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox as InboxIcon,
  MessageSquare,
  Pencil,
  Power,
  ShieldCheck,
  Star,
  Timer,
  UserRound,
  UserX,
} from 'lucide-react';
import { Avatar, Card, ChannelIcon, DateRangePicker, EmptyState, StatCard, useConfirm } from '@components/ui';
import { BarChart } from '@components/charts/BarChart';
import { PlanLimitModal } from '@components/billing/PlanLimitModal';
import { useDataStore } from '@/store/useDataStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useRatingStore } from '@/store/useRatingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { firstReplyCases } from '@/utils/firstReplySla';
import { averageAgentRating, averageReply, formatMinutes } from '@/utils/agentStats';
import { agentStatusColor, agentStatusLabel } from '@/utils/labels';
import { formatDate, timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Conversation } from '@/types';

type Tab = 'overview' | 'details' | 'ratings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'details', label: 'التفاصيل الأساسية' },
  { key: 'ratings', label: 'التقييمات' },
];

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const startOfDay = (d: Date): Date => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const addDays = (d: Date, n: number): Date => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

/** When a conversation began: its first message, else its last activity. */
const startedAt = (c: Conversation): number => new Date(c.messages[0]?.timestamp ?? c.lastMessageAt).getTime();

/**
 * صفحة تفاصيل الموظف: أداؤه في الفترة المحددة، وبياناته الأساسية، وتقييمات
 * العملاء له. يُفتح من «فريق العمل» ومن جدول أداء الموظفين في التقارير.
 */
export default function AgentDetail(): JSX.Element {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agents = useDataStore((s) => s.agents);
  const roles = useDataStore((s) => s.roles);
  const departments = useDataStore((s) => s.departments);
  const channels = useDataStore((s) => s.channels);
  const contacts = useDataStore((s) => s.contacts);
  const allConversations = useDataStore((s) => s.conversations);
  const updateAgent = useDataStore((s) => s.updateAgent);
  const ratings = useRatingStore((s) => s.ratings);
  const replyTarget = useSettingsStore((s) => s.general.firstReplyTargetMinutes);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);
  const showToast = useUIStore((s) => s.showToast);
  const { agentsReached } = usePlanLimits();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<Tab>('overview');
  const [dateFrom, setDateFrom] = useState(() => startOfDay(addDays(new Date(), -29)));
  const [dateTo, setDateTo] = useState(() => startOfDay(new Date()));
  const [planLimitOpen, setPlanLimitOpen] = useState(false);

  const agent = agents.find((a) => a.id === agentId);

  const mine = useMemo(
    () => allConversations.filter((c) => c.assignedTo === agentId),
    [allConversations, agentId],
  );

  if (!agent) {
    return (
      <div className="p-4 lg:p-6 page-fade">
        <Card className="p-10">
          <EmptyState
            icon={<UserX className="h-8 w-8" />}
            title="الموظف غير موجود"
            description="قد يكون الحساب محذوفًا أو أُلغيت دعوته."
            action={
              <Link to="/team" className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold inline-flex items-center" style={{ color: '#fff' }}>
                العودة لفريق العمل
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const role = roles.find((r) => r.id === agent.roleId);
  const agentDepts = departments.filter((d) => agent.departments.includes(d.id));
  const agentChannels = channels.filter((c) => agent.channels.includes(c.id));
  const isOwner = agent.roleId === 'role_owner';
  const isSuspended = agent.invitationStatus === 'suspended';
  const isPending = agent.invitationStatus === 'pending';

  // ── Overview: the period follows the date filter; "open now" does not. ──
  const from = dateFrom.getTime();
  const to = addDays(dateTo, 1).getTime();
  const inRange = mine.filter((c) => { const t = startedAt(c); return t >= from && t < to; });
  const closed = inRange.filter((c) => c.status === 'closed').length;
  const resolution = inRange.length > 0 ? Math.round((closed / inRange.length) * 100) : null;
  const myIds = new Set(mine.map((c) => c.id));
  const replies = averageReply(
    firstReplyCases(allConversations, replyTarget).filter((c) => myIds.has(c.conversationId) && c.startedAt >= from && c.startedAt < to),
  );
  const rating = averageAgentRating(ratings, agent.id);
  const openNow = mine.filter((c) => c.status !== 'closed');
  const cap = agent.maxConcurrent ?? 0;

  const days = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1);
  const perDay = Array.from({ length: days }, (_, i) => {
    const d0 = addDays(dateFrom, i).getTime();
    const d1 = addDays(dateFrom, i + 1).getTime();
    return inRange.filter((c) => { const t = startedAt(c); return t >= d0 && t < d1; }).length;
  });
  const dayLabels = perDay.map((_, i) => {
    const d = addDays(dateFrom, i);
    return days <= 7 ? DAY_NAMES[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`;
  });

  // ── Ratings: all time, as on the ratings page — a rating lands days after the chat closed. ──
  const myRatings = ratings
    .filter((r) => r.agentId === agent.id && r.submittedAt && r.ratingAgent != null)
    .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime());
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, count: myRatings.filter((r) => r.ratingAgent === n).length }));
  const maxBucket = Math.max(1, ...distribution.map((d) => d.count));

  const openConversation = (id: string): void => {
    setSelectedId(id);
    navigate('/inbox');
  };

  const toggleSuspend = async (): Promise<void> => {
    if (isSuspended) {
      // Bringing someone back takes a seat, so it is held to the plan like an invitation.
      if (agentsReached) { setPlanLimitOpen(true); return; }
      updateAgent(agent.id, { invitationStatus: 'active', planSuspended: undefined });
      showToast('تم إعادة تفعيل الحساب', 'success');
      return;
    }
    const ok = await confirm({
      title: `إيقاف حساب ${agent.name}؟`,
      message: 'لن يتمكن من تسجيل الدخول أو استقبال المحادثات حتى تتم إعادة تفعيل حسابه. تبقى محادثاته وسجلّه دون تغيير.',
      variant: 'warning',
      confirmText: 'إيقاف الحساب',
      cancelText: 'تراجع',
    });
    if (!ok) return;
    updateAgent(agent.id, { invitationStatus: 'suspended', status: 'offline' });
    showToast('تم إيقاف الحساب', 'success');
  };

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark">
        <Link to="/team" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowRight className="h-3.5 w-3.5" /> فريق العمل
        </Link>
        <span>/</span>
        <span className="text-current font-medium">{agent.name}</span>
      </div>

      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={agent.name} size="lg" status={isPending || isSuspended ? 'offline' : agent.status} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-h2 font-bold">{agent.name}</h1>
                {role && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{role.name}</span>
                )}
                {isSuspended ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger">موقوف</span>
                ) : isPending ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">بانتظار قبول الدعوة</span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-bg-light dark:bg-bg-dark inline-flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', agentStatusColor[agent.status])} />
                    {agentStatusLabel[agent.status]}
                  </span>
                )}
              </div>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1 truncate">
                <span dir="ltr">{agent.email}</span>
                {agentDepts.length > 0 && ` · ${agentDepts.map((d) => d.name).join('، ')}`}
                {!isPending && ` · آخر نشاط ${timeAgo(agent.lastActive)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* The owner's account is the company's — it is never suspended from here. */}
            {!isOwner && !isPending && (
              <button
                onClick={() => void toggleSuspend()}
                className={cn(
                  'h-10 px-4 rounded-full border text-small font-medium inline-flex items-center gap-2 transition-colors',
                  isSuspended
                    ? 'border-success/30 text-success hover:bg-success/10'
                    : 'border-danger/30 text-danger hover:bg-danger/10',
                )}
              >
                <Power className="h-4 w-4" /> {isSuspended ? 'إعادة تفعيل الحساب' : 'إيقاف الحساب'}
              </button>
            )}
            <button
              onClick={() => navigate(`/team?edit=${agent.id}`)}
              className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold inline-flex items-center gap-2 transition-colors"
              style={{ color: '#fff' }}
            >
              <Pencil className="h-4 w-4" /> تعديل البيانات
            </button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border-light dark:border-border-dark">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={cn(
              'h-11 px-4 text-body font-semibold border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current',
            )}
          >
            {t.label}
            {t.key === 'ratings' && myRatings.length > 0 && (
              <span className="ms-1.5 text-[11px] text-muted-light dark:text-muted-dark">({myRatings.length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChangeRange={(f, t) => { setDateFrom(f); setDateTo(t); }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              label="المحادثات المسندة"
              value={inRange.length}
              icon={<MessageSquare className="h-5 w-5" />}
              hint="المحادثات المسندة له التي بدأت خلال الفترة المحددة."
            />
            <StatCard
              label="معدل الحل"
              value={resolution === null ? '—' : `${resolution}%`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconBg="bg-success/15"
              iconColor="text-success"
              hint={`${closed} محادثة مغلقة من أصل ${inRange.length} محادثة مسندة خلال الفترة.`}
            />
            <StatCard
              label="متوسط أول رد"
              value={formatMinutes(replies.minutes)}
              icon={<Timer className="h-5 w-5" />}
              iconBg="bg-info/15"
              iconColor="text-info"
              hint={`هدف وقت الرد الأول ${replyTarget} دقيقة${replies.count > 0 ? ` · من ${replies.count} ${replies.count === 1 ? 'رد' : 'ردود'}` : ''}.`}
            />
            <StatCard
              label="التقييم"
              value={rating.value === null ? '—' : `${rating.value.toFixed(1)} ★`}
              icon={<Star className="h-5 w-5" />}
              iconBg="bg-warning/15"
              iconColor="text-warning"
              hint={rating.count > 0 ? `متوسط ${rating.count} ${rating.count === 1 ? 'تقييم' : 'تقييمات'} من العملاء، لكل الفترات.` : 'لا توجد تقييمات بعد.'}
            />
            <StatCard
              label="مفتوحة الآن"
              value={cap > 0 ? `${openNow.length} / ${cap}` : openNow.length}
              icon={<InboxIcon className="h-5 w-5" />}
              hint={cap > 0 ? `من الحد الأقصى للمحادثات المتزامنة (${cap}).` : 'بدون حد أقصى للمحادثات المتزامنة.'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card className="p-5 lg:col-span-3">
              <h3 className="text-h3 font-bold">المحادثات حسب اليوم</h3>
              <p className="text-small text-muted-light dark:text-muted-dark mb-3">المحادثات المسندة له خلال الفترة المحددة</p>
              {inRange.length === 0 ? (
                <p className="text-small text-muted-light dark:text-muted-dark py-12 text-center">لا توجد محادثات مسندة له في هذه الفترة</p>
              ) : (
                <BarChart labels={dayLabels} data={perDay} color="#2563EB" height={220} />
              )}
            </Card>

            <Card className="lg:col-span-2 overflow-hidden">
              <div className="px-5 py-4">
                <h3 className="text-h3 font-bold">محادثاته المفتوحة الآن</h3>
              </div>
              {openNow.length === 0 ? (
                <p className="text-small text-muted-light dark:text-muted-dark pb-10 pt-6 text-center">لا توجد محادثات مفتوحة</p>
              ) : (
                <table className="w-full text-small">
                  <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className="text-start font-medium px-4 py-2">العميل</th>
                      <th className="text-start font-medium px-4 py-2">القناة</th>
                      <th className="text-start font-medium px-4 py-2">الرد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {openNow.map((c) => {
                      const contact = contacts.find((x) => x.id === c.contactId);
                      const channel = channels.find((x) => x.id === c.channelId);
                      const last = c.messages[c.messages.length - 1];
                      const waiting = last?.direction === 'in';
                      return (
                        <tr
                          key={c.id}
                          onClick={() => openConversation(c.id)}
                          className="cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium">{contact?.name ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {channel ? (
                              <span className="inline-flex items-center gap-1.5">
                                <ChannelIcon type={channel.type} size={12} />
                                <span className="truncate max-w-[110px]">{channel.name}</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {waiting ? (
                              <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-warning/15 text-warning text-[11px] font-semibold whitespace-nowrap">
                                <Clock className="h-3 w-3" /> بانتظار الرد · {timeAgo(last.timestamp)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-success/15 text-success text-[11px] font-semibold">تم الرد</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Section icon={<UserRound className="h-4 w-4" />} title="معلومات الحساب">
            <Field label="الاسم">{agent.name}</Field>
            <Field label="البريد الإلكتروني"><span dir="ltr">{agent.email}</span></Field>
            <Field label="الجوال">{agent.phone ? <span dir="ltr">{agent.phone}</span> : <Muted>غير مُضاف</Muted>}</Field>
            <Field label="حالة الحساب">
              <span className="inline-flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  isSuspended ? 'bg-danger/10 text-danger' : isPending ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success',
                )}>
                  {isSuspended ? 'موقوف' : isPending ? 'بانتظار قبول الدعوة' : 'نشط'}
                </span>
                {isPending && agent.invitedAt && <Muted>أُرسلت الدعوة في {formatDate(agent.invitedAt)}</Muted>}
                {agent.planSuspended && <Muted>أُوقف بسبب تخفيض الباقة</Muted>}
              </span>
            </Field>
          </Section>

          <Section icon={<ShieldCheck className="h-4 w-4" />} title="الدور والوصول">
            <Field label="الدور">
              <span className="inline-flex items-center gap-2">
                {role?.name ?? '—'}
                <Link to="/team/roles" className="text-small font-normal text-primary hover:underline">عرض الصلاحيات</Link>
              </span>
            </Field>
            <Field label="الأقسام">
              {agentDepts.length > 0 ? (
                <Chips items={agentDepts.map((d) => ({ key: d.id, label: d.name }))} />
              ) : <Muted>غير مرتبط بأي قسم</Muted>}
            </Field>
            <Field label="القنوات المسموحة">
              {agentChannels.length > 0 ? (
                <Chips
                  items={agentChannels.map((c) => ({
                    key: c.id,
                    label: c.name,
                    icon: <ChannelIcon type={c.type} size={12} plain />,
                  }))}
                />
              ) : <Muted>لا توجد قنوات مسموحة</Muted>}
            </Field>
          </Section>

          <Section icon={<Clock className="h-4 w-4" />} title="العمل والتوزيع">
            <Field label="ساعات العمل">
              {agent.workingHours?.enabled ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {DAY_NAMES.map((d, i) => (
                      <span
                        key={d}
                        className={cn(
                          'h-7 px-2 rounded-md text-[11px] font-semibold inline-flex items-center',
                          agent.workingHours!.days.includes(i)
                            ? 'bg-primary/10 text-primary'
                            : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
                        )}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <p className="text-small">
                    {to12h(agent.workingHours.start)} – {to12h(agent.workingHours.end)}
                    {agent.timezone && <Muted> · {agent.timezone}</Muted>}
                  </p>
                </div>
              ) : <Muted>غير محددة، ويستقبل المحادثات في أي وقت</Muted>}
            </Field>
            <Field label="الحد الأقصى للمحادثات المتزامنة">{cap > 0 ? `${cap} محادثات` : 'بدون حد'}</Field>
            <Field label="إخفاء أرقام العملاء">{agent.hidePhoneNumbers ? 'مُفعّل' : 'غير مُفعّل'}</Field>
          </Section>
        </div>
      )}

      {tab === 'ratings' && (
        myRatings.length === 0 ? (
          <Card className="p-10">
            <EmptyState
              icon={<Star className="h-8 w-8" />}
              title="لا توجد تقييمات بعد"
              description="تظهر هنا تقييمات العملاء بعد إغلاق محادثاتهم وإرسال رابط التقييم إليهم."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="p-5 flex items-center gap-8 flex-wrap border-b border-border-light dark:border-border-dark">
              <div className="text-center min-w-[120px]">
                <p className="text-display font-extrabold leading-none">{rating.value?.toFixed(1)}</p>
                <Stars value={Math.round(rating.value ?? 0)} className="justify-center mt-2" />
                <p className="text-small text-muted-light dark:text-muted-dark mt-1">{rating.count} {rating.count === 1 ? 'تقييم' : 'تقييمات'}</p>
              </div>
              <div className="flex-1 min-w-[220px] max-w-md space-y-1.5">
                {distribution.map(({ n, count }) => (
                  <div key={n} className="flex items-center gap-3 text-small">
                    <span className="w-3 tabular-nums text-muted-light dark:text-muted-dark">{n}</span>
                    <div className="flex-1 h-2 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${(count / maxBucket) * 100}%` }} />
                    </div>
                    <span className="w-6 tabular-nums text-end">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-small">
                <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                  <tr>
                    <th className="text-start font-medium px-4 py-2.5">العميل</th>
                    <th className="text-start font-medium px-4 py-2.5">التقييم</th>
                    <th className="text-start font-medium px-4 py-2.5">التعليق</th>
                    <th className="text-start font-medium px-4 py-2.5">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {myRatings.map((r) => (
                    <tr key={r.token}>
                      <td className="px-4 py-3 font-medium">{r.contactName}</td>
                      <td className="px-4 py-3"><Stars value={r.ratingAgent ?? 0} /></td>
                      <td className="px-4 py-3 text-muted-light dark:text-muted-dark max-w-[360px]">
                        {r.comment ? <span className="line-clamp-2">{r.comment}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-light dark:text-muted-dark whitespace-nowrap">{formatDate(r.submittedAt!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      <PlanLimitModal open={planLimitOpen} onClose={() => setPlanLimitOpen(false)} />
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</span>
        <h3 className="text-body font-bold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-[11px] text-muted-light dark:text-muted-dark mb-1">{label}</p>
      <div className="text-body font-medium">{children}</div>
    </div>
  );
}

/** "14:30" → "2:30 م": the stored 24h time, read the way the rest of the panel shows it. */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function Muted({ children }: { children: ReactNode }): JSX.Element {
  return <span className="text-small font-normal text-muted-light dark:text-muted-dark">{children}</span>;
}

function Chips({ items }: { items: { key: string; label: string; icon?: ReactNode }[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i.key} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-normal">
          {i.icon}
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Stars({ value, className }: { value: number; className?: string }): JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-3.5 w-3.5', n <= value ? 'fill-warning text-warning' : 'text-border-light dark:text-border-dark')} />
      ))}
    </span>
  );
}
