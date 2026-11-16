import { useAdminStore } from '@/store/useAdminStore';
import { useDataStore } from '@/store/useDataStore';
import { channelLabel } from '@components/ui';
import { formatDate } from '@/utils/format';
import { currentAgent, hasPermission, seesAllDepartments } from '@/utils/assistantAccess';

/**
 * The internal assistant: answers staff questions about their own account from the app's data,
 * and explains how to use the system. It never changes anything. While the data is mock there
 * is no model call, so the question is matched to a topic and the answer is built from the
 * same stores the pages read — respecting what the signed-in user is allowed to see.
 */
export interface Answer {
  intro?: string;
  items?: string[];
  outro?: string;
  link?: { to: string; label: string };
  tone?: 'err' | 'warn';
  /** The answer comes from the usage guide rather than the account's data. */
  guide?: boolean;
}

export type Topic =
  | 'sub' | 'usage' | 'open' | 'channels' | 'team' | 'top' | 'camp' | 'contact'
  | 'howWa' | 'howEmp' | 'howQr' | 'howCamp' | 'action' | 'none';

export interface QuickQuestion {
  topic: Topic;
  label: string;
  /** Hidden from users who could not read the answer anyway. */
  visible?: () => boolean;
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  { topic: 'sub', label: 'حالة اشتراكي', visible: () => hasPermission('billing.view') },
  { topic: 'open', label: 'المحادثات المفتوحة الآن' },
  { topic: 'channels', label: 'حالة القنوات' },
  { topic: 'team', label: 'الموظفون المتصلون' },
  { topic: 'howWa', label: 'كيف أربط واتساب؟' },
  { topic: 'howEmp', label: 'كيف أضيف موظفًا؟', visible: () => hasPermission('team.invite') },
];

const NO_PERMISSION: Answer = { intro: 'ليست لديك صلاحية لعرض هذه المعلومات.', tone: 'err' };

function norm(s: string): string {
  return s
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/** Which topic a typed question is about. */
export function detectTopic(question: string): Topic {
  const s = norm(question);
  const has = (...w: string[]): boolean => w.some((x) => s.includes(norm(x)));
  if (has('حول', 'احذف', 'امسح', 'اضف وسم', 'اغلق', 'ارسل رساله', 'غير حاله', 'اسند')) return 'action';
  if (has('اربط واتساب', 'ربط واتساب', 'اربط حساب', 'كيف اربط', 'اوصل واتساب')) return 'howWa';
  if (has('اضيف موظف', 'اضافه موظف', 'موظف جديد', 'ادعو موظف')) return 'howEmp';
  if (has('رد سريع', 'ردود سريعه')) return 'howQr';
  if (has('اطلق حمله', 'انشئ حمله', 'حمله جديده', 'اعمل حمله')) return 'howCamp';
  if (has('متبقي', 'باقي', 'تبقي', 'استهلاك', 'حد الباقه')) return 'usage';
  if (has('اشتراك', 'باقه', 'تجديد', 'ينتهي', 'الفاتوره')) return 'sub';
  if (has('افضل موظف', 'اكثر موظف', 'الاكثر', 'افضل', 'ترتيب الموظفين', 'الاداء')) return 'top';
  if (has('حمله', 'حملات')) return 'camp';
  if (has('عميل', 'جهه اتصال', 'جهات الاتصال') || contactNamed(question)) return 'contact';
  if (has('قناه', 'قنوات', 'متصله', 'الربط')) return 'channels';
  if (has('موظف', 'موظفين', 'متاح', 'مشغول', 'الفريق')) return 'team';
  if (has('مفتوحه', 'محادثه', 'محادثات', 'مسند')) return 'open';
  return 'none';
}

function contactNamed(question: string) {
  const q = norm(question);
  return useDataStore.getState().contacts.find((c) => c.name.trim() && q.includes(norm(c.name)));
}

const link = (to: string, label: string): Answer['link'] => ({ to, label });

function myDepartmentIds(): string[] {
  return currentAgent()?.departments ?? [];
}

const STATUS_LABEL = { new: 'جديدة', open: 'مفتوحة', in_progress: 'قيد المعالجة', closed: 'مغلقة' } as const;
const CHANNEL_STATUS = { connected: 'متصل', disconnected: 'مفصول', pending: 'قيد الربط' } as const;
const AGENT_STATUS = { online: 'متاح', busy: 'مشغول', offline: 'غير متصل' } as const;

function subscription(): Answer {
  if (!hasPermission('billing.view')) return NO_PERMISSION;
  const admin = useAdminStore.getState();
  const client = admin.clients.find((c) => c.id === 'client_1');
  const plan = admin.plans.find((p) => p.id === client?.planId);
  const sub = admin.subscriptions.find((s) => s.id === client?.subscriptionId);
  if (!client || !plan || !sub) return { intro: 'لا يوجد اشتراك نشط على حسابك.', tone: 'warn', link: link('/billing', 'فتح صفحة الباقات والاشتراك') };
  const max = plan.limits.conversations;
  const seats = plan.limits.agents;
  return {
    intro: `باقتك الحالية: ${plan.nameAr} (${sub.billingCycle === 'yearly' ? 'سنوي' : 'شهري'}).`,
    items: [
      `يتجدد الاشتراك في ${formatDate(sub.currentPeriodEnd)}.`,
      max < 0
        ? `المحادثات: ${client.conversationCount} هذا الشهر (بلا حد).`
        : `المحادثات: ${client.conversationCount} من ${max} هذا الشهر، المتبقي ${Math.max(0, max - client.conversationCount)}.`,
      `الموظفون: ${useDataStore.getState().agents.filter((a) => a.active).length}${seats < 0 ? '' : ` من ${seats}`}.`,
    ],
    link: link('/billing', 'فتح صفحة الباقات والاشتراك'),
  };
}

function usage(): Answer {
  if (!hasPermission('billing.view')) return NO_PERMISSION;
  const admin = useAdminStore.getState();
  const client = admin.clients.find((c) => c.id === 'client_1');
  const plan = admin.plans.find((p) => p.id === client?.planId);
  const sub = admin.subscriptions.find((s) => s.id === client?.subscriptionId);
  if (!client || !plan || !sub) return subscription();
  const max = plan.limits.conversations;
  return {
    intro:
      max < 0
        ? `استخدمت ${client.conversationCount} محادثة في الدورة الحالية، وباقتك بلا حد للمحادثات.`
        : `استخدمت ${client.conversationCount} محادثة من أصل ${max} في الدورة الحالية، والمتبقي ${Math.max(0, max - client.conversationCount)} محادثة حتى ${formatDate(sub.currentPeriodEnd)}.`,
    link: link('/billing', 'فتح صفحة الباقات والاشتراك'),
  };
}

function openConversations(): Answer {
  const data = useDataStore.getState();
  const agent = currentAgent();
  const open = data.conversations.filter((c) => c.status !== 'closed');
  if (seesAllDepartments()) {
    const byDept = data.departments
      .map((d) => [d.name, open.filter((c) => c.departmentId === d.id).length] as const)
      .filter(([, n]) => n > 0);
    const unassigned = open.filter((c) => !c.departmentId).length;
    return {
      intro: `المحادثات المفتوحة الآن: ${open.length}.`,
      items: [...byDept.map(([name, n]) => `قسم ${name}: ${n}`), ...(unassigned ? [`بدون قسم: ${unassigned}`] : [])],
      link: link('/inbox', 'فتح المحادثات'),
    };
  }
  const mine = open.filter((c) => c.assignedTo === agent?.id);
  const inDepts = open.filter((c) => c.departmentId && myDepartmentIds().includes(c.departmentId));
  const deptNames = data.departments.filter((d) => myDepartmentIds().includes(d.id)).map((d) => d.name).join('، ');
  return {
    intro: `في ${deptNames ? `قسم ${deptNames}` : 'أقسامك'}: ${inDepts.length} محادثة مفتوحة.`,
    items: [`المسندة إليك: ${mine.length} (${mine.filter((c) => c.status === 'in_progress').length} قيد المعالجة، ${mine.filter((c) => c.status === 'new').length} جديدة).`],
    link: link('/inbox', 'فتح المحادثات'),
  };
}

function channelsAnswer(): Answer {
  const data = useDataStore.getState();
  const all = seesAllDepartments();
  const list = data.channels.filter((c) => all || (c.departmentId && myDepartmentIds().includes(c.departmentId)));
  if (!list.length) return { intro: 'لا توجد حسابات مرتبطة بقسمك.', tone: 'warn' };
  const bad = list.filter((c) => c.status !== 'connected');
  return {
    intro: 'حالة الحسابات المربوطة:',
    items: list.map((c) => `${channelLabel(c.type)} · ${c.name}: ${CHANNEL_STATUS[c.status]}`),
    outro: bad.length ? `يحتاج ${bad.map((c) => c.name).join('، ')} إلى مراجعة الربط.` : undefined,
    link: hasPermission('channels.view') ? link('/channels', 'فتح الحسابات والربط') : undefined,
  };
}

function teamAnswer(): Answer {
  const data = useDataStore.getState();
  const all = seesAllDepartments();
  const list = data.agents.filter((a) => a.active && (all || a.departments.some((d) => myDepartmentIds().includes(d))));
  const names = (s: keyof typeof AGENT_STATUS): string => list.filter((a) => a.status === s).map((a) => a.name).join('، ') || '—';
  const working = list.filter((a) => a.status !== 'offline').length;
  return {
    intro: `${all ? '' : 'في قسمك: '}على رأس العمل الآن ${working} من ${list.length}.`,
    items: (Object.keys(AGENT_STATUS) as Array<keyof typeof AGENT_STATUS>).map((s) => `${AGENT_STATUS[s]}: ${names(s)}`),
    link: hasPermission('team.view') ? link('/team', 'فتح فريق العمل') : undefined,
  };
}

function topAgents(): Answer {
  if (!hasPermission('reports.view')) return NO_PERMISSION;
  const data = useDataStore.getState();
  const counts = new Map<string, number>();
  data.conversations.filter((c) => c.status === 'closed' && c.assignedTo).forEach((c) => counts.set(c.assignedTo!, (counts.get(c.assignedTo!) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return { intro: 'لا توجد محادثات مغلقة بعد لترتيب الموظفين.', tone: 'warn' };
  return {
    intro: 'الأكثر إغلاقًا للمحادثات:',
    items: top.map(([id, n], i) => `${i + 1}. ${data.agents.find((a) => a.id === id)?.name ?? '—'}: ${n} محادثة`),
    link: link('/reports', 'فتح التقارير'),
  };
}

function lastCampaign(): Answer {
  if (!hasPermission('campaigns.view')) return NO_PERMISSION;
  const c = [...useDataStore.getState().campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!c) return { intro: 'لا توجد حملات بعد.', tone: 'warn', link: link('/campaigns', 'فتح الحملات') };
  const statusLabel = { draft: 'مسودة', scheduled: 'مجدولة', sending: 'قيد الإرسال', completed: 'مكتملة', failed: 'فشلت' }[c.status];
  return {
    intro: `آخر حملة: ${c.name} (${c.channelType === 'email' ? 'البريد الإلكتروني' : 'واتساب'}) · ${statusLabel}.`,
    items: [`المستهدفون: ${c.targetCount}`, `أُرسلت: ${c.sentCount}`, `نسبة القراءة: ${c.openRate}%`, `بتاريخ: ${formatDate(c.scheduledAt ?? c.createdAt)}`],
    link: link('/campaigns', 'فتح الحملات'),
  };
}

function contactAnswer(question: string): Answer {
  const contact = contactNamed(question);
  if (!contact) return { intro: 'اكتب اسم العميل كما هو في جهات الاتصال لأبحث عن آخر محادثة له.', tone: 'warn' };
  const data = useDataStore.getState();
  const conv = data.conversations.filter((c) => c.contactId === contact.id).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))[0];
  if (!conv) return { intro: `${contact.name}: لا توجد محادثات مسجّلة.`, tone: 'warn' };
  if (!seesAllDepartments() && !(conv.departmentId && myDepartmentIds().includes(conv.departmentId)) && conv.assignedTo !== currentAgent()?.id) return NO_PERMISSION;
  const channel = data.channels.find((c) => c.id === conv.channelId);
  const agent = data.agents.find((a) => a.id === conv.assignedTo);
  return {
    intro: `${contact.name}: آخر محادثة${channel ? ` على ${channelLabel(channel.type)}` : ''} بتاريخ ${formatDate(conv.lastMessageAt)}.`,
    items: [`الحالة: ${STATUS_LABEL[conv.status]}`, `المسندة إلى: ${agent?.name ?? 'غير مسندة'}`],
    link: link('/inbox', 'فتح المحادثات'),
  };
}

const GUIDE: Record<'howWa' | 'howEmp' | 'howQr' | 'howCamp', () => Answer> = {
  howWa: () => ({
    intro: 'لربط حساب واتساب:',
    items: ['افتح صفحة الحسابات والربط، ثم اختر واتساب.', 'اضغط «ربط حساب جديد».', 'اختر طريقة الربط، وأكمل الخطوات حتى تظهر حالة «متصل».'],
    link: link('/channels', 'فتح الحسابات والربط'),
    guide: true,
  }),
  howEmp: () =>
    hasPermission('team.invite')
      ? {
          intro: 'لإضافة موظف:',
          items: ['افتح صفحة فريق العمل.', 'اضغط «إضافة موظف»، وأدخل الاسم والبريد الإلكتروني.', 'اختر الدور والقسم والحسابات المسند إليها، ثم احفظ.'],
          outro: 'سيصل إلى الموظف بريد لإنشاء كلمة المرور.',
          link: link('/team', 'فتح فريق العمل'),
          guide: true,
        }
      : { intro: 'إضافة الموظفين تحتاج صلاحية دعوة موظف. تواصل مع مسؤول الحساب.', tone: 'warn' },
  howQr: () => ({
    intro: 'لإنشاء رد سريع:',
    items: ['افتح المحادثات، ثم أيقونة الردود السريعة في مربع الكتابة.', 'اضغط «رد جديد»، واكتب العنوان والنص.'],
    outro: 'يمكنك استخدامه بعد ذلك في أي محادثة.',
    link: link('/inbox', 'فتح المحادثات'),
    guide: true,
  }),
  howCamp: () => ({
    intro: 'لإطلاق حملة:',
    items: ['افتح صفحة الحملات، واضغط «حملة جديدة».', 'اختر القناة (واتساب أو البريد الإلكتروني) والقالب.', 'حدد الجمهور ووقت الإرسال، ثم أطلق الحملة.'],
    link: link('/campaigns', 'فتح الحملات'),
    guide: true,
  }),
};

/** The answer to a topic for the signed-in user. */
export function answerFor(topic: Topic, question = ''): Answer {
  switch (topic) {
    case 'sub': return subscription();
    case 'usage': return usage();
    case 'open': return openConversations();
    case 'channels': return channelsAnswer();
    case 'team': return teamAnswer();
    case 'top': return topAgents();
    case 'camp': return lastCampaign();
    case 'contact': return contactAnswer(question);
    case 'howWa': case 'howEmp': case 'howQr': case 'howCamp': return GUIDE[topic]();
    case 'action': return { intro: 'لا يمكنني تنفيذ الإجراءات، لكن يمكنك تنفيذها بنفسك من الصفحة المناسبة.', tone: 'warn' };
    default: return { intro: 'لم أجد إجابة لهذا السؤال. جرّب صياغة أخرى، أو اسأل عن حسابك أو طريقة استخدام النظام.', tone: 'warn' };
  }
}
