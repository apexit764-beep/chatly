import { create } from 'zustand';
import { blankTemplate, newStep, type ChatTemplate } from '@/utils/chatTemplates';

const STORAGE_KEY = 'qhub_chat_templates';

function seed(): ChatTemplate[] {
  const day = 86400000;
  const booking = blankTemplate('حجز موعد');
  booking.id = 'ct_booking';
  booking.status = 'published';
  booking.triggers = { first: false, kw: true, kws: ['حجز', 'موعد'], off: false };
  booking.updatedAt = new Date(Date.now() - 14 * day).toISOString();
  const [a, b, c, d, e] = (['msg', 'btn', 'list', 'ask', 'end'] as const).map((t) => newStep(t));
  a.text = 'أهلًا {اسم العميل} 👋\nيسعدنا مساعدتك في حجز موعد.';
  b.text = 'ما نوع الخدمة التي تريدها؟';
  b.opts = [{ label: 'استشارة', go: c.id }, { label: 'متابعة', go: c.id }, { label: 'أخرى', go: 'agent' }];
  c.text = 'اختر اليوم المناسب لك:';
  c.btnLabel = 'عرض الأيام';
  c.opts = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'].map((label) => ({ label, go: d.id }));
  d.text = 'اكتب رقم جوال للتواصل معك:';
  d.valid = 'phone';
  e.text = 'تم استلام طلبك ✅\nسيتواصل معك أحد موظفينا لتأكيد الموعد.';
  booking.steps = [a, b, c, d, e];

  const welcome = blankTemplate('الترحيب بالعملاء الجدد');
  welcome.id = 'ct_welcome';
  welcome.status = 'draft';
  welcome.triggers = { first: true, kw: false, kws: [], off: false };
  welcome.updatedAt = new Date(Date.now() - 13 * day).toISOString();
  const [w1, w2, w3] = (['btn', 'msg', 'end'] as const).map((t) => newStep(t));
  w1.text = 'مرحبًا بك! كيف يمكننا مساعدتك؟';
  w1.opts = [{ label: 'الأسعار', go: w2.id }, { label: 'الدعم الفني', go: 'agent' }, { label: 'التحدث مع موظف', go: 'agent' }];
  w2.text = 'سنرسل لك تفاصيل الأسعار الآن.';
  w3.text = 'شكرًا لتواصلك معنا.';
  welcome.steps = [w1, w2, w3];
  return [booking, welcome];
}

function load(): ChatTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatTemplate[];
  } catch { /* storage unavailable: start from the examples */ }
  return seed();
}

function save(templates: ChatTemplate[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch { /* not persisted */ }
}

interface ChatTemplateState {
  templates: ChatTemplate[];
  /** Adds or replaces by id, stamping the edit time. */
  upsert: (t: ChatTemplate) => void;
  remove: (id: string) => void;
  setActive: (id: string, active: boolean) => void;
}

export const useChatTemplateStore = create<ChatTemplateState>((set) => ({
  templates: load(),
  upsert: (t) =>
    set((s) => {
      const stamped = { ...t, updatedAt: new Date().toISOString() };
      const exists = s.templates.some((x) => x.id === t.id);
      const templates = exists ? s.templates.map((x) => (x.id === t.id ? stamped : x)) : [...s.templates, stamped];
      save(templates);
      return { templates };
    }),
  remove: (id) =>
    set((s) => {
      const templates = s.templates.filter((x) => x.id !== id);
      save(templates);
      return { templates };
    }),
  setActive: (id, active) =>
    set((s) => {
      const templates = s.templates.map((x) => (x.id === id ? { ...x, active } : x));
      save(templates);
      return { templates };
    }),
}));
