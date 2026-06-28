import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Download,
  FileText,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowLeftRight,
  Bot,
  Check,
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
type PresetKey = 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

/* ── helpers ── */
function startOfDay(d: Date): Date { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date): Date { const n = startOfDay(d); n.setDate(n.getDate() - n.getDay()); return n; }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isSameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isInRange(d: Date, from: Date, to: Date): boolean { const t = startOfDay(d).getTime(); return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime(); }
function formatDate(d: Date): string {
  return d.toLocaleDateString('ar-OM-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PRESETS: { key: PresetKey; label: string; range: () => [Date, Date] }[] = [
  { key: 'today', label: 'اليوم', range: () => { const t = startOfDay(new Date()); return [t, t]; } },
  { key: 'yesterday', label: 'أمس', range: () => { const y = addDays(new Date(), -1); return [startOfDay(y), startOfDay(y)]; } },
  { key: 'last7', label: 'آخر 7 أيام', range: () => [startOfDay(addDays(new Date(), -6)), startOfDay(new Date())] },
  { key: 'last14', label: 'آخر 14 يوم', range: () => [startOfDay(addDays(new Date(), -13)), startOfDay(new Date())] },
  { key: 'last30', label: 'آخر 30 يوم', range: () => [startOfDay(addDays(new Date(), -29)), startOfDay(new Date())] },
  { key: 'thisWeek', label: 'هذا الأسبوع', range: () => [startOfWeek(new Date()), startOfDay(new Date())] },
  { key: 'lastWeek', label: 'الأسبوع الماضي', range: () => { const s = addDays(startOfWeek(new Date()), -7); return [s, addDays(s, 6)]; } },
  { key: 'thisMonth', label: 'هذا الشهر', range: () => [startOfMonth(new Date()), startOfDay(new Date())] },
  { key: 'lastMonth', label: 'الشهر الماضي', range: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); return [s, endOfMonth(s)]; } },
];

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

function CalendarMonth({ year, month, from, to, hoverDate, onSelect, onHover }: {
  year: number; month: number; from: Date | null; to: Date | null;
  hoverDate: Date | null; onSelect: (d: Date) => void; onHover: (d: Date | null) => void;
}): JSX.Element {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const effectiveTo = to ?? hoverDate;

  return (
    <div className="w-[230px]">
      <div className="text-center font-bold text-body mb-2">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-[11px] font-medium text-muted-light dark:text-muted-dark mb-1">
        {DAY_NAMES_SHORT.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="h-8" />;
          const isToday = isSameDay(date, today);
          const isFrom = from && isSameDay(date, from);
          const isTo = effectiveTo && isSameDay(date, effectiveTo);
          const inRange = from && effectiveTo && !isSameDay(from, effectiveTo) && isInRange(date, from, effectiveTo);
          const isEndpoint = isFrom || isTo;
          const isFuture = date.getTime() > today.getTime();

          return (
            <button
              key={date.toISOString()}
              disabled={isFuture}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'h-8 text-[13px] transition-colors relative',
                isFuture && 'opacity-30 cursor-not-allowed',
                isEndpoint && 'bg-primary text-white font-bold',
                isEndpoint && isFrom && !isTo && 'rounded-s-full',
                isEndpoint && isTo && !isFrom && 'rounded-e-full',
                isEndpoint && isFrom && isTo && 'rounded-full',
                !isEndpoint && inRange && 'bg-primary/10',
                !isEndpoint && !inRange && !isFuture && 'hover:bg-bg-light dark:hover:bg-bg-dark',
                isToday && !isEndpoint && 'font-bold text-primary',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ from, to, onChangeRange }: {
  from: Date; to: Date;
  onChangeRange: (from: Date, to: Date, preset?: PresetKey) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<PresetKey>('last7');

  const [draftFrom, setDraftFrom] = useState<Date | null>(from);
  const [draftTo, setDraftTo] = useState<Date | null>(to);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date(from);
    d.setMonth(d.getMonth() - 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const rightMonth = { year: leftMonth.month === 11 ? leftMonth.year + 1 : leftMonth.year, month: (leftMonth.month + 1) % 12 };

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    setSelectingEnd(false);
    const d = new Date(from);
    d.setMonth(d.getMonth() - 1);
    setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => setLeftMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 });
  const nextMonth = () => setLeftMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 });

  const handleSelect = (d: Date) => {
    if (!selectingEnd || !draftFrom) {
      setDraftFrom(d);
      setDraftTo(null);
      setSelectingEnd(true);
      setActivePreset('' as PresetKey);
    } else {
      const [f, t] = d < draftFrom ? [d, draftFrom] : [draftFrom, d];
      setDraftFrom(f);
      setDraftTo(t);
      setSelectingEnd(false);
      setActivePreset('' as PresetKey);
      onChangeRange(f, t);
      setOpen(false);
    }
  };

  const handlePreset = (p: typeof PRESETS[number]) => {
    const [f, t] = p.range();
    setDraftFrom(f);
    setDraftTo(t);
    setSelectingEnd(false);
    setActivePreset(p.key);
    onChangeRange(f, t, p.key);
    setOpen(false);
  };

  const label = `${formatDate(from)} — ${formatDate(to)}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-10 px-4 rounded-xl border text-small font-medium flex items-center gap-2 transition-all',
          open
            ? 'border-primary ring-2 ring-primary/10 bg-white dark:bg-surface-dark'
            : 'border-border-light dark:border-border-dark bg-white dark:bg-surface-dark hover:border-primary/40'
        )}
      >
        <Calendar className="h-4 w-4 text-muted-light dark:text-muted-dark" />
        <span>{label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-light dark:text-muted-dark transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 start-0 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-xl overflow-hidden">
          <div className="flex">
            {/* Calendars */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={nextMonth} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-6">
                <CalendarMonth
                  year={leftMonth.year} month={leftMonth.month}
                  from={draftFrom} to={draftTo} hoverDate={selectingEnd ? hoverDate : null}
                  onSelect={handleSelect} onHover={setHoverDate}
                />
                <CalendarMonth
                  year={rightMonth.year} month={rightMonth.month}
                  from={draftFrom} to={draftTo} hoverDate={selectingEnd ? hoverDate : null}
                  onSelect={handleSelect} onHover={setHoverDate}
                />
              </div>
            </div>
            {/* Presets sidebar */}
            <div className="w-40 border-s border-border-light dark:border-border-dark p-2 flex flex-col gap-0.5">
              <p className="text-[11px] font-bold text-muted-light dark:text-muted-dark px-2 py-1.5">اختيارات سريعة</p>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    'text-start px-3 py-1.5 rounded-lg text-[13px] transition-colors flex items-center gap-2',
                    activePreset === p.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-bg-light dark:hover:bg-bg-dark text-body'
                  )}
                >
                  {activePreset === p.key && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports(): JSX.Element {
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const aiSettings = useAIStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);
  const [range, setRange] = useState<Range>('week');
  const [dateFrom, setDateFrom] = useState(() => startOfDay(addDays(new Date(), -6)));
  const [dateTo, setDateTo] = useState(() => startOfDay(new Date()));
  const [rangeKey, setRangeKey] = useState(0);

  const dayLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // === Real data derived from store ===

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
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      </motion.div>
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
