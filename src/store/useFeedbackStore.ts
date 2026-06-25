import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeedbackType = 'complaint' | 'suggestion';
export type FeedbackPriority = 'high' | 'medium' | 'low';
export type FeedbackStatus = 'pending' | 'in_review' | 'resolved' | 'closed';

export interface FeedbackTicket {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  subject: string;
  description: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  adminReply?: string;
  repliedAt?: string;
}

interface FeedbackState {
  tickets: FeedbackTicket[];
  addTicket: (ticket: Omit<FeedbackTicket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
}

const MOCK_TICKETS: FeedbackTicket[] = [
  {
    id: 'fb-1',
    type: 'complaint',
    priority: 'high',
    subject: 'تأخر في تسليم الرسائل عبر واتساب',
    description: 'نلاحظ تأخر في تسليم الرسائل عبر قناة واتساب يصل أحياناً إلى 5 دقائق. هذا يؤثر على سرعة الرد على العملاء وخصوصاً في أوقات الذروة. نرجو معالجة المشكلة بأسرع وقت.',
    status: 'in_review',
    createdAt: '2026-06-20T10:30:00Z',
    updatedAt: '2026-06-21T08:15:00Z',
    adminReply: 'شكراً لتنبيهنا. فريقنا التقني يعمل على تحسين أداء قناة واتساب. سيتم إصدار تحديث خلال 48 ساعة.',
    repliedAt: '2026-06-21T08:15:00Z',
  },
  {
    id: 'fb-2',
    type: 'suggestion',
    priority: 'medium',
    subject: 'إضافة ميزة جدولة الرسائل',
    description: 'نقترح إضافة ميزة جدولة الرسائل بحيث نتمكن من تحضير رسائل مسبقة وإرسالها تلقائياً في أوقات محددة. هذا سيساعدنا كثيراً في الحملات التسويقية.',
    status: 'pending',
    createdAt: '2026-06-22T14:20:00Z',
    updatedAt: '2026-06-22T14:20:00Z',
  },
  {
    id: 'fb-3',
    type: 'complaint',
    priority: 'low',
    subject: 'خطأ في تصدير التقارير بصيغة PDF',
    description: 'عند تصدير تقارير المحادثات بصيغة PDF، بعض الأعمدة تظهر مقطوعة ولا تُعرض البيانات بشكل كامل.',
    status: 'resolved',
    createdAt: '2026-06-18T09:00:00Z',
    updatedAt: '2026-06-19T16:45:00Z',
    adminReply: 'تم إصلاح المشكلة في التحديث الأخير. يرجى تجربة التصدير مرة أخرى وإبلاغنا إذا استمرت المشكلة.',
    repliedAt: '2026-06-19T16:45:00Z',
  },
];

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      tickets: MOCK_TICKETS,

      addTicket: (ticket) => {
        const now = new Date().toISOString();
        const newTicket: FeedbackTicket = {
          ...ticket,
          id: `fb-${Date.now()}`,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ tickets: [newTicket, ...s.tickets] }));
      },
    }),
    {
      name: 'qhub-feedback',
      partialize: (s) => ({ tickets: s.tickets }),
    },
  ),
);
