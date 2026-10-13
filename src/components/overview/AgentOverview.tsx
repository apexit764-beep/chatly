import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Inbox as InboxIcon, MessageSquare, Star, Timer } from 'lucide-react';
import { Card, ChannelIcon, StatCard } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useRatingStore } from '@/store/useRatingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { firstReplyCases } from '@/utils/firstReplySla';
import { averageAgentRating, averageReply, formatMinutes } from '@/utils/agentStats';
import { timeAgo } from '@/utils/format';
import type { Conversation } from '@/types';

/** Whether the last word in the thread is the customer's: the conversation is waiting on us. */
const awaitingReply = (c: Conversation): boolean => {
  const last = [...c.messages].reverse().find((m) => !m.isInternalNote);
  return last?.direction === 'in';
};

/** When the conversation was last closed: the recorded close, else its last activity. */
const closedAt = (c: Conversation): number => {
  const close = [...(c.sessionEvents ?? [])].reverse().find((e) => e.type === 'closed');
  return new Date(close?.timestamp ?? c.lastMessageAt).getTime();
};

/**
 * نظرة عامة مختصرة للموظف: أرقامه هو فقط، والمحادثات التي تنتظر ردّه. لا تظهر
 * فيها إحصائيات الشركة ولا أداء بقية الفريق.
 */
export function AgentOverview(): JSX.Element {
  const navigate = useNavigate();
  const currentUserId = useDataStore((s) => s.currentUserId);
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const channels = useDataStore((s) => s.channels);
  const ratings = useRatingStore((s) => s.ratings);
  const replyTarget = useSettingsStore((s) => s.general.firstReplyTargetMinutes);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);

  const me = agents.find((a) => a.id === currentUserId);
  const firstName = me?.name.split(' ')[0] ?? '';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  const mine = conversations.filter((c) => c.assignedTo === currentUserId);
  const open = mine.filter((c) => c.status !== 'closed');
  const waiting = open
    .filter(awaitingReply)
    .sort((a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime());
  const closedToday = mine.filter((c) => c.status === 'closed' && closedAt(c) >= today).length;
  const myIds = new Set(mine.map((c) => c.id));
  const replyToday = averageReply(
    firstReplyCases(conversations, replyTarget).filter((c) => myIds.has(c.conversationId) && c.startedAt >= today),
  );
  const rating = averageAgentRating(ratings, currentUserId);

  const openConversation = (id: string): void => {
    setSelectedId(id);
    navigate('/inbox');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 page-fade">
      <div className="bg-gradient-to-l from-primary to-primary-dark text-white rounded-card p-5 lg:p-6 shadow-lg">
        <p className="text-h1 font-bold leading-tight">مرحبًا، {firstName} 👋</p>
        <p className="text-body opacity-90 mt-1.5">
          {open.length === 0
            ? 'لا توجد محادثات مفتوحة مسندة إليك حاليًا.'
            : `لديك ${open.length} ${open.length === 1 ? 'محادثة مفتوحة' : 'محادثات مفتوحة'}${waiting.length > 0 ? `، منها ${waiting.length} بانتظار ردك.` : '، وجميعها تم الرد عليها.'}`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="محادثاتي المفتوحة"
          value={open.length}
          icon={<MessageSquare className="h-5 w-5" />}
          hint="المحادثات المسندة إليك وغير المغلقة."
        />
        <StatCard
          label="بانتظار ردي"
          value={waiting.length}
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-warning/15"
          iconColor="text-warning"
          hint="محادثات مفتوحة آخر رسالة فيها من العميل."
        />
        <StatCard
          label="أغلقتها اليوم"
          value={closedToday}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-success/15"
          iconColor="text-success"
        />
        <StatCard
          label="متوسط ردي اليوم"
          value={formatMinutes(replyToday.minutes)}
          icon={<Timer className="h-5 w-5" />}
          iconBg="bg-info/15"
          iconColor="text-info"
          hint={`متوسط وقت أول رد على المحادثات التي بدأت اليوم. هدف وقت الرد الأول ${replyTarget} دقيقة.`}
        />
        <StatCard
          label="تقييمي"
          value={rating.value === null ? '—' : `${rating.value.toFixed(1)} ★`}
          icon={<Star className="h-5 w-5" />}
          iconBg="bg-warning/15"
          iconColor="text-warning"
          hint={rating.count > 0 ? `متوسط ${rating.count} ${rating.count === 1 ? 'تقييم' : 'تقييمات'} من العملاء.` : 'لا توجد تقييمات بعد.'}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-h3 font-bold">محادثات بانتظار ردي</h3>
            <p className="text-small text-muted-light dark:text-muted-dark">الأقدم انتظارًا أولًا</p>
          </div>
          <button
            onClick={() => navigate('/inbox')}
            className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark inline-flex items-center gap-2"
          >
            <InboxIcon className="h-4 w-4" /> فتح صندوق الوارد
          </button>
        </div>
        {waiting.length === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark text-center pb-10 pt-4">لا توجد محادثات بانتظار ردك</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-5 py-2.5">العميل</th>
                  <th className="text-start font-medium px-5 py-2.5">آخر رسالة</th>
                  <th className="text-start font-medium px-5 py-2.5">القناة</th>
                  <th className="text-start font-medium px-5 py-2.5">بانتظار الرد منذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {waiting.map((c) => {
                  const contact = contacts.find((x) => x.id === c.contactId);
                  const channel = channels.find((x) => x.id === c.channelId);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className="cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                    >
                      <td className="px-5 py-3 font-medium whitespace-nowrap">{contact?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-light dark:text-muted-dark max-w-[360px]">
                        <span className="line-clamp-1">{c.lastMessage}</span>
                      </td>
                      <td className="px-5 py-3">
                        {channel ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <ChannelIcon type={channel.type} size={12} />
                            {channel.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-warning/15 text-warning text-[11px] font-semibold whitespace-nowrap">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
