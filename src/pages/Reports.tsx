import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Download,
  FileText,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ArrowLeftRight,
  Bot,
} from 'lucide-react';
import { Card, StatCard, Avatar, DateRangePicker } from '@components/ui';
import { ChannelIcon } from '@components/ui/ChannelIcon';
import { LineChart } from '@components/charts/LineChart';
import { BarChart } from '@components/charts/BarChart';
import { Heatmap } from '@components/charts/Heatmap';
import { useDataStore } from '@/store/useDataStore';
import { useAIStore } from '@/store/useAIStore';
import { useUIStore } from '@/store/useUIStore';
import { downloadCsv, printAsPdf } from '@/utils/csv';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';
import { firstReplyCases, isAgentReply, type FirstReplyCase } from '@/utils/firstReplySla';
import { useRatingStore, type Rating } from '@/store/useRatingStore';
import { useSettingsStore } from '@/store/useSettingsStore';

type Range = 'today' | 'week' | 'month' | 'custom';

function startOfDay(d: Date): Date { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export default function Reports(): JSX.Element {
  const agents = useDataStore((s) => s.agents);
  const allConversations = useDataStore((s) => s.conversations);
  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const replyTarget = useSettingsStore((s) => s.general.firstReplyTargetMinutes);
  const ratings = useRatingStore((s) => s.ratings);
  const contacts = useDataStore((s) => s.contacts);
  const aiSettings = useAIStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [range, setRange] = useState<Range>('week');
  const [dateFrom, setDateFrom] = useState(() => startOfDay(addDays(new Date(), -6)));
  const [dateTo, setDateTo] = useState(() => startOfDay(new Date()));
  const [rangeKey, setRangeKey] = useState(0);
  const [slaDept, setSlaDept] = useState<string>('all');

  const dayLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // === Real data derived from store ===
  const conversations = channelFilter === 'all'
    ? allConversations
    : allConversations.filter((c) => c.channelId === channelFilter);

  const daysCount = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1);
  const rangeStart = new Date(dateFrom);

  // Line chart — new conversations per day (based on lastMessageAt as proxy)
  const newConvsLine: number[] = Array.from({ length: daysCount === 1 ? 7 : daysCount }, (_, i) => {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return conversations.filter((c) => {
      const t = new Date(c.lastMessageAt).getTime();
      return t >= day.getTime() && t < next.getTime();
    }).length;
  });

  // Real dates under each daily column — the fixed Sunday→Saturday names
  // only lined up when the range happened to start on a Sunday.
  const rangeLabels: string[] = newConvsLine.map((_, i) => {
    const d = addDays(rangeStart, i);
    return newConvsLine.length <= 7
      ? d.toLocaleDateString('ar-OM-u-nu-latn', { weekday: 'long' })
      : `${d.getDate()}/${d.getMonth() + 1}`;
  });

  // First-reply compliance against the one account-wide target. The share,
  // not the minutes, is what the chart and the card show; the department
  // filter narrows the cases, the target stays the same.
  const rangeEnd = addDays(rangeStart, newConvsLine.length).getTime();
  const rangeCases = firstReplyCases(conversations, replyTarget)
    .filter((c) => c.startedAt >= rangeStart.getTime() && c.startedAt < rangeEnd);
  const slaCases = rangeCases
    .filter((c) => slaDept === 'all' || (slaDept === 'none' ? c.departmentId === null : c.departmentId === slaDept));
  const slaDays: SlaDay[] = newConvsLine.map((_, i) => {
    const from = addDays(rangeStart, i).getTime();
    const to = addDays(rangeStart, i + 1).getTime();
    const inDay = slaCases.filter((c) => c.startedAt >= from && c.startedAt < to);
    return {
      met: inDay.filter((c) => c.outcome === 'met').length,
      breached: inDay.filter((c) => c.outcome === 'breached').length,
      pending: inDay.filter((c) => c.outcome === 'pending').length,
    };
  });
  const slaTotals = slaDays.reduce(
    (t, d) => ({ met: t.met + d.met, breached: t.breached + d.breached }),
    { met: 0, breached: 0 },
  );
  const slaMeasured = slaTotals.met + slaTotals.breached;

  // Heatmap — peak hours derived from all message timestamps
  const slots = ['12ص', '1ص', '2ص', '3ص', '4ص', '5ص', '6ص', '7ص', '8ص', '9ص', '10ص', '11ص', '12م', '1م', '2م', '3م', '4م', '5م', '6م', '7م', '8م', '9م', '10م', '11م'];
  const peakValues: number[][] = (() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    conversations.forEach((c) => {
      c.messages.forEach((m) => {
        const d = new Date(m.timestamp);
        const dow = d.getDay();
        const h = d.getHours();
        grid[dow][h] += 1;
      });
    });
    return grid;
  })();

  // Horizontal bars — top tags from contacts
  const tagColors = ['bg-primary', 'bg-info', 'bg-warning', 'bg-success', 'bg-danger', 'bg-primary/60', 'bg-info/60'];
  const byTag: { tag: string; count: number; color: string }[] = (() => {
    const counter = new Map<string, number>();
    contacts.forEach((c) => {
      c.tags.forEach((t) => counter.set(t, (counter.get(t) ?? 0) + c.conversationCount));
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([tag, count], i) => ({ tag, count, color: tagColors[i] ?? 'bg-muted' }));
  })();
  const tagMax = byTag.length > 0 ? Math.max(...byTag.map((t) => t.count)) : 1;

  // === AI metrics ===
  const aiReplies = conversations.reduce(
    (s, c) => s + c.messages.filter((m) => m.direction === 'out' && m.sender === 'ai').length,
    0,
  );
  // Agents' replies to customers — not internal notes, not the rating request.
  const humanReplies = conversations.reduce(
    (s, c) => s + c.messages.filter(isAgentReply).length,
    0,
  );
  const totalOutgoing = aiReplies + humanReplies;
  const aiHandlingPct = totalOutgoing > 0 ? Math.round((aiReplies / totalOutgoing) * 100) : 0;
  const aiActiveConvs = conversations.filter((c) => c.aiActive).length;
  const aiHandoffs = conversations.filter((c) => c.aiHandedOff).length;
  const aiInvolvedConvs = conversations.filter((c) => c.aiActive || c.aiHandedOff).length;
  const handoffRate = aiInvolvedConvs > 0 ? Math.round((aiHandoffs / aiInvolvedConvs) * 100) : 0;
  const aiSelfResolved = conversations.filter((c) => c.aiActive && c.status === 'closed').length;
  const aiResolutionRate = aiInvolvedConvs > 0 ? Math.round((aiSelfResolved / aiInvolvedConvs) * 100) : 0;

  // AI vs Human replies trend (last N days)
  const aiTrend: number[] = Array.from({ length: daysCount === 1 ? 7 : daysCount }, (_, i) => {
    const day = new Date(rangeStart); day.setDate(day.getDate() + i);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return conversations.reduce(
      (s, c) => s + c.messages.filter((m) => {
        const t = new Date(m.timestamp).getTime();
        return m.direction === 'out' && m.sender === 'ai' && t >= day.getTime() && t < next.getTime();
      }).length,
      0,
    );
  });
  const humanTrend: number[] = Array.from({ length: daysCount === 1 ? 7 : daysCount }, (_, i) => {
    const day = new Date(rangeStart); day.setDate(day.getDate() + i);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return conversations.reduce(
      (s, c) => s + c.messages.filter((m) => {
        const t = new Date(m.timestamp).getTime();
        return isAgentReply(m) && t >= day.getTime() && t < next.getTime();
      }).length,
      0,
    );
  });

  // Handoff reasons (mock distribution)
  const handoffReasons = [
    { reason: 'طلب تحدث مع موظف', count: Math.max(1, Math.floor(aiHandoffs * 0.45)), color: 'bg-primary' },
    { reason: 'سؤال خارج المعرفة', count: Math.max(1, Math.floor(aiHandoffs * 0.25)), color: 'bg-info' },
    { reason: 'كلمة مفتاحية (شكوى/استرداد)', count: Math.max(1, Math.floor(aiHandoffs * 0.18)), color: 'bg-warning' },
    { reason: 'مشاعر سلبية', count: Math.max(0, aiHandoffs - Math.floor(aiHandoffs * 0.88)), color: 'bg-danger' },
  ];
  const handoffMax = Math.max(...handoffReasons.map((r) => r.count), 1);

  // Agent performance — handled = assigned conversations. Reply speed is the
  // agent's own average first reply, from the same cases the compliance chart
  // counts; the account-wide card stays a share, since it mixes departments.
  const agentRows = agents.filter((a) => a.invitationStatus === 'active').map((a) => {
    const myConvs = conversations.filter((c) => c.assignedTo === a.id);
    const handled = myConvs.length;
    const myIds = new Set(myConvs.map((c) => c.id));
    const avgReply = averageReply(rangeCases.filter((c) => myIds.has(c.conversationId)));
    const resolutionRate = handled > 0 ? Math.round((myConvs.filter((c) => c.status === 'closed').length / handled) * 100) : 0;
    return {
      agent: a,
      handled,
      avgReply,
      resolutionRate,
      // Customers' ratings of this agent, all time — as on the ratings page:
      // a rating lands days after the conversation closed, so a period cut
      // would drop most of them.
      rating: averageAgentRating(ratings, a.id),
    };
  });

  const onExport = (type: 'pdf' | 'excel'): void => {
    if (type === 'excel') {
      const rows = agentRows.map((r) => ({
        'الموظف': r.agent.name,
        'البريد': r.agent.email,
        'المحادثات': r.handled,
        'متوسط الرد (دقيقة)': r.avgReply.minutes === null ? '—' : Math.round(r.avgReply.minutes),
        'معدل الحل %': r.resolutionRate,
        'التقييم': r.rating.value === null ? '—' : r.rating.value.toFixed(1),
      }));
      downloadCsv(`agent-performance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
      showToast(`تم تصدير بيانات ${rows.length} موظف`, 'success');
      return;
    }
    // PDF: open print window with summary derived from real store data
    const totalNewConvs = newConvsLine.reduce((s, n) => s + n, 0);
    const totalReplies = humanTrend.reduce((s, n) => s + n, 0);
    const all = compliance(rangeCases);
    const totalConvs = conversations.length;
    const closedConvs = conversations.filter((c) => c.status === 'closed').length;
    const resolutionPct = totalConvs > 0 ? Math.round((closedConvs / totalConvs) * 100) : 0;
    const html = `
      <h1>تقرير الأداء — ${range === 'today' ? 'اليوم' : range === 'week' ? 'الأسبوع' : range === 'month' ? 'الشهر' : 'مخصص'}</h1>
      <p class="muted">${new Date().toLocaleString('ar-OM-u-nu-latn')}</p>
      <h2>ملخّص الفترة</h2>
      <table>
        <tr><td>محادثات جديدة</td><td class="right">${totalNewConvs}</td></tr>
        <tr><td>ردود الموظفين</td><td class="right">${totalReplies}</td></tr>
        <tr><td>الالتزام بوقت الرد الأول</td><td class="right">${all.pct === null ? '—' : `${all.pct}% (${all.met} ضمن الهدف · ${all.breached} متجاوزة)`}</td></tr>
        <tr><td>معدل الحلّ</td><td class="right">${resolutionPct}%</td></tr>
      </table>
      <h2>أداء الموظفين</h2>
      <table>
        <thead><tr><th>الموظف</th><th class="right">المحادثات</th><th class="right">متوسط الرد</th><th class="right">معدل الحلّ</th><th class="right">التقييم</th></tr></thead>
        <tbody>
          ${agentRows.map((r) => `<tr><td>${r.agent.name}</td><td class="right">${r.handled}</td><td class="right">${formatMinutes(r.avgReply.minutes)}</td><td class="right">${r.resolutionRate}%</td><td class="right">${r.rating.value === null ? '—' : `⭐ ${r.rating.value.toFixed(1)}`}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2>المحادثات حسب الوسم</h2>
      <table>
        <thead><tr><th>الوسم</th><th class="right">العدد</th></tr></thead>
        <tbody>
          ${byTag.map((t) => `<tr><td>${t.tag}</td><td class="right">${t.count}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    printAsPdf(`تقرير الأداء`, html);
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold">التقارير</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">
          تابع أداء فريقك ومحادثاتك واتخذ قرارات مبنية على البيانات
        </p>
      </div>

      {/* Range filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChangeRange={(f, t, preset) => {
              setDateFrom(f);
              setDateTo(t);
              setRangeKey((k) => k + 1);
              if (preset === 'today' || preset === 'yesterday') setRange('today');
              else if (preset === 'thisWeek' || preset === 'lastWeek' || preset === 'last7') setRange('week');
              else if (preset === 'thisMonth' || preset === 'lastMonth' || preset === 'last30' || preset === 'last14') setRange('month');
              else setRange('custom');
            }}
          />
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); setRangeKey((k) => k + 1); }}
            className="h-10 ps-3 pe-9 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small focus:outline-none focus:border-primary"
          >
            <option value="all">جميع الحسابات</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name} — {ch.identifier}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExport('pdf')}
            className="h-10 px-4 rounded-xl border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={() => onExport('excel')}
            className="h-10 px-4 rounded-xl border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* 4 stat cards — computed from store */}
      {(() => null)()}
      <motion.div
        key={rangeKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-5"
      >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="محادثات جديدة"
          value={formatNumber(newConvsLine.reduce((s, n) => s + n, 0))}
          icon={<MessageSquare className="h-5 w-5" />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          label="ردود الموظفين"
          // Agents only, in the selected period — the AI's replies have their own card below.
          value={formatNumber(humanTrend.reduce((s, n) => s + n, 0))}
          icon={<Send className="h-5 w-5" />}
          iconBg="bg-info/10"
          iconColor="text-info"
        />
        <StatCard
          label="الالتزام بوقت الرد"
          value={(() => {
            const all = compliance(rangeCases);
            return all.pct === null ? '—' : `${all.pct}%`;
          })()}
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-warning/10"
          iconColor="text-warning"
        />
        <StatCard
          label="معدل الحلّ"
          value={(() => {
            const total = conversations.length;
            if (total === 0) return '0%';
            const closed = conversations.filter((c) => c.status === 'closed').length;
            return Math.round((closed / total) * 100) + '%';
          })()}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-success/10"
          iconColor="text-success"
        />
      </div>

      {/* ===== AI Assistant Section ===== */}
      <Card className="p-5 border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/[0.03] to-fuchsia-500/[0.03]">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-h2 font-bold flex items-center gap-2">
                أداء المساعد الذكي
                {aiSettings.enabled ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">مُفعّل</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted-light/15 text-muted-light dark:text-muted-dark font-bold">موقوف</span>
                )}
              </h2>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                إحصائيات المساعد الذكي وتأثيره على ردود فريقك
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard
            label="ردود المساعد"
            value={formatNumber(aiReplies)}
            icon={<Bot className="h-5 w-5" />}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-500"
          />
          <StatCard
            label="نسبة الردود AI"
            value={`${aiHandlingPct}%`}
            icon={<Sparkles className="h-5 w-5" />}
            iconBg="bg-fuchsia-500/10"
            iconColor="text-fuchsia-500"
          />
          <StatCard
            label="محادثات نشطة AI"
            value={formatNumber(aiActiveConvs)}
            icon={<MessageSquare className="h-5 w-5" />}
            iconBg="bg-info/10"
            iconColor="text-info"
          />
          <StatCard
            label="نسبة التحويل لموظف"
            value={`${handoffRate}%`}
            icon={<ArrowLeftRight className="h-5 w-5" />}
            iconBg="bg-warning/10"
            iconColor="text-warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI vs Human chart */}
          <div className="rounded-card bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-bold">المساعد الذكي مقابل الموظفين</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
                  المساعد
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  الموظفون
                </span>
              </div>
            </div>
            <LineChart
              labels={rangeLabels}
              series={[
                { name: 'المساعد', color: '#8B5CF6', data: aiTrend },
                { name: 'الموظفون', color: '#2563EB', data: humanTrend },
              ]}
              height={200}
            />
          </div>

          {/* Handoff reasons */}
          <div className="rounded-card bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-body font-bold">أسباب التحويل لموظف بشري</h3>
                <p className="text-[11px] text-muted-light dark:text-muted-dark">{aiHandoffs} محادثة محوّلة</p>
              </div>
              <div className="text-[11px] text-success font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> AI حلّ {aiResolutionRate}%
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {handoffReasons.map((r) => (
                <div key={r.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-small font-medium">{r.reason}</span>
                    <span className="text-small text-muted-light dark:text-muted-dark tabular-nums">{r.count}</span>
                  </div>
                  <div className="h-2 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', r.color)} style={{ width: `${(r.count / handoffMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Row: line + bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-h3 font-bold">المحادثات الجديدة</h2>
              <p className="text-small text-muted-light dark:text-muted-dark">{range === 'today' ? 'يومياً خلال الأسبوع' : range === 'month' ? 'يومياً خلال الشهر' : 'يومياً خلال الأسبوع'}</p>
            </div>
            <button className="text-small text-primary font-medium flex items-center gap-1">
              عرض الكل <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <LineChart
            labels={rangeLabels}
            series={[{ name: 'محادثات جديدة', color: '#2563EB', data: newConvsLine }]}
            height={220}
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-h3 font-bold">الالتزام بوقت الرد الأول</h2>
              <p className="text-small text-muted-light dark:text-muted-dark">
                نسبة المحادثات التي رُدّ عليها خلال {replyTarget} دقيقة — يومياً
              </p>
            </div>
            <select
              value={slaDept}
              onChange={(e) => setSlaDept(e.target.value)}
              aria-label="القسم"
              className="h-9 ps-3 pe-8 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small flex-shrink-0 focus:outline-none focus:border-primary"
            >
              <option value="all">كل الأقسام</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              <option value="none">بدون قسم</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 mb-2 text-small">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                ضمن الهدف
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
                تجاوز الهدف
              </span>
            </div>
            <span className="text-muted-light dark:text-muted-dark tabular-nums">
              {slaMeasured > 0
                ? <>الفترة: <b className="text-current">{Math.round((slaTotals.met / slaMeasured) * 100)}%</b> · {slaTotals.met} ضمن الهدف · {slaTotals.breached} متجاوزة</>
                : 'لا توجد محادثات مقيسة'}
            </span>
          </div>
          <SlaComplianceChart labels={rangeLabels} days={slaDays} />
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-h3 font-bold">أوقات الذروة</h2>
            <p className="text-small text-muted-light dark:text-muted-dark">عدد الرسائل لكل يوم وفترة (2 ساعة)</p>
          </div>
          <Calendar className="h-4 w-4 text-muted-light dark:text-muted-dark" />
        </div>
        <Heatmap rows={dayLabels} cols={slots} values={peakValues} />
      </Card>

      {/* Row: tag bars + agents table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-h3 font-bold mb-1">المحادثات حسب الوسم</h2>
          <p className="text-small text-muted-light dark:text-muted-dark mb-4">أكثر الوسوم استخداماً في محادثات عملائك</p>
          <div className="space-y-3">
            {byTag.map((t) => (
              <div key={t.tag}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-small font-medium">{t.tag}</span>
                  <span className="text-small text-muted-light dark:text-muted-dark">{t.count}</span>
                </div>
                <div className="h-2 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', t.color)}
                    style={{ width: `${(t.count / tagMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden lg:col-span-3">
          <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-h3 font-bold">أداء الموظفين</h2>
            <p className="text-small text-muted-light dark:text-muted-dark">إنتاجية كل موظف خلال الفترة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-2.5">الموظف</th>
                  <th className="text-start font-medium px-4 py-2.5">المحادثات</th>
                  <th className="text-start font-medium px-4 py-2.5" title="متوسط الوقت حتى أول رد للموظف">متوسط الرد</th>
                  <th className="text-start font-medium px-4 py-2.5">معدل الحل</th>
                  <th className="text-start font-medium px-4 py-2.5">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {agentRows.map(({ agent, handled, avgReply, resolutionRate, rating }) => (
                  <tr key={agent.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={agent.name} size="sm" status={agent.status} />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{handled}</td>
                    <td className="px-4 py-3 tabular-nums" title={avgReply.count > 0 ? `من ${avgReply.count} ${avgReply.count === 1 ? 'رد' : 'ردود'}` : 'لا توجد ردود في الفترة'}>
                      {formatMinutes(avgReply.minutes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 h-1.5 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${resolutionRate}%` }} />
                        </div>
                        <span className="text-small font-medium">{resolutionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" title={rating.count > 0 ? `من ${rating.count} ${rating.count === 1 ? 'تقييم' : 'تقييمات'}` : 'لا توجد تقييمات بعد'}>
                      {rating.value === null ? (
                        <span className="text-small text-muted-light dark:text-muted-dark">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-small font-medium tabular-nums">
                          ⭐ {rating.value.toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      </motion.div>
    </div>
  );
}

/** Met vs. breached; pending cases are not counted until they resolve either way. */
function compliance(cases: FirstReplyCase[]): { met: number; breached: number; pct: number | null } {
  const met = cases.filter((c) => c.outcome === 'met').length;
  const breached = cases.filter((c) => c.outcome === 'breached').length;
  const total = met + breached;
  return { met, breached, pct: total > 0 ? Math.round((met / total) * 100) : null };
}

/** Average of the customers' agent ratings that were submitted for this agent. */
function averageAgentRating(ratings: Rating[], agentId: string): { value: number | null; count: number } {
  const rated = ratings.filter((r) => r.agentId === agentId && r.submittedAt && r.ratingAgent != null);
  if (rated.length === 0) return { value: null, count: 0 };
  return { value: rated.reduce((s, r) => s + (r.ratingAgent ?? 0), 0) / rated.length, count: rated.length };
}

/** Average minutes to the first reply, over the answered cases only. */
function averageReply(cases: FirstReplyCase[]): { minutes: number | null; count: number } {
  const answered = cases.map((c) => c.replyMinutes).filter((m): m is number => m !== null);
  if (answered.length === 0) return { minutes: null, count: 0 };
  return { minutes: answered.reduce((s, n) => s + n, 0) / answered.length, count: answered.length };
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h} س` : `${h} س ${m % 60} د`;
}

interface SlaDay {
  met: number;
  breached: number;
  /** Unanswered but still within target — shown, not counted. */
  pending: number;
}

/**
 * One full-height column per day, split by share: blue the cases answered
 * within their department's target, red the ones past it. The share is what
 * is comparable across departments; the counts sit in the tooltip.
 */
function SlaComplianceChart({ labels, days }: { labels: string[]; days: SlaDay[] }): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const width = 600;
  const height = 220;
  const padding = { top: 22, right: 16, bottom: 32, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const slot = innerW / days.length;
  const barW = Math.min(slot * 0.5, 44);
  const yGrid = [0, 0.25, 0.5, 0.75, 1];
  const dense = days.length > 10;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {yGrid.map((g) => (
          <g key={g}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerH * (1 - g)}
              y2={padding.top + innerH * (1 - g)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="3 3"
            />
            <text x={padding.left - 6} y={padding.top + innerH * (1 - g) + 4} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
              {g * 100}%
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const total = d.met + d.breached;
          const x = padding.left + i * slot + (slot - barW) / 2;
          const metH = total > 0 ? (d.met / total) * innerH : 0;
          const breachH = total > 0 ? innerH - metH : 0;
          const pct = total > 0 ? Math.round((d.met / total) * 100) : null;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Whole-slot hit area, so empty days still answer on hover. */}
              <rect x={padding.left + i * slot} y={padding.top} width={slot} height={innerH} fill="transparent" />
              {total === 0 ? (
                <rect x={x} y={padding.top} width={barW} height={innerH} rx="4" fill="currentColor" fillOpacity="0.04" />
              ) : (
                <>
                  {breachH > 0 && <rect x={x} y={padding.top} width={barW} height={breachH} rx="4" fill="#EF4444" fillOpacity={hover === i ? 1 : 0.9} />}
                  {metH > 0 && <rect x={x} y={padding.top + breachH} width={barW} height={metH} rx="4" fill="#2563EB" fillOpacity={hover === i ? 1 : 0.9} />}
                </>
              )}
              {!dense && (
                <text x={x + barW / 2} y={padding.top - 6} fontSize="10" textAnchor="middle" fill="currentColor" opacity={pct === null ? 0.4 : 0.85} fontWeight="600">
                  {pct === null ? '—' : `${pct}%`}
                </text>
              )}
            </g>
          );
        })}
        {labels.map((lbl, i) => (dense && i % 3 !== 0 ? null : (
          <text key={lbl + i} x={padding.left + i * slot + slot / 2} y={height - 8} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">
            {lbl}
          </text>
        )))}
      </svg>
      {hover !== null && (() => {
        const d = days[hover];
        const total = d.met + d.breached;
        const at = ((padding.left + hover * slot + slot / 2) / width) * 100;
        return (
          <div
            className={cn(
              'pointer-events-none absolute top-0 z-10 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-lg px-3 py-2 text-[12px] whitespace-nowrap',
              // Kept inside the card: edge columns open the tooltip inward.
              at > 70 ? '-translate-x-full' : at < 30 ? '' : '-translate-x-1/2',
            )}
            style={{ left: `${at}%` }}
          >
            <div className="font-semibold mb-1">{labels[hover]}</div>
            {total === 0 ? (
              <div className="text-muted-light dark:text-muted-dark">لا توجد محادثات مقيسة</div>
            ) : (
              <>
                <div className="tabular-nums">الالتزام: <b>{Math.round((d.met / total) * 100)}%</b></div>
                <div className="tabular-nums text-primary dark:text-[#60A5FA]">{d.met} ضمن الهدف</div>
                <div className="tabular-nums text-[#B91C1C] dark:text-[#F87171]">{d.breached} متجاوزة</div>
              </>
            )}
            {d.pending > 0 && <div className="tabular-nums text-muted-light dark:text-muted-dark">{d.pending} بانتظار الرد (لم يتجاوز هدفه بعد)</div>}
          </div>
        );
      })()}
    </div>
  );
}
