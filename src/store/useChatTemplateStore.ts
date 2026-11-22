import { create } from 'zustand';
import { useDataStore } from '@/store/useDataStore';
import {
  CUSTOMER_NAME_TAG,
  MAX_LIST_ITEMS,
  MAX_OPTION_LENGTH,
  blankTemplate,
  deptTarget,
  newStep,
  normalizeTriggers,
  type AnswerKind,
  type ChatStep,
  type ChatTemplate,
  type ChatTemplateTriggers,
  type StepTarget,
  type StepType,
} from '@/utils/chatTemplates';

const STORAGE_KEY = 'qhub_chat_templates';
/** Bumped when the ready-made templates change, so saved lists pick up the new ones once. */
const SEED_KEY = 'qhub_chat_templates_seed';
const SEED_VERSION = '3';
/** Lists saved under version 2 already have the six; version 3 only switches the trigger model. */
const PREVIOUS_SEED_VERSION = '2';
/** The two examples the first version shipped; the ready-made set replaces them. */
const OLD_SEED_IDS = ['ct_booking', 'ct_welcome'];

function whatsappNumbers(): string[] {
  return useDataStore.getState().channels.filter((c) => c.type === 'whatsapp').map((c) => c.id);
}

interface SeedStep {
  type: StepType;
  text: string;
  /** Option labels with where each leads; `dept:` targets are filled from the departments. */
  opts?: Array<[string, StepTarget]>;
  btnLabel?: string;
  valid?: AnswerKind;
  dept?: string;
  other?: StepTarget;
}

interface SeedDef {
  id: string;
  name: string;
  triggers: ChatTemplateTriggers;
  steps: SeedStep[];
  /** Switched off: it has no keywords, like the welcome template, and one number has one default. */
  off?: boolean;
}

const kw = (...kws: string[]): ChatTemplateTriggers => ({ first: false, kw: true, kws, off: false });
const noKeywords: ChatTemplateTriggers = { first: false, kw: false, kws: [], off: false };
/** The off-hours template ships switched off, so the welcome template is each number's default. */
const OFF_HOURS_ID = 'seed_off_hours';

/**
 * The ready-made templates every client starts with. They are built on the client's own
 * departments: a hand-over to a department that does not exist falls back to any staff member.
 */
function seed(): ChatTemplate[] {
  const departments = useDataStore.getState().departments;
  const has = (id: string): boolean => departments.some((d) => d.id === id);
  const toDept = (id: string): StepTarget => (has(id) ? deptTarget(id) : 'agent');
  const deptChoices: Array<[string, StepTarget]> = departments
    .slice(0, MAX_LIST_ITEMS)
    .map((d) => [d.name.slice(0, MAX_OPTION_LENGTH), deptTarget(d.id)]);
  const pickDept: SeedStep = deptChoices.length >= 2
    ? { type: 'list', text: 'اختر القسم الذي تريد التواصل معه:', btnLabel: 'عرض الأقسام', opts: deptChoices }
    : { type: 'agent', text: 'سيتواصل معك أحد موظفينا الآن.' };

  const defs: SeedDef[] = [
    {
      id: 'seed_welcome',
      name: 'الترحيب وتوجيه العميل للقسم',
      triggers: noKeywords,
      steps: [
        { type: 'msg', text: `أهلًا ${CUSTOMER_NAME_TAG} 👋\nمرحبًا بك، يسعدنا تواصلك معنا.` },
        pickDept,
      ],
    },
    {
      id: 'seed_off_hours',
      name: 'خارج أوقات العمل',
      triggers: noKeywords,
      off: true,
      steps: [
        { type: 'msg', text: `شكرًا لتواصلك ${CUSTOMER_NAME_TAG} 🌙\nنحن خارج أوقات العمل حاليًا، وسنرد عليك في أقرب وقت.` },
        { type: 'ask', text: 'اكتب طلبك باختصار حتى نجهّز الرد:', valid: 'any' },
        pickDept.type === 'list' ? { ...pickDept, text: 'اختر القسم المناسب لطلبك:' } : pickDept,
      ],
    },
    {
      id: 'seed_sales',
      name: 'استفسارات المبيعات والأسعار',
      triggers: kw('سعر', 'أسعار', 'عرض سعر', 'شراء'),
      steps: [
        { type: 'msg', text: `أهلًا ${CUSTOMER_NAME_TAG}، شكرًا لاهتمامك بخدماتنا.` },
        { type: 'btn', text: 'كيف نقدر نساعدك؟', opts: [['معرفة الأسعار', 'next'], ['طلب عرض سعر', 'next'], ['التحدث مع المبيعات', toDept('d1')]] },
        { type: 'ask', text: 'اكتب اسم المنتج أو الخدمة التي تهمك:', valid: 'any' },
        { type: 'agent', text: 'شكرًا لك، سيتواصل معك فريق المبيعات الآن.', dept: has('d1') ? 'd1' : undefined },
      ],
    },
    {
      id: 'seed_support',
      name: 'الدعم والشكاوى',
      triggers: kw('شكوى', 'مشكلة', 'دعم'),
      steps: [
        { type: 'msg', text: 'نأسف لأي إزعاج واجهته، وسنساعدك في أسرع وقت.' },
        { type: 'btn', text: 'ما نوع طلبك؟', opts: [['شكوى', 'next'], ['مشكلة في الطلب', 'next'], ['استفسار عام', toDept('d2')]] },
        { type: 'ask', text: 'اكتب تفاصيل المشكلة باختصار:', valid: 'any' },
        { type: 'agent', text: 'شكرًا لك، سيتابع معك فريق خدمة العملاء الآن.', dept: has('d2') ? 'd2' : undefined },
      ],
    },
    {
      id: 'seed_billing',
      name: 'الفواتير والمدفوعات',
      triggers: kw('فاتورة', 'دفع', 'استرداد', 'تحويل بنكي'),
      steps: [
        { type: 'btn', text: `أهلًا ${CUSTOMER_NAME_TAG}، ما الذي تحتاجه؟`, opts: [['طلب فاتورة', 'next'], ['مشكلة في الدفع', 'next'], ['استرداد مبلغ', 'next']] },
        { type: 'ask', text: 'اكتب رقم الطلب أو الفاتورة:', valid: 'number', other: toDept('d3') },
        { type: 'agent', text: 'تم استلام طلبك ✅ سيتابع معك فريق المالية الآن.', dept: has('d3') ? 'd3' : undefined },
      ],
    },
    {
      id: 'seed_management',
      name: 'التواصل مع الإدارة',
      triggers: kw('الإدارة', 'مدير', 'اقتراح'),
      steps: [
        { type: 'msg', text: 'يسعدنا سماع رأيك، وتصل رسالتك للإدارة مباشرة.' },
        { type: 'btn', text: 'ما موضوع رسالتك؟', opts: [['اقتراح', 'next'], ['ملاحظة على الخدمة', 'next'], ['شراكة', 'next']] },
        { type: 'ask', text: 'اكتب رسالتك للإدارة:', valid: 'any' },
        { type: 'agent', text: 'شكرًا لك، وصلت رسالتك للإدارة وسيتم الرد عليك.', dept: has('d4') ? 'd4' : undefined },
      ],
    },
  ];

  const numbers = whatsappNumbers();
  const day = 86400000;
  return defs.map((def, i) => {
    const t = blankTemplate(def.name);
    t.id = def.id;
    t.status = 'published';
    t.active = !def.off;
    t.triggers = def.triggers;
    t.channelIds = numbers;
    t.updatedAt = new Date(Date.now() - (defs.length - i) * day).toISOString();
    t.steps = def.steps.map((d): ChatStep => {
      const s = newStep(d.type);
      s.text = d.text;
      if (d.valid) s.valid = d.valid;
      if (d.btnLabel) s.btnLabel = d.btnLabel;
      if (d.other) s.other = d.other;
      if (d.dept) s.dept = d.dept;
      if (d.opts) s.opts = d.opts.map(([label, go]) => ({ label, go }));
      return s;
    });
    return t;
  });
}

function load(): ChatTemplate[] {
  let stored: ChatTemplate[] | null = null;
  let marker: string | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as ChatTemplate[];
    marker = localStorage.getItem(SEED_KEY);
  } catch { /* storage unavailable: start from the ready-made set */ }
  // Templates saved before numbers existed worked on every number, so they keep doing so; older
  // trigger options become keywords only.
  const numbers = whatsappNumbers();
  const withNumbers = (list: ChatTemplate[]): ChatTemplate[] =>
    list.map((t) => normalizeTriggers(Array.isArray(t.channelIds) ? t : { ...t, channelIds: numbers }));
  if (!stored) {
    const fresh = seed();
    save(fresh);
    return fresh;
  }
  if (marker === SEED_VERSION) return withNumbers(stored);
  if (marker === PREVIOUS_SEED_VERSION) {
    // The off-hours template lost its trigger and would be a second default next to the welcome one.
    const next = withNumbers(stored).map((t) => (t.id === OFF_HOURS_ID ? { ...t, active: false } : t));
    save(next);
    return next;
  }
  const own = stored.filter((t) => !OLD_SEED_IDS.includes(t.id));
  const ids = new Set(own.map((t) => t.id));
  const next = withNumbers([...seed().filter((t) => !ids.has(t.id)), ...own]);
  save(next);
  return next;
}

function save(templates: ChatTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    localStorage.setItem(SEED_KEY, SEED_VERSION);
  } catch { /* not persisted */ }
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
