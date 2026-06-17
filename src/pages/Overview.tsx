import { Link } from 'react-router-dom';
import { MessageCircle, Clock, Zap, UserPlus, ArrowLeft, Activity } from 'lucide-react';
import { Card, StatCard, Avatar, Badge } from '@components/ui';
import { LineChart } from '@components/charts/LineChart';
import { DoughnutChart } from '@components/charts/DoughnutChart';
import { useDataStore } from '@/store/useDataStore';
import {
  agentStatusColor,
  agentStatusLabel,
  conversationStatusColor,
  conversationStatusLabel,
} from '@/utils/labels';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function Overview(): JSX.Element {
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const agents = useDataStore((s) => s.agents);

  const todayConvs = conversations.length;
  const openConvs = conversations.filter((c) => c.status !== 'closed').length;
  const avgResponse = 3;
  const newContactsToday = 4;

  const statusBuckets = {
    new: conversations.filter((c) => c.status === 'new').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    closed: conversations.filter((c) => c.status === 'closed').length,
  };

  const recentConvs = [...conversations]
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, 5);

  const onlineAgents = agents.filter((a) => a.status === 'online').length;

  return (
    <div className="p-4 lg:p-6 space-y-6 page-fade">
      {/* Banner */}
      <div className="bg-gradient-to-l from-primary to-primary-dark text-white rounded-card p-5 lg:p-6 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div>
          <p className="text-h2 font-bold mb-1">أهلاً، سالم 👋</p>
          <p className="text-body opacity-90">إليك ملخص اليوم — {todayConvs} محادثة، {openConvs} مفتوحة</p>
        </div>
        <div className="flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-2 rounded-card">
          <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
          <span className="text-small font-medium">واتساب متصل · {onlineAgents}/{agents.length} وكلاء متاحون</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="محادثات اليوم"
          value={todayConvs}
          icon={<MessageCircle className="h-5 w-5" />}
          iconBg="bg-primary/15"
          iconColor="text-primary"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          label="محادثات مفتوحة"
          value={openConvs}
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-warning/15"
          iconColor="text-warning"
          trend={{ value: 8, positive: false }}
        />
        <StatCard
          label="متوسط وقت الرد"
          value={`${avgResponse} د`}
          icon={<Zap className="h-5 w-5" />}
          iconBg="bg-success/15"
          iconColor="text-success"
          trend={{ value: 18, positive: true }}
        />
        <StatCard
          label="عملاء جدد اليوم"
          value={newContactsToday}
          icon={<UserPlus className="h-5 w-5" />}
          iconBg="bg-info/15"
          iconColor="text-info"
          trend={{ value: 24, positive: true }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-h2 font-bold">محادثات آخر 7 أيام</h2>
              <p className="text-small text-muted-light dark:text-muted-dark">حسب الموظف</p>
            </div>
            <div className="flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark">
              <Activity className="h-4 w-4" />
              <span>تحديث مباشر</span>
            </div>
          </div>
          <LineChart
            labels={['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']}
            series={[
              { name: 'سالم', color: '#6C63FF', data: [12, 18, 15, 22, 20, 16, 14] },
              { name: 'فاطمة', color: '#10B981', data: [8, 14, 18, 17, 22, 14, 11] },
              { name: 'محمد', color: '#F59E0B', data: [6, 10, 12, 14, 18, 12, 8] },
              { name: 'خالد', color: '#3B82F6', data: [4, 8, 10, 9, 13, 10, 6] },
            ]}
          />
        </Card>

        <Card className="p-5">
          <h2 className="text-h2 font-bold mb-1">توزيع الحالات</h2>
          <p className="text-small text-muted-light dark:text-muted-dark mb-4">حالة المحادثات الحالية</p>
          <DoughnutChart
            size={180}
            data={[
              { label: 'جديد', value: statusBuckets.new, color: '#3B82F6' },
              { label: 'قيد المعالجة', value: statusBuckets.pending, color: '#F59E0B' },
              { label: 'مغلق', value: statusBuckets.closed, color: '#6B7280' },
            ]}
          />
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-h2 font-bold">آخر المحادثات</h2>
            <Link to="/inbox" className="text-small text-primary font-medium hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {recentConvs.map((conv) => {
              const contact = contacts.find((c) => c.id === conv.contactId);
              const agent = agents.find((a) => a.id === conv.assignedTo);
              if (!contact) return null;
              return (
                <Link
                  key={conv.id}
                  to="/inbox"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  <Avatar name={contact.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold truncate">{contact.name}</p>
                    <p className="text-small text-muted-light dark:text-muted-dark truncate">
                      {agent ? agent.name : 'غير مُسند'}
                    </p>
                  </div>
                  <Badge className={cn('text-[10px]', conversationStatusColor[conv.status])}>
                    {conversationStatusLabel[conv.status]}
                  </Badge>
                  <span className="text-small text-muted-light dark:text-muted-dark whitespace-nowrap">
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-h2 font-bold">أداء الموظفين</h2>
            <Link to="/team" className="text-small text-primary font-medium hover:underline flex items-center gap-1">
              التفاصيل <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {agents.map((agent) => {
              const handled = conversations.filter((c) => c.assignedTo === agent.id).length;
              return (
                <div key={agent.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={agent.name} size="sm" status={agent.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold truncate">{agent.name}</p>
                    <p className="text-small text-muted-light dark:text-muted-dark">
                      {handled} محادثة · {Math.round(2 + Math.random() * 4)} د متوسط
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', agentStatusColor[agent.status])} />
                    <span className="text-small text-muted-light dark:text-muted-dark">
                      {agentStatusLabel[agent.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
