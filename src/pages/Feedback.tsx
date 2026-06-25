import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MessageSquareWarning,
  Lightbulb,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertTriangle,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Send,
} from 'lucide-react';
import { Card, Drawer, Input, Textarea, Select } from '@components/ui';
import { useUIStore } from '@/store/useUIStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import type { FeedbackType, FeedbackPriority, FeedbackStatus, FeedbackTicket } from '@/store/useFeedbackStore';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const TYPE_MAP: Record<FeedbackType, { label: string; color: string; icon: typeof MessageSquareWarning }> = {
  complaint: { label: 'شكوى', color: '#EF4444', icon: MessageSquareWarning },
  suggestion: { label: 'اقتراح', color: '#8B5CF6', icon: Lightbulb },
};

const PRIORITY_MAP: Record<FeedbackPriority, { label: string; color: string; icon: typeof ArrowUpCircle }> = {
  high: { label: 'عالية', color: '#EF4444', icon: ArrowUpCircle },
  medium: { label: 'متوسطة', color: '#F59E0B', icon: ArrowRightCircle },
  low: { label: 'منخفضة', color: '#10B981', icon: ArrowDownCircle },
};

const STATUS_MAP: Record<FeedbackStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: 'bg-warning/10', icon: Clock },
  in_review: { label: 'قيد المراجعة', color: '#2563EB', bg: 'bg-primary/10', icon: Eye },
  resolved: { label: 'تم الحل', color: '#10B981', bg: 'bg-success/10', icon: CheckCircle2 },
  closed: { label: 'مغلقة', color: '#94A3B8', bg: 'bg-muted-light/10', icon: XCircle },
};

export default function Feedback(): JSX.Element {
  const tickets = useFeedbackStore((s) => s.tickets);
  const addTicket = useFeedbackStore((s) => s.addTicket);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | FeedbackType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | FeedbackStatus>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<FeedbackTicket | null>(null);
  const [form, setForm] = useState<{
    type: FeedbackType;
    priority: FeedbackPriority;
    subject: string;
    description: string;
  }>({
    type: 'complaint',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (search) {
        const lc = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(lc) && !t.description.toLowerCase().includes(lc)) return false;
      }
      return true;
    });
  }, [tickets, search, filterType, filterStatus]);

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    inReview: tickets.filter((t) => t.status === 'in_review').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }), [tickets]);

  const openCreate = (): void => {
    setForm({ type: 'complaint', priority: 'medium', subject: '', description: '' });
    setDrawerOpen(true);
  };

  const submit = (): void => {
    if (!form.subject.trim()) {
      showToast('الموضوع مطلوب', 'error');
      return;
    }
    if (!form.description.trim()) {
      showToast('الوصف مطلوب', 'error');
      return;
    }
    addTicket(form);
    setDrawerOpen(false);
    showToast(
      form.type === 'complaint' ? 'تم إرسال الشكوى بنجاح' : 'تم إرسال الاقتراح بنجاح',
      'success',
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-h1 font-bold">الشكاوى والاقتراحات</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            تواصل مع فريق Qhub — قدّم شكوى أو اقتراح لتحسين الخدمة
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> تذكرة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="الإجمالي" value={stats.total} color="#2563EB" icon={Send} />
        <StatMini label="قيد الانتظار" value={stats.pending} color="#F59E0B" icon={Clock} />
        <StatMini label="قيد المراجعة" value={stats.inReview} color="#2563EB" icon={Eye} />
        <StatMini label="تم الحل" value={stats.resolved} color="#10B981" icon={CheckCircle2} />
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            placeholder="ابحث في التذاكر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | FeedbackType)}
          className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        >
          <option value="all">كل الأنواع</option>
          <option value="complaint">شكاوى</option>
          <option value="suggestion">اقتراحات</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | FeedbackStatus)}
          className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="in_review">قيد المراجعة</option>
          <option value="resolved">تم الحل</option>
          <option value="closed">مغلقة</option>
        </select>
      </Card>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">النوع</th>
                <th className="text-start font-medium px-4 py-3">الموضوع</th>
                <th className="text-start font-medium px-4 py-3">الأولوية</th>
                <th className="text-start font-medium px-4 py-3">الحالة</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">التاريخ</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">الرد</th>
                <th className="text-start font-medium px-4 py-3 w-1">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map((t) => {
                const typeInfo = TYPE_MAP[t.type];
                const priorityInfo = PRIORITY_MAP[t.priority];
                const statusInfo = STATUS_MAP[t.status];
                const TypeIcon = typeInfo.icon;
                const PriorityIcon = priorityInfo.icon;
                const StatusIcon = statusInfo.icon;
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors cursor-pointer"
                    onClick={() => setDetailTicket(t)}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-small font-medium"
                        style={{ background: `${typeInfo.color}1a`, color: typeInfo.color }}
                      >
                        <TypeIcon className="h-3 w-3" />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold line-clamp-1">{t.subject}</p>
                      <p className="text-small text-muted-light dark:text-muted-dark line-clamp-1 mt-0.5 md:hidden">
                        {formatDate(t.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1" style={{ color: priorityInfo.color }}>
                        <PriorityIcon className="h-3.5 w-3.5" />
                        <span className="text-small font-medium">{priorityInfo.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-small font-medium', statusInfo.bg)}
                        style={{ color: statusInfo.color }}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-small text-muted-light dark:text-muted-dark">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.adminReply ? (
                        <span className="inline-flex items-center gap-1 text-small text-success font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          تم الرد
                        </span>
                      ) : (
                        <span className="text-small text-muted-light dark:text-muted-dark">بانتظار الرد</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailTicket(t); }}
                        className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center"
                        aria-label="عرض التفاصيل"
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
                    لا توجد تذاكر مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="تذكرة جديدة"
        width="w-[480px]"
        side="end"
      >
        <div className="space-y-4 pb-20">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">نوع التذكرة</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'complaint' })}
                className={cn(
                  'rounded-card border-2 p-4 transition-all text-start flex items-center gap-3',
                  form.type === 'complaint'
                    ? 'border-danger ring-2 ring-danger/20'
                    : 'border-border-light dark:border-border-dark hover:border-danger/40',
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquareWarning className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <p className="text-body font-semibold">شكوى</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark">مشكلة أو خلل</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'suggestion' })}
                className={cn(
                  'rounded-card border-2 p-4 transition-all text-start flex items-center gap-3',
                  form.type === 'suggestion'
                    ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/20'
                    : 'border-border-light dark:border-border-dark hover:border-[#8B5CF6]/40',
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-body font-semibold">اقتراح</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark">فكرة لتحسين الخدمة</p>
                </div>
              </button>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">الأولوية</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as FeedbackPriority[]).map((p) => {
                const info = PRIORITY_MAP[p];
                const Icon = info.icon;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={cn(
                      'flex-1 h-10 rounded-full border-2 text-small font-medium transition-all flex items-center justify-center gap-1.5',
                      form.priority === p
                        ? 'ring-2 ring-offset-1'
                        : 'border-border-light dark:border-border-dark hover:border-current/30',
                    )}
                    style={{
                      color: info.color,
                      borderColor: form.priority === p ? info.color : undefined,
                      boxShadow: form.priority === p ? `0 0 0 3px ${info.color}33` : undefined,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="الموضوع"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="مثال: مشكلة في ربط قناة واتساب"
          />
          <Textarea
            label="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            placeholder="اشرح المشكلة أو الاقتراح بالتفصيل..."
          />

          <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
            <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">
              سيتم مراجعة طلبك من قبل فريق الدعم الفني في Qhub والرد عليك في أقرب وقت.
              التذاكر ذات الأولوية العالية يتم التعامل معها خلال 24 ساعة.
            </p>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
          <button
            onClick={() => setDrawerOpen(false)}
            className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            إرسال
          </button>
        </div>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        open={detailTicket !== null}
        onClose={() => setDetailTicket(null)}
        title="تفاصيل التذكرة"
        width="w-[520px]"
        side="end"
      >
        {detailTicket && <TicketDetail ticket={detailTicket} />}
      </Drawer>
    </div>
  );
}

function TicketDetail({ ticket }: { ticket: FeedbackTicket }): JSX.Element {
  const typeInfo = TYPE_MAP[ticket.type];
  const priorityInfo = PRIORITY_MAP[ticket.priority];
  const statusInfo = STATUS_MAP[ticket.status];
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-5 pb-4">
      {/* Status + type header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-small font-medium"
          style={{ background: `${typeInfo.color}1a`, color: typeInfo.color }}
        >
          <TypeIcon className="h-3.5 w-3.5" />
          {typeInfo.label}
        </span>
        <span
          className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-small font-medium', statusInfo.bg)}
          style={{ color: statusInfo.color }}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusInfo.label}
        </span>
        <span className="inline-flex items-center gap-1 text-small font-medium" style={{ color: priorityInfo.color }}>
          أولوية {priorityInfo.label}
        </span>
      </div>

      {/* Subject */}
      <div>
        <h3 className="text-h3 font-bold">{ticket.subject}</h3>
        <p className="text-small text-muted-light dark:text-muted-dark mt-1">
          {formatDate(ticket.createdAt)}
        </p>
      </div>

      {/* Description */}
      <div className="p-4 rounded-card bg-bg-light dark:bg-bg-dark">
        <p className="text-body leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Admin reply */}
      {ticket.adminReply ? (
        <div className="space-y-2">
          <p className="text-small font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            رد فريق Qhub
          </p>
          <div className="p-4 rounded-card border border-success/20 bg-success/5">
            <p className="text-body leading-relaxed whitespace-pre-wrap">{ticket.adminReply}</p>
            <p className="text-[11px] text-muted-light dark:text-muted-dark mt-3">
              {ticket.repliedAt && formatDate(ticket.repliedAt)}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-card border border-warning/20 bg-warning/5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-body font-medium">بانتظار الرد</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              سيقوم فريق Qhub بالرد على طلبك في أقرب وقت ممكن
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <p className="text-small font-semibold">سجل التذكرة</p>
        <div className="space-y-0">
          <TimelineItem
            label="تم إنشاء التذكرة"
            date={ticket.createdAt}
            color="#2563EB"
            isFirst
          />
          {ticket.status !== 'pending' && (
            <TimelineItem
              label="قيد المراجعة من فريق الدعم"
              date={ticket.updatedAt}
              color="#F59E0B"
            />
          )}
          {ticket.adminReply && (
            <TimelineItem
              label="تم الرد من فريق Qhub"
              date={ticket.repliedAt!}
              color="#10B981"
            />
          )}
          {ticket.status === 'resolved' && (
            <TimelineItem
              label="تم حل المشكلة"
              date={ticket.updatedAt}
              color="#10B981"
              isLast
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  color,
  isFirst,
  isLast,
}: {
  label: string;
  date: string;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
}): JSX.Element {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <div
          className="h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: color }}
        />
        {!isLast && <div className="w-px h-8 bg-border-light dark:bg-border-dark" />}
      </div>
      <div className="pb-3">
        <p className="text-small font-medium">{label}</p>
        <p className="text-[11px] text-muted-light dark:text-muted-dark">{formatDate(date)}</p>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof Clock;
}): JSX.Element {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-h3 font-bold">{value}</p>
        <p className="text-[11px] text-muted-light dark:text-muted-dark">{label}</p>
      </div>
    </Card>
  );
}
