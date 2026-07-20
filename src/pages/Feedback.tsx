import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MessageSquareWarning,
  Lightbulb,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Send,
  Eye,
} from 'lucide-react';
import { Card, Drawer, Input, Textarea } from '@components/ui';
import { useUIStore } from '@/store/useUIStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import type { FeedbackType, FeedbackPriority, FeedbackTicket } from '@/store/useFeedbackStore';
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


export default function Feedback(): JSX.Element {
  const tickets = useFeedbackStore((s) => s.tickets);
  const addTicket = useFeedbackStore((s) => s.addTicket);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | FeedbackType>('all');
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
      if (search) {
        const lc = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(lc) && !t.description.toLowerCase().includes(lc)) return false;
      }
      return true;
    });
  }, [tickets, search, filterType]);


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
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">التاريخ</th>
                <th className="text-start font-medium px-4 py-3 w-1">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map((t) => {
                const typeInfo = TYPE_MAP[t.type];
                const priorityInfo = PRIORITY_MAP[t.priority];
                const TypeIcon = typeInfo.icon;
                const PriorityIcon = priorityInfo.icon;
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
                    <td className="px-4 py-3 hidden md:table-cell text-small text-muted-light dark:text-muted-dark">
                      {formatDate(t.createdAt)}
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
                  <td colSpan={5} className="text-center py-12 text-muted-light dark:text-muted-dark">
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
        side="start"
      >
        <div className="space-y-4 pb-20">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">نوع التذكرة<span className="text-danger ms-0.5">*</span></label>
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
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">الأولوية <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
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
            label={<>الموضوع<span className="text-danger ms-0.5">*</span></>}
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
        side="start"
      >
        {detailTicket && <TicketDetail ticket={detailTicket} />}
      </Drawer>
    </div>
  );
}

function TicketDetail({ ticket }: { ticket: FeedbackTicket }): JSX.Element {
  const typeInfo = TYPE_MAP[ticket.type];
  const priorityInfo = PRIORITY_MAP[ticket.priority];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-5 pb-4">
      {/* Type + priority header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-small font-medium"
          style={{ background: `${typeInfo.color}1a`, color: typeInfo.color }}
        >
          <TypeIcon className="h-3.5 w-3.5" />
          {typeInfo.label}
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

      <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
        <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">
          تم إرسال طلبك بنجاح. سيقوم فريق Qhub بمراجعته والتواصل معك عند الحاجة.
        </p>
      </div>
    </div>
  );
}
