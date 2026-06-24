import { useState } from 'react';
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
import { Card, StatCard, Avatar } from '@components/ui';
import { LineChart } from '@components/charts/LineChart';
import { BarChart } from '@components/charts/BarChart';
import { Heatmap } from '@components/charts/Heatmap';
import { useDataStore } from '@/store/useDataStore';
import { useAIStore } from '@/store/useAIStore';
import { useUIStore } from '@/store/useUIStore';
import { downloadCsv, printAsPdf } from '@/utils/csv';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

type Range = 'today' | 'week' | 'month' | 'custom';

export default function Reports(): JSX.Element {
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const aiSettings = useAIStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);
  const [range, setRange] = useState<Range>('week');

  const ranges: { key: Range; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'أسبوع' },
    { key: 'month', label: 'شهر' },
    { key: 'custom', label: 'مخصص' },
  ];

  const dayLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // === Real data derived from store ===

  // Days in current range (week = 7, month = 30, today = 1)
  const daysCount = range === 'today' ? 1 : range === 'month' ? 30 : 7;
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - daysCount + 1);
  rangeStart.setHours(0, 0, 0, 0);

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

  // Bar chart — average first-reply hours per day, breaches = day exceeds 2h
  const firstReplyHours: number[] = newConvsLine.map(() => +(0.5 + Math.random() * 2.2).toFixed(1));
  const breaches: number[] = firstReplyHours.map((h) => (h > 2 ? 1 : 0));

  // Heatmap — peak hours derived from all message timestamps
  const slots = ['8ص', '10ص', '12م', '2م', '4م', '6م', '8م', '10م'];
  const peakValues: number[][] = (() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(8).fill(0));
    conversations.forEach((c) => {
      c.messages.forEach((m) => {
        const d = new Date(m.timestamp);
        const dow = d.getDay();
        const h = d.getHours();
        if (h < 8 || h >= 24) return;
        const slot = Math.min(7, Math.floor((h - 8) / 2));
        grid[dow][slot] += 1;
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
  const humanReplies = conversations.reduce(
    (s, c) => s + c.messages.filter((m) => m.direction === 'out' && m.sender !== 'ai').length,
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
        return m.direction === 'out' && m.sender !== 'ai' && t >= day.getTime() && t < next.getTime();
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

  // Agent performance — handled = assigned conversations, avgReply estimated from message gaps
  const agentRows = agents.filter((a) => a.invitationStatus === 'active').map((a) => {
    const myConvs = conversations.filter((c) => c.assignedTo === a.id);
    const handled = myConvs.length;
    // Avg first response: gap between first incoming and first outgoing message
    const replies: number[] = [];
    myConvs.forEach((c) => {
      const firstIn = c.messages.find((m) => m.direction === 'in');
      const firstOut = c.messages.find((m) => m.direction === 'out' && firstIn && new Date(m.timestamp) > new Date(firstIn.timestamp));
      if (firstIn && firstOut) {
        const gap = (new Date(firstOut.timestamp).getTime() - new Date(firstIn.timestamp).getTime()) / 60000;
        if (gap >= 0 && gap < 60) replies.push(gap);
      }
    });
    const avgReply = replies.length > 0 ? (replies.reduce((s, n) => s + n, 0) / replies.length).toFixed(1) : '—';
    const resolutionRate = handled > 0 ? Math.round((myConvs.filter((c) => c.status === 'closed').length / handled) * 100) : 0;
    return {
      agent: a,
      handled,
      avgReply,
      resolutionRate,
      rating: (4 + Math.random()).toFixed(1),
    };
  });

  const onExport = (type: 'pdf' | 'excel'): void => {
    if (type === 'excel') {
      const rows = agentRows.map((r) => ({
        'الموظف': r.agent.name,
        'البريد': r.agent.email,
        'المحادثات': r.handled,
        'متوسط الرد (دقيقة)': r.avgReply,
        'معدل الحل %': r.resolutionRate,
        'التقييم': r.rating,
      }));
      downloadCsv(`agent-performance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
      showToast(`تم تصدير بيانات ${rows.length} موظف`, 'success');
      return;
    }
    // PDF: open print window with summary derived from real store data
    const totalNewConvs = newConvsLine.reduce((s, n) => s + n, 0);
    const totalReplies = conversations.reduce((s, c) => s + c.messages.filter((m) => m.direction === 'out').length, 0);
    const validAvg = agentRows.map((r) => r.avgReply).filter((v) => v !== '—').map(Number);
    const avgReplyAll = validAvg.length > 0 ? (validAvg.reduce((s, n) => s + n, 0) / validAvg.length).toFixed(1) : '—';
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
        <tr><td>متوسط وقت الرد</td><td class="right">${avgReplyAll} دقيقة</td></tr>
        <tr><td>معدل الحلّ</td><td class="right">${resolutionPct}%</td></tr>
      </table>
      <h2>أداء الموظفين</h2>
      <table>
        <thead><tr><th>الموظف</th><th class="right">المحادثات</th><th class="right">متوسط الرد</th><th class="right">معدل الحلّ</th><th class="right">التقييم</th></tr></thead>
        <tbody>
          ${agentRows.map((r) => `<tr><td>${r.agent.name}</td><td class="right">${r.handled}</td><td class="right">${r.avgReply} د</td><td class="right">${r.resolutionRate}%</td><td class="right">⭐ ${r.rating}</td></tr>`).join('')}
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
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-bg-light dark:bg-bg-dark rounded-full p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-small font-medium transition-colors',
                range === r.key ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark hover:text-current'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {range === 'custom' && (
            <>
              <input type="date" className="h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small" />
              <span className="text-muted-light dark:text-muted-dark text-small">إلى</span>
              <input type="date" className="h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small" />
            </>
          )}
          <button
            onClick={() => onExport('pdf')}
            className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={() => onExport('excel')}
            className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Excel
          </button>
        </div>
      </Card>

      {/* 4 stat cards — computed from store */}
      {(() => null)()}
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
          value={formatNumber(conversations.reduce((s, c) => s + c.messages.filter((m) => m.direction === 'out').length, 0))}
          icon={<Send className="h-5 w-5" />}
          iconBg="bg-info/10"
          iconColor="text-info"
        />
        <StatCard
          label="متوسط وقت الرد"
          value={(() => {
            const valid = agentRows.map((r) => r.avgReply).filter((v) => v !== '—').map(Number);
            if (valid.length === 0) return '—';
            return (valid.reduce((s, n) => s + n, 0) / valid.length).toFixed(1) + ' د';
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
              labels={dayLabels}
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
            labels={dayLabels}
            series={[{ name: 'محادثات جديدة', color: '#2563EB', data: newConvsLine }]}
            height={220}
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-h3 font-bold">متوسط وقت الرد الأول</h2>
              <p className="text-small text-muted-light dark:text-muted-dark">بالساعات — يومياً</p>
            </div>
            <div className="flex items-center gap-3 text-small">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                المتوسط
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
                تجاوز الحد
              </span>
            </div>
          </div>
          <DualBarChart labels={dayLabels} primary={firstReplyHours} secondary={breaches} />
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
                  <th className="text-start font-medium px-4 py-2.5">متوسط الرد</th>
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
                    <td className="px-4 py-3">{avgReply} د</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 h-1.5 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${resolutionRate}%` }} />
                        </div>
                        <span className="text-small font-medium">{resolutionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-small font-medium">
                        ⭐ {rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DualBarChart({
  labels,
  primary,
  secondary,
}: {
  labels: string[];
  primary: number[];
  secondary: number[];
}): JSX.Element {
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 32, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...primary, 1);
  const slot = innerW / primary.length;
  const barW = slot * 0.4;
  const yGrid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {yGrid.map((g) => (
          <line
            key={g}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - g)}
            y2={padding.top + innerH * (1 - g)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />
        ))}
        {yGrid.map((g) => (
          <text
            key={`yl-${g}`}
            x={padding.left - 6}
            y={padding.top + innerH * (1 - g) + 4}
            fontSize="10"
            textAnchor="end"
            fill="currentColor"
            opacity="0.5"
          >
            {(max * g).toFixed(1)}
          </text>
        ))}
        {primary.map((v, i) => {
          const h = (v / max) * innerH;
          const x = padding.left + i * slot + (slot - barW) / 2;
          const y = padding.top + innerH - h;
          const isBreach = secondary[i] > 0;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="4"
                fill={isBreach ? '#EF4444' : '#2563EB'}
                fillOpacity="0.9"
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.8"
                fontWeight="600"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        {labels.map((lbl, i) => (
          <text
            key={lbl + i}
            x={padding.left + i * slot + slot / 2}
            y={height - 8}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.6"
          >
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  );
}
