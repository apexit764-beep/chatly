/**
 * Chat templates: a fixed script of steps (messages, questions, buttons, lists) that the
 * client sends to a customer on WhatsApp, either by hand from the conversation or
 * automatically from a trigger. This file holds the model, the checks run before publishing
 * and the runner that walks a customer through the steps.
 */

export type StepType = 'msg' | 'ask' | 'btn' | 'list' | 'agent' | 'end';
export type AnswerKind = 'any' | 'number' | 'email' | 'phone';
/**
 * Where a step leads: the next step, a hand-over to any staff member, a hand-over to one
 * department (`dept:<departmentId>`), the end, or a step by id.
 */
export type StepTarget = 'next' | 'agent' | 'end' | (string & {});

export const DEPT_PREFIX = 'dept:';
export function deptTarget(departmentId: string): StepTarget {
  return `${DEPT_PREFIX}${departmentId}`;
}
/** The department a target hands over to, or null when it is not a department hand-over. */
export function deptOf(target: StepTarget | undefined): string | null {
  return target && target.startsWith(DEPT_PREFIX) ? target.slice(DEPT_PREFIX.length) : null;
}

export interface StepOption {
  label: string;
  go: StepTarget;
}

export interface ChatStep {
  id: string;
  type: StepType;
  text: string;
  /** msg / ask: where it goes afterwards. */
  go: StepTarget;
  /** ask: how the answer is checked. */
  valid: AnswerKind;
  /** list: the label of the button that opens the list. */
  btnLabel?: string;
  /** btn / list: the choices. */
  opts?: StepOption[];
  /** Where it goes when the customer fails twice (wrong answer or text instead of a choice). */
  other: StepTarget;
  /** agent: the department the conversation is handed to. Absent means any available staff member. */
  dept?: string;
}

/**
 * Every template is sent automatically with the customer's first message (a new customer, or a
 * message after the conversation was closed), on the template's numbers. A number has at most one
 * switched-on template, so there is nothing to choose between. The fields are kept only so older
 * saved templates load; none of them is used.
 */
export interface ChatTemplateTriggers {
  first: boolean;
  kw: boolean;
  kws: string[];
  off: boolean;
}

export const NO_TRIGGERS: ChatTemplateTriggers = { first: false, kw: false, kws: [], off: false };

/** Clears the trigger options of a template saved before they were removed. */
export function normalizeTriggers(t: ChatTemplate): ChatTemplate {
  return { ...t, triggers: { ...NO_TRIGGERS, kws: [] } };
}

export interface ChatTemplate {
  id: string;
  name: string;
  status: 'published' | 'draft';
  /** A published template can be switched off without losing it. */
  active: boolean;
  triggers: ChatTemplateTriggers;
  /** Sent with the choices again when the customer answers with something else. */
  retry: string;
  /** Minutes of silence before the single reminder. */
  timeout: number;
  remind: string;
  steps: ChatStep[];
  /** The WhatsApp numbers (channel ids) the template works on. At least one to publish. */
  channelIds: string[];
  updatedAt: string;
}

export const STEP_TYPES: Record<StepType, { title: string; hint: string }> = {
  msg: { title: 'رسالة نصية', hint: 'رسالة يرسلها القالب ثم ينتقل للخطوة التالية مباشرة' },
  ask: { title: 'سؤال مفتوح', hint: 'سؤال يكتب العميل إجابته بنفسه' },
  btn: { title: 'أزرار اختيار', hint: 'حتى 3 أزرار، ولكل زر مسار' },
  list: { title: 'قائمة اختيارات', hint: 'حتى 10 اختيارات، ولكل اختيار مسار' },
  agent: { title: 'تحويل لموظف', hint: 'يوقف القالب ويحوّل المحادثة لموظف' },
  end: { title: 'إنهاء القالب', hint: 'رسالة ختامية ثم ينتهي القالب' },
};

export const ANSWER_KINDS: Record<AnswerKind, string> = {
  any: 'أي نص',
  number: 'رقم',
  email: 'بريد إلكتروني',
  phone: 'رقم جوال',
};

export const MAX_BUTTONS = 3;
export const MAX_LIST_ITEMS = 10;
/** WhatsApp's own limit on a button or list label. */
export const MAX_OPTION_LENGTH = 20;
export const MIN_OPTIONS = 2;
export const REMINDER_CHOICES: Array<[number, string]> = [
  [30, '30 دقيقة'],
  [60, 'ساعة'],
  [180, '3 ساعات'],
  [360, '6 ساعات'],
];
export const DEFAULT_RETRY = 'من فضلك اختر من الاختيارات التالية:';
export const DEFAULT_REMIND = 'هل ما زلت معنا؟ يمكنك الإكمال من حيث توقفت.';
export const CUSTOMER_NAME_TAG = '{اسم العميل}';

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function newStep(type: StepType): ChatStep {
  const step: ChatStep = { id: newId('st'), type, text: '', go: 'next', other: 'agent', valid: 'any' };
  if (type === 'btn' || type === 'list') step.opts = [{ label: '', go: 'next' }, { label: '', go: 'next' }];
  if (type === 'list') step.btnLabel = 'عرض الخيارات';
  return step;
}

export function blankTemplate(name = ''): ChatTemplate {
  return {
    id: newId('ct'),
    name,
    status: 'draft',
    active: true,
    triggers: { ...NO_TRIGGERS, kws: [] },
    retry: DEFAULT_RETRY,
    timeout: 60,
    remind: DEFAULT_REMIND,
    steps: [],
    channelIds: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Same template with fresh ids; the paths between steps follow the new ids. */
export function cloneTemplate(t: ChatTemplate, patch: Partial<ChatTemplate> = {}): ChatTemplate {
  const copy: ChatTemplate = JSON.parse(JSON.stringify(t));
  const map = new Map<string, string>();
  copy.steps.forEach((s) => {
    const id = newId('st');
    map.set(s.id, id);
    s.id = id;
  });
  const remap = (g: StepTarget): StepTarget => map.get(g) ?? g;
  copy.steps.forEach((s) => {
    s.go = remap(s.go);
    s.other = remap(s.other);
    s.opts?.forEach((o) => { o.go = remap(o.go); });
  });
  return { ...copy, id: newId('ct'), ...patch };
}

/** Arabic digits and punctuation stripped, so «٢» and «2.» match the same choice. */
export function normalizeReply(x: string): string {
  return x
    .trim()
    .toLowerCase()
    .replace(/[!؟?.،,]/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function fillName(text: string, customerName: string): string {
  return text.split(CUSTOMER_NAME_TAG).join(customerName);
}

/** Does the template work on this WhatsApp number? */
export function worksOn(t: ChatTemplate, channelId: string | undefined): boolean {
  return !channelId || (t.channelIds ?? []).includes(channelId);
}

/** A published, switched-on template other than `t` — the kind that holds its numbers. */
function holdsNumbers(x: ChatTemplate, t: ChatTemplate): boolean {
  return x.id !== t.id && x.status === 'published' && x.active;
}

/** For each number, the other switched-on template already working on it (numbers held by none are absent). */
export function numbersTakenBy(t: ChatTemplate, all: ChatTemplate[]): Map<string, ChatTemplate> {
  const taken = new Map<string, ChatTemplate>();
  all.filter((x) => holdsNumbers(x, t)).forEach((x) => (x.channelIds ?? []).forEach((c) => { if (!taken.has(c)) taken.set(c, x); }));
  return taken;
}

/**
 * A number works with one switched-on template only. Returns why `t` cannot be switched on or
 * published alongside the others, or null. `numberName` turns a channel id into its display name.
 */
export function findConflict(t: ChatTemplate, all: ChatTemplate[], numberName: (id: string) => string = (id) => id): string | null {
  const taken = numbersTakenBy(t, all);
  const clash = (t.channelIds ?? []).find((c) => taken.has(c));
  if (!clash) return null;
  return `الرقم «${numberName(clash)}» عليه قالب آخر مفعّل («${taken.get(clash)!.name}»)`;
}

export interface TemplateIssue {
  message: string;
  tab: 'steps' | 'settings';
  stepId?: string;
}

/**
 * What stops a template being published, first problem only. `deptIds` are the departments
 * that exist now; a hand-over to a deleted one is caught here.
 */
export function validateForPublish(
  t: ChatTemplate,
  all: ChatTemplate[],
  deptIds?: string[],
  numberName?: (id: string) => string,
): TemplateIssue | null {
  if (!t.name.trim()) return { message: 'أدخل اسم القالب', tab: 'steps' };
  if (!t.steps.length) return { message: 'أضف خطوة واحدة على الأقل', tab: 'steps' };
  for (let i = 0; i < t.steps.length; i += 1) {
    const s = t.steps[i];
    const at = `الخطوة ${i + 1}: `;
    if (deptIds) {
      const targets = [s.go, s.other, ...(s.opts ?? []).map((o) => o.go)].map(deptOf);
      if (s.type === 'agent' && s.dept) targets.push(s.dept);
      if (targets.some((d) => d && !deptIds.includes(d))) {
        return { message: `${at}القسم المحدد لم يعد موجودًا، اختر قسمًا آخر`, tab: 'steps', stepId: s.id };
      }
    }
    if (s.type !== 'agent' && !s.text.trim()) return { message: `${at}أدخل نص الرسالة`, tab: 'steps', stepId: s.id };
    if (s.type === 'list' && !(s.btnLabel ?? '').trim()) return { message: `${at}أدخل نص زر القائمة`, tab: 'steps', stepId: s.id };
    if (s.opts) {
      if (s.opts.some((o) => !o.label.trim())) return { message: `${at}أدخل نص كل خيار`, tab: 'steps', stepId: s.id };
      if (s.opts.some((o) => o.label.length > MAX_OPTION_LENGTH)) return { message: `${at}نص الخيار يجب ألا يتجاوز ${MAX_OPTION_LENGTH} حرفًا`, tab: 'steps', stepId: s.id };
      const labels = s.opts.map((o) => o.label.trim());
      if (new Set(labels).size !== labels.length) return { message: `${at}لا يمكن تكرار نص الخيار`, tab: 'steps', stepId: s.id };
    }
  }
  if (!(t.channelIds ?? []).length) return { message: 'اختر رقمًا واحدًا على الأقل يعمل عليه القالب', tab: 'settings' };
  const conflict = findConflict(t, all, numberName);
  if (conflict) return { message: conflict, tab: 'settings' };
  return null;
}

/* ───────────────────────────── runner ───────────────────────────── */

export interface RunState {
  templateId: string;
  /** The step waiting for the customer, or null once the run has ended. */
  cur: string | null;
  /** Wrong answers at the current step. */
  attempts: number;
  /** The reminder has been sent once. */
  reminded: boolean;
  done: boolean;
}

export interface RunSink {
  /** A message to the customer; `step` is given when it carries choices. */
  bot: (text: string, step?: ChatStep) => void;
  /** A line about the run itself (handed over, ended, stopped). */
  sys: (text: string) => void;
  /** The run handed the conversation over: to a department, or (null) to any staff member. */
  handover?: (departmentId: string | null) => void;
  /** A department's name, or undefined when it no longer exists. */
  deptName?: (departmentId: string) => string | undefined;
}

export function newRunState(templateId: string): RunState {
  return { templateId, cur: null, attempts: 0, reminded: false, done: false };
}

const ANSWER_CHECKS: Record<AnswerKind, (raw: string) => boolean> = {
  any: () => true,
  number: (raw) => /^\d+([.,]\d+)?$/.test(normalizeReply(raw)),
  email: (raw) => /^\S+@\S+\.\S+$/.test(raw.trim()),
  phone: (raw) => /^\+?\d{8,15}$/.test(normalizeReply(raw).replace(/[\s-]/g, '')),
};

/** Walks one customer through a template. State is a plain object so the caller can keep it. */
export class ChatRunner {
  constructor(
    readonly template: ChatTemplate,
    readonly state: RunState,
    private readonly sink: RunSink,
    private readonly customerName: string,
  ) {}

  get done(): boolean { return this.state.done; }

  get current(): ChatStep | null {
    return this.state.cur ? this.template.steps.find((s) => s.id === this.state.cur) ?? null : null;
  }

  start(): void {
    if (!this.template.steps.length) { this.sink.sys('القالب لا يحتوي على خطوات'); this.state.done = true; return; }
    this.exec(this.template.steps[0].id);
  }

  /** The customer wrote something. Returns false when no run is waiting for it. */
  reply(text: string): boolean {
    const s = this.current;
    if (this.state.done || !s) return false;
    this.state.reminded = false;
    if (s.type === 'ask') {
      if (ANSWER_CHECKS[s.valid](text)) { this.go(s.go, s.id); return true; }
      this.state.attempts += 1;
      if (this.state.attempts < 2) { this.sink.bot(`الرجاء إدخال ${ANSWER_KINDS[s.valid]} صحيح.`); return true; }
      this.go(s.other || 'agent', s.id);
      return true;
    }
    const opts = s.opts ?? [];
    const n = normalizeReply(text);
    const i = opts.findIndex((o, j) => normalizeReply(o.label) === n || n === String(j + 1));
    if (i >= 0) { this.go(opts[i].go, s.id); return true; }
    this.state.attempts += 1;
    if (this.state.attempts < 2) { this.sink.bot(this.template.retry, s); return true; }
    this.go(s.other || 'agent', s.id);
    return true;
  }

  /** The customer tapped a button or list item. */
  pick(index: number): void {
    const s = this.current;
    const o = s?.opts?.[index];
    if (!s || !o) return;
    this.state.reminded = false;
    this.go(o.go, s.id);
  }

  /** The silence timeout passed: one reminder, then the run stops. */
  noReply(): void {
    const s = this.current;
    if (this.state.done || !s) return;
    if (!this.state.reminded) {
      this.state.reminded = true;
      this.sink.bot(this.template.remind, s.opts ? s : undefined);
      return;
    }
    this.finish('توقف القالب لعدم رد العميل، والمحادثة متاحة للموظفين');
  }

  /** A staff member stopped it. */
  stop(): void { this.finish('أوقف الموظف القالب'); }

  private finish(line: string): void {
    this.state.done = true;
    this.state.cur = null;
    this.sink.sys(line);
  }

  /** Hands over to the department, or to any staff member when it is absent or was deleted. */
  private handOver(departmentId: string | null | undefined): void {
    const name = departmentId ? this.sink.deptName?.(departmentId) : undefined;
    if (departmentId && name) {
      this.finish(`تم تحويل المحادثة إلى قسم «${name}»`);
      this.sink.handover?.(departmentId);
      return;
    }
    this.finish('تم تحويل المحادثة إلى موظف');
    this.sink.handover?.(null);
  }

  private go(target: StepTarget, from: string): void {
    if (target === 'agent') { this.handOver(null); return; }
    const dept = deptOf(target);
    if (dept) { this.handOver(dept); return; }
    if (target === 'end') { this.finish('انتهى القالب'); return; }
    if (target === 'next') {
      const i = this.template.steps.findIndex((s) => s.id === from);
      const next = this.template.steps[i + 1];
      if (!next) { this.finish('انتهى القالب'); return; }
      this.exec(next.id);
      return;
    }
    this.exec(target);
  }

  private exec(id: string): void {
    const s = this.template.steps.find((x) => x.id === id);
    if (!s) { this.finish('انتهى القالب'); return; }
    this.state.cur = s.id;
    this.state.attempts = 0;
    this.state.reminded = false;
    const text = fillName(s.text, this.customerName);
    if (s.type === 'msg') { this.sink.bot(text); this.go(s.go, s.id); return; }
    if (s.type === 'end') { if (text) this.sink.bot(text); this.finish('انتهى القالب'); return; }
    if (s.type === 'agent') { if (text) this.sink.bot(text); this.handOver(s.dept); return; }
    this.sink.bot(text, s.type === 'ask' ? undefined : { ...s, text });
  }
}

const live = (t: ChatTemplate, channelId?: string): boolean => t.status === 'published' && t.active && worksOn(t, channelId);

/** The template for the customer's first message on this number: its one switched-on template, or none. */
export function templateForFirstMessage(all: ChatTemplate[], channelId?: string): ChatTemplate | null {
  return all.find((t) => live(t, channelId)) ?? null;
}

/* ───────────────────────── draft from a description ───────────────────────── */

type Draft = { type: StepType; text: string; opts?: string[]; btnLabel?: string; valid?: AnswerKind };

/** A starting point built from the description. Placeholder for the real model call. */
export function draftFromDescription(description: string): ChatTemplate {
  const has = (...words: string[]): boolean => words.some((w) => description.includes(w));
  let name: string;
  let steps: Draft[];
  if (has('حجز', 'موعد')) {
    name = 'حجز موعد';
    steps = [
      { type: 'msg', text: `أهلًا ${CUSTOMER_NAME_TAG} 👋\nيسعدنا مساعدتك في حجز موعد.` },
      { type: 'btn', text: 'ما نوع الخدمة التي تريدها؟', opts: ['استشارة', 'متابعة', 'أخرى'] },
      { type: 'list', text: 'اختر اليوم المناسب لك:', btnLabel: 'عرض الأيام', opts: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] },
      { type: 'ask', text: 'اكتب رقم جوال للتواصل معك:', valid: 'phone' },
      { type: 'end', text: 'تم استلام طلبك ✅ سيتواصل معك أحد موظفينا لتأكيد الموعد.' },
    ];
  } else if (has('سعر', 'أسعار', 'منتج', 'باقة')) {
    name = 'الاستفسار عن الأسعار';
    steps = [
      { type: 'msg', text: `أهلًا ${CUSTOMER_NAME_TAG}، شكرًا لاهتمامك بمنتجاتنا.` },
      { type: 'list', text: 'ما المنتج الذي تريد معرفة سعره؟', btnLabel: 'عرض المنتجات', opts: ['المنتج الأول', 'المنتج الثاني', 'المنتج الثالث'] },
      { type: 'btn', text: 'هل تريد التحدث مع أحد موظفي المبيعات؟', opts: ['نعم', 'لا'] },
      { type: 'end', text: 'شكرًا لك، نسعد بخدمتك في أي وقت.' },
    ];
  } else if (has('شكوى', 'مشكلة', 'دعم')) {
    name = 'استقبال الشكاوى';
    steps = [
      { type: 'msg', text: 'نأسف لأي إزعاج واجهته، وسنساعدك في أسرع وقت.' },
      { type: 'btn', text: 'ما نوع المشكلة؟', opts: ['مشكلة في الطلب', 'مشكلة في الدفع', 'أخرى'] },
      { type: 'ask', text: 'اكتب تفاصيل المشكلة باختصار:', valid: 'any' },
      { type: 'agent', text: 'شكرًا لك، سيتابع معك أحد الموظفين الآن.' },
    ];
  } else {
    name = 'قالب جديد';
    steps = [
      { type: 'msg', text: `أهلًا ${CUSTOMER_NAME_TAG} 👋` },
      { type: 'btn', text: 'كيف يمكننا مساعدتك؟', opts: ['استفسار', 'شكوى', 'التحدث مع موظف'] },
      { type: 'ask', text: 'اكتب سؤالك وسنرد عليك:', valid: 'any' },
      { type: 'end', text: 'شكرًا لتواصلك معنا.' },
    ];
  }
  const t = blankTemplate(name);
  t.steps = steps.map((d) => {
    const s = newStep(d.type);
    s.text = d.text;
    if (d.valid) s.valid = d.valid;
    if (d.btnLabel) s.btnLabel = d.btnLabel;
    if (d.opts) s.opts = d.opts.map((label) => ({ label, go: d.type === 'btn' && /موظف|أخرى|نعم/.test(label) ? 'agent' : 'next' }));
    return s;
  });
  return t;
}
