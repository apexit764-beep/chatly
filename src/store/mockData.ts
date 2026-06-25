import type {
  Agent,
  Campaign,
  CampaignTemplate,
  Channel,
  Contact,
  Conversation,
  Department,
  Integration,
  Notification,
  Template,
  TemplateCategoryItem,
  WidgetConfig,
} from '@/types';

const nowMinus = (min: number): string =>
  new Date(Date.now() - min * 60 * 1000).toISOString();

// ============================================================
// Departments
// ============================================================
export const departments: Department[] = [
  {
    id: 'd1',
    name: 'المبيعات',
    description: 'فريق بيع العقارات وتأجير السيارات',
    color: '#2563EB',
    channels: ['ch1', 'ch2'],
    agents: ['a2', 'a5'],
    createdAt: nowMinus(60 * 24 * 200),
  },
  {
    id: 'd2',
    name: 'خدمة العملاء',
    description: 'الرد على استفسارات العملاء والشكاوى',
    color: '#10B981',
    channels: ['ch1', 'ch3'],
    agents: ['a3'],
    createdAt: nowMinus(60 * 24 * 180),
  },
  {
    id: 'd3',
    name: 'المالية',
    description: 'الفواتير والمدفوعات والتحصيل',
    color: '#F59E0B',
    channels: ['ch4'],
    agents: ['a4'],
    createdAt: nowMinus(60 * 24 * 150),
  },
  {
    id: 'd4',
    name: 'الإدارة',
    description: 'القرارات والمتابعة العامة',
    color: '#EF4444',
    channels: ['ch1', 'ch2', 'ch3', 'ch4'],
    agents: ['a1'],
    createdAt: nowMinus(60 * 24 * 365),
  },
];

// ============================================================
// Channels (WhatsApp numbers + others)
// ============================================================
export const channels: Channel[] = [
  {
    id: 'ch1',
    type: 'whatsapp',
    name: 'الرقم الرئيسي',
    identifier: '+968 2400 0000',
    status: 'connected',
    departmentId: 'd1',
    unreadCount: 3,
    color: '#25D366',
    createdAt: nowMinus(60 * 24 * 365),
  },
  {
    id: 'ch2',
    type: 'whatsapp',
    name: 'المبيعات - عقارات',
    identifier: '+968 9999 1111',
    status: 'connected',
    departmentId: 'd1',
    unreadCount: 1,
    color: '#25D366',
    createdAt: nowMinus(60 * 24 * 180),
  },
  {
    id: 'ch3',
    type: 'whatsapp',
    name: 'خدمة العملاء',
    identifier: '+968 9999 2222',
    status: 'connected',
    departmentId: 'd2',
    unreadCount: 2,
    color: '#25D366',
    createdAt: nowMinus(60 * 24 * 90),
  },
  {
    id: 'ch4',
    type: 'whatsapp',
    name: 'الفواتير والدفع',
    identifier: '+968 9999 3333',
    status: 'connected',
    departmentId: 'd3',
    unreadCount: 0,
    color: '#25D366',
    createdAt: nowMinus(60 * 24 * 60),
  },
  {
    id: 'ch5',
    type: 'messenger',
    name: 'Qhub - Facebook',
    identifier: 'qhub.page',
    status: 'connected',
    departmentId: 'd2',
    unreadCount: 1,
    color: '#0084FF',
    createdAt: nowMinus(60 * 24 * 30),
  },
  {
    id: 'ch6',
    type: 'instagram',
    name: 'qhub_official',
    identifier: '@qhub_official',
    status: 'connected',
    departmentId: 'd2',
    unreadCount: 2,
    color: '#E4405F',
    createdAt: nowMinus(60 * 24 * 25),
  },
  {
    id: 'ch7',
    type: 'widget',
    name: 'موقع Qhub - شات حي',
    identifier: 'qhub.com',
    status: 'connected',
    departmentId: 'd2',
    unreadCount: 0,
    color: '#2563EB',
    createdAt: nowMinus(60 * 24 * 15),
  },
  {
    id: 'ch8',
    type: 'telegram',
    name: 'Telegram Bot',
    identifier: '@QhubBot',
    status: 'disconnected',
    departmentId: null,
    unreadCount: 0,
    color: '#0088CC',
    createdAt: nowMinus(60 * 24 * 5),
  },
];

// ============================================================
// Agents
// ============================================================
export const agents: Agent[] = [
  {
    id: 'a1',
    name: 'سالم الرواحي',
    email: 'salim@qhub.com',
    role: 'manager',
    roleId: 'role_owner',
    invitationStatus: 'active',
    status: 'online',
    active: true,
    lastActive: nowMinus(2),
    channels: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'],
    departments: ['d4'],
  },
  {
    id: 'a2',
    name: 'فاطمة البلوشي',
    email: 'fatma@qhub.com',
    role: 'agent',
    roleId: 'role_support',
    invitationStatus: 'active',
    status: 'online',
    active: true,
    lastActive: nowMinus(5),
    channels: ['ch1', 'ch2'],
    departments: ['d1'],
  },
  {
    id: 'a3',
    name: 'محمد الحارثي',
    email: 'mohammed@qhub.com',
    role: 'agent',
    roleId: 'role_support',
    invitationStatus: 'active',
    status: 'busy',
    active: true,
    lastActive: nowMinus(1),
    channels: ['ch3', 'ch5', 'ch6', 'ch7'],
    departments: ['d2'],
  },
  {
    id: 'a4',
    name: 'نور العلوي',
    email: 'noor@qhub.com',
    role: 'agent',
    roleId: 'role_support',
    invitationStatus: 'active',
    status: 'offline',
    active: true,
    lastActive: nowMinus(180),
    channels: ['ch4'],
    departments: ['d3'],
  },
  {
    id: 'a5',
    name: 'خالد الكندي',
    email: 'khalid@qhub.com',
    role: 'agent',
    roleId: 'role_support',
    invitationStatus: 'active',
    status: 'online',
    active: true,
    lastActive: nowMinus(8),
    channels: ['ch1', 'ch2'],
    departments: ['d1'],
  },
  {
    id: 'a6',
    name: 'أحمد المخيني',
    email: 'ahmed@qhub.com',
    role: 'agent',
    roleId: 'role_support',
    invitationStatus: 'pending',
    invitedAt: nowMinus(60 * 24 * 2),
    status: 'offline',
    active: false,
    lastActive: nowMinus(60 * 24 * 2),
    channels: [],
    departments: ['d1'],
  },
];

// ============================================================
// Contacts
// ============================================================
export const contacts: Contact[] = [
  { id: 'c1', name: 'أحمد الشعيلي', phone: '+96891234567', type: 'customer', notes: 'يبحث عن شقة في مسقط بإيجار شهري لا يتجاوز 350 ر.ع', tags: ['مسقط', 'شقة'], blocked: false, conversationCount: 8, lastContact: nowMinus(15), createdAt: nowMinus(60 * 24 * 30), channels: ['whatsapp'] },
  { id: 'c2', name: 'سارة المعمري', phone: '+96892345678', type: 'company', notes: 'تملك 3 شقق في الخوض، تريد عرضها للإيجار', tags: ['الخوض', 'مالك ذهبي'], blocked: false, conversationCount: 14, lastContact: nowMinus(45), createdAt: nowMinus(60 * 24 * 90), channels: ['whatsapp', 'messenger'] },
  { id: 'c3', name: 'شركة الوفاء للتطوير', phone: '+96893456789', type: 'company', notes: 'شركة تطوير عقاري - مشاريع متعددة', tags: ['B2B', 'مطور'], blocked: false, conversationCount: 23, lastContact: nowMinus(120), createdAt: nowMinus(60 * 24 * 200), channels: ['whatsapp'] },
  { id: 'c4', name: 'عبدالله الهنائي', phone: '+96894567890', type: 'lead', tags: ['صلالة'], blocked: false, conversationCount: 3, lastContact: nowMinus(240), createdAt: nowMinus(60 * 24 * 7), channels: ['widget'] },
  { id: 'c5', name: 'منى الزدجالية', phone: '+96895678901', type: 'vip', notes: 'عميلة VIP - استجابة فورية مطلوبة', tags: ['VIP', 'استجابة سريعة'], blocked: false, conversationCount: 31, lastContact: nowMinus(8), createdAt: nowMinus(60 * 24 * 365), channels: ['whatsapp', 'instagram'] },
  { id: 'c6', name: 'يوسف البوسعيدي', phone: '+96896789012', type: 'customer', tags: ['نزوى'], blocked: false, conversationCount: 5, lastContact: nowMinus(60), createdAt: nowMinus(60 * 24 * 15), channels: ['whatsapp'] },
  { id: 'c7', name: 'هدى الفارسي', phone: '+96897890123', type: 'company', tags: ['صحار'], blocked: false, conversationCount: 9, lastContact: nowMinus(300), createdAt: nowMinus(60 * 24 * 120), channels: ['whatsapp', 'widget'] },
  { id: 'c8', name: 'بدر السيابي', phone: '+96898901234', type: 'lead', tags: ['سيارة', 'تويوتا'], blocked: false, conversationCount: 2, lastContact: nowMinus(35), createdAt: nowMinus(60 * 24 * 3), channels: ['instagram'] },
  { id: 'c9', name: 'ريم اللواتي', phone: '+96899012345', type: 'customer', tags: ['مسقط', 'فيلا'], blocked: false, conversationCount: 12, lastContact: nowMinus(90), createdAt: nowMinus(60 * 24 * 45), channels: ['whatsapp'] },
  { id: 'c10', name: 'مجموعة العمري التجارية', phone: '+96890123456', type: 'company', tags: ['B2B'], blocked: false, conversationCount: 17, lastContact: nowMinus(420), createdAt: nowMinus(60 * 24 * 180), channels: ['whatsapp', 'messenger'] },
  { id: 'c11', name: 'علي الجابري', phone: '+96891111111', type: 'customer', tags: ['مسقط'], blocked: true, conversationCount: 1, lastContact: nowMinus(60 * 24 * 60), createdAt: nowMinus(60 * 24 * 80), channels: ['whatsapp'] },
  { id: 'c12', name: 'لطيفة الحبسي', phone: '+96892222222', type: 'vip', tags: ['VIP'], blocked: false, conversationCount: 28, lastContact: nowMinus(25), createdAt: nowMinus(60 * 24 * 300), channels: ['whatsapp'] },
];

// ============================================================
// Conversations
// ============================================================
export const conversations: Conversation[] = [
  {
    id: 'conv1', contactId: 'c1', assignedTo: 'a2', status: 'pending',
    channelId: 'ch2', departmentId: 'd1', aiHandedOff: true,
    lastMessage: 'هل الشقة في الخوض ما زالت متاحة؟',
    lastMessageAt: nowMinus(15), unreadCount: 2,
    notes: ['العميل مهتم جداً، تواصل غداً صباحاً'],
    activityLog: [
      { id: 'e1', type: 'assign', description: 'تم تحويل المحادثة من المساعد الذكي إلى فاطمة البلوشي', by: 'a1', timestamp: nowMinus(20) },
      { id: 'e2', type: 'status', description: 'تغيير الحالة إلى قيد المعالجة', by: 'a2', timestamp: nowMinus(18) },
    ],
    messages: [
      { id: 'm1', conversationId: 'conv1', direction: 'in', type: 'text', content: 'السلام عليكم', timestamp: nowMinus(25), read: true, delivered: true },
      { id: 'm2', conversationId: 'conv1', direction: 'out', type: 'text', content: 'وعليكم السلام ورحمة الله، أهلاً وسهلاً بك في Qhub. كيف يمكنني مساعدتك؟', timestamp: nowMinus(24), read: true, delivered: true, sender: 'ai' },
      { id: 'm3', conversationId: 'conv1', direction: 'in', type: 'text', content: 'أبحث عن شقة للإيجار في مسقط بميزانية 350 ر.ع', timestamp: nowMinus(22), read: true, delivered: true },
      { id: 'm4', conversationId: 'conv1', direction: 'out', type: 'text', content: 'لدينا عدة خيارات متاحة في الخوض والسيب. هل تفضل غرفة واحدة أم غرفتين؟', timestamp: nowMinus(20), read: true, delivered: true, sender: 'ai' },
      { id: 'm5', conversationId: 'conv1', direction: 'in', type: 'text', content: 'غرفتين من فضلك', timestamp: nowMinus(19), read: true, delivered: true },
      { id: 'm6', conversationId: 'conv1', direction: 'in', type: 'text', content: 'هل الشقة في الخوض ما زالت متاحة؟', timestamp: nowMinus(15), read: false, delivered: true },
    ],
  },
  {
    id: 'conv2', contactId: 'c5', assignedTo: 'a1', status: 'new',
    channelId: 'ch1', departmentId: 'd4',
    lastMessage: 'أريد عرض الفيلا مع معاينة هذا الأسبوع',
    lastMessageAt: nowMinus(8), unreadCount: 1, notes: [], activityLog: [],
    messages: [
      { id: 'm10', conversationId: 'conv2', direction: 'in', type: 'text', content: 'مرحباً سالم', timestamp: nowMinus(10), read: true, delivered: true },
      { id: 'm11', conversationId: 'conv2', direction: 'in', type: 'text', content: 'أريد عرض الفيلا مع معاينة هذا الأسبوع', timestamp: nowMinus(8), read: false, delivered: true },
    ],
  },
  {
    id: 'conv3', contactId: 'c3', assignedTo: 'a3', status: 'pending',
    channelId: 'ch3', departmentId: 'd2', aiHandedOff: true,
    lastMessage: 'سنرسل العقد المعدل قريباً', lastMessageAt: nowMinus(120),
    unreadCount: 0, notes: ['مراجعة العقد من القانوني'], activityLog: [],
    messages: [
      { id: 'm20', conversationId: 'conv3', direction: 'in', type: 'text', content: 'صباح الخير، نريد متابعة العقد', timestamp: nowMinus(125), read: true, delivered: true },
      { id: 'm21', conversationId: 'conv3', direction: 'out', type: 'text', content: 'صباح النور، سنرسل العقد المعدل قريباً', timestamp: nowMinus(120), read: true, delivered: true, sender: 'ai' },
    ],
  },
  {
    id: 'conv4', contactId: 'c4', assignedTo: null, status: 'new',
    channelId: 'ch7', departmentId: 'd2',
    lastMessage: 'هل لديكم سيارات للإيجار اليومي في صلالة؟',
    lastMessageAt: nowMinus(45), unreadCount: 3, notes: [], activityLog: [],
    messages: [
      { id: 'm30', conversationId: 'conv4', direction: 'in', type: 'text', content: 'مرحباً', timestamp: nowMinus(50), read: false, delivered: true },
      { id: 'm31', conversationId: 'conv4', direction: 'in', type: 'text', content: 'استفسار سريع', timestamp: nowMinus(48), read: false, delivered: true },
      { id: 'm32', conversationId: 'conv4', direction: 'in', type: 'text', content: 'هل لديكم سيارات للإيجار اليومي في صلالة؟', timestamp: nowMinus(45), read: false, delivered: true },
    ],
  },
  {
    id: 'conv5', contactId: 'c2', assignedTo: 'a2', status: 'closed',
    channelId: 'ch2', departmentId: 'd1',
    lastMessage: 'شكراً لتعاونكم، تم استلام العقد', lastMessageAt: nowMinus(60 * 24),
    unreadCount: 0, notes: ['تم توقيع العقد بنجاح'],
    activityLog: [{ id: 'e10', type: 'status', description: 'إغلاق المحادثة', by: 'a2', timestamp: nowMinus(60 * 24) }],
    messages: [
      { id: 'm40', conversationId: 'conv5', direction: 'out', type: 'text', content: 'تم إرسال العقد على البريد', timestamp: nowMinus(60 * 25), read: true, delivered: true },
      { id: 'm41', conversationId: 'conv5', direction: 'in', type: 'text', content: 'شكراً لتعاونكم، تم استلام العقد', timestamp: nowMinus(60 * 24), read: true, delivered: true },
    ],
  },
  {
    id: 'conv6', contactId: 'c6', assignedTo: 'a5', status: 'pending',
    channelId: 'ch2', departmentId: 'd1',
    lastMessage: 'متى يمكنني المعاينة في نزوى؟', lastMessageAt: nowMinus(60),
    unreadCount: 1, notes: [], activityLog: [],
    messages: [
      { id: 'm50', conversationId: 'conv6', direction: 'in', type: 'text', content: 'متى يمكنني المعاينة في نزوى؟', timestamp: nowMinus(60), read: false, delivered: true },
    ],
  },
  {
    id: 'conv7', contactId: 'c7', assignedTo: 'a3', status: 'closed',
    channelId: 'ch7', departmentId: 'd2',
    lastMessage: 'شكراً جزيلاً', lastMessageAt: nowMinus(60 * 5),
    unreadCount: 0, notes: [], activityLog: [],
    messages: [{ id: 'm60', conversationId: 'conv7', direction: 'in', type: 'text', content: 'شكراً جزيلاً', timestamp: nowMinus(60 * 5), read: true, delivered: true }],
  },
  {
    id: 'conv8', contactId: 'c8', assignedTo: null, status: 'new',
    channelId: 'ch6', departmentId: 'd2',
    lastMessage: 'أبحث عن تويوتا لاند كروزر', lastMessageAt: nowMinus(35),
    unreadCount: 2, notes: [], activityLog: [],
    messages: [
      { id: 'm70', conversationId: 'conv8', direction: 'in', type: 'text', content: 'مساء الخير', timestamp: nowMinus(38), read: false, delivered: true },
      { id: 'm71', conversationId: 'conv8', direction: 'in', type: 'text', content: 'أبحث عن تويوتا لاند كروزر', timestamp: nowMinus(35), read: false, delivered: true },
    ],
  },
  {
    id: 'conv9', contactId: 'c9', assignedTo: 'a2', status: 'pending',
    channelId: 'ch1', departmentId: 'd1',
    lastMessage: 'نعم، هذا السعر مناسب', lastMessageAt: nowMinus(90),
    unreadCount: 0, notes: [], activityLog: [],
    messages: [
      { id: 'm80', conversationId: 'conv9', direction: 'out', type: 'text', content: 'سعر الفيلا 1200 ر.ع شهرياً', timestamp: nowMinus(95), read: true, delivered: true },
      { id: 'm81', conversationId: 'conv9', direction: 'in', type: 'text', content: 'نعم، هذا السعر مناسب', timestamp: nowMinus(90), read: true, delivered: true },
    ],
  },
  {
    id: 'conv10', contactId: 'c12', assignedTo: 'a1', status: 'new',
    channelId: 'ch1', departmentId: 'd4',
    lastMessage: 'هل يمكن تجديد العقد بنفس الشروط؟', lastMessageAt: nowMinus(25),
    unreadCount: 1, notes: ['عميلة VIP - رد سريع'], activityLog: [],
    messages: [
      { id: 'm90', conversationId: 'conv10', direction: 'in', type: 'text', content: 'هل يمكن تجديد العقد بنفس الشروط؟', timestamp: nowMinus(25), read: false, delivered: true },
    ],
  },
  {
    id: 'conv11', contactId: 'c10', assignedTo: 'a4', status: 'pending',
    channelId: 'ch4', departmentId: 'd3', aiHandedOff: true,
    lastMessage: 'سيتم التحقق من الطلب وإبلاغك خلال 24 ساعة', lastMessageAt: nowMinus(135),
    unreadCount: 0, notes: [], activityLog: [],
    messages: [
      { id: 'm100', conversationId: 'conv11', direction: 'in', type: 'text', content: 'هل يمكن تأجيل الدفعة الشهرية؟', timestamp: nowMinus(140), read: true, delivered: true },
      { id: 'm101', conversationId: 'conv11', direction: 'out', type: 'text', content: 'سيتم التحقق من الطلب وإبلاغك خلال 24 ساعة', timestamp: nowMinus(135), read: true, delivered: true, sender: 'ai' },
    ],
  },
  {
    id: 'conv12', contactId: 'c5', assignedTo: 'a3', status: 'new',
    channelId: 'ch6', departmentId: 'd2',
    lastMessage: 'شفت المنشور الجديد عن فيلا الموج', lastMessageAt: nowMinus(50),
    unreadCount: 1, notes: [], activityLog: [],
    messages: [
      { id: 'm110', conversationId: 'conv12', direction: 'in', type: 'text', content: 'شفت المنشور الجديد عن فيلا الموج', timestamp: nowMinus(50), read: false, delivered: true },
    ],
  },
  // ===== AI-handled conversations =====
  {
    id: 'conv13', contactId: 'c6', assignedTo: null, status: 'new',
    channelId: 'ch1', departmentId: 'd2', aiActive: true,
    lastMessage: 'شكراً جزيلاً، سأنتظر التواصل', lastMessageAt: nowMinus(5),
    unreadCount: 0, notes: [], activityLog: [
      { id: 'e30', type: 'note', description: 'المساعد الذكي يتعامل مع المحادثة', by: 'system', timestamp: nowMinus(12) },
    ],
    messages: [
      { id: 'm130', conversationId: 'conv13', direction: 'in', type: 'text', content: 'مرحباً، ممكن أعرف الباقات والأسعار؟', timestamp: nowMinus(12), read: true, delivered: true },
      { id: 'm131', conversationId: 'conv13', direction: 'out', type: 'text', content: 'أهلاً وسهلاً! نوفر 4 باقات تناسب جميع الأحجام:\n• المبتدئ: 7 ر.ع/شهر (قناة واحدة، 3 موظفين)\n• الاحترافي: 19 ر.ع/شهر (3 قنوات، 10 موظفين)\n• الأعمال: 38 ر.ع/شهر (10 قنوات، 25 موظف)\n• المؤسسات: 96 ر.ع/شهر (بلا حدود)', timestamp: nowMinus(11), read: true, delivered: true, sender: 'ai' },
      { id: 'm132', conversationId: 'conv13', direction: 'in', type: 'text', content: 'هل في فترة تجريبية مجانية؟', timestamp: nowMinus(10), read: true, delivered: true },
      { id: 'm133', conversationId: 'conv13', direction: 'out', type: 'text', content: 'نعم! 14 يوم تجريبية مجانية بدون الحاجة لإدخال بطاقة دفع. تقدر تجرب جميع المزايا قبل الاشتراك.', timestamp: nowMinus(9), read: true, delivered: true, sender: 'ai' },
      { id: 'm134', conversationId: 'conv13', direction: 'in', type: 'text', content: 'ممتاز، أريد التواصل مع موظف مبيعات لمعرفة المزيد', timestamp: nowMinus(7), read: true, delivered: true },
      { id: 'm135', conversationId: 'conv13', direction: 'out', type: 'text', content: 'تمام، سيتواصل معك أحد موظفي المبيعات خلال ساعة. تقدر تشاركني رقم تواصل مفضّل؟', timestamp: nowMinus(6), read: true, delivered: true, sender: 'ai' },
      { id: 'm136', conversationId: 'conv13', direction: 'in', type: 'text', content: 'شكراً جزيلاً، سأنتظر التواصل', timestamp: nowMinus(5), read: true, delivered: true },
    ],
  },
  {
    id: 'conv14', contactId: 'c8', assignedTo: null, status: 'closed',
    channelId: 'ch7', departmentId: 'd2', aiActive: true,
    lastMessage: 'تمام، شكراً لك!', lastMessageAt: nowMinus(60 * 3),
    unreadCount: 0, notes: [],
    activityLog: [
      { id: 'e40', type: 'status', description: 'تم إغلاق المحادثة تلقائياً بواسطة المساعد الذكي', by: 'system', timestamp: nowMinus(60 * 3) },
    ],
    messages: [
      { id: 'm140', conversationId: 'conv14', direction: 'in', type: 'text', content: 'ما هي ساعات العمل؟', timestamp: nowMinus(60 * 3 + 10), read: true, delivered: true },
      { id: 'm141', conversationId: 'conv14', direction: 'out', type: 'text', content: 'ساعات عملنا من الأحد إلى الخميس، من 9 صباحاً حتى 5 مساءً. وللطوارئ يمكنك التواصل في أي وقت عبر هذه القناة.', timestamp: nowMinus(60 * 3 + 9), read: true, delivered: true, sender: 'ai' },
      { id: 'm142', conversationId: 'conv14', direction: 'in', type: 'text', content: 'تمام، شكراً لك!', timestamp: nowMinus(60 * 3), read: true, delivered: true },
    ],
  },
  {
    id: 'conv15', contactId: 'c2', assignedTo: null, status: 'new',
    channelId: 'ch6', departmentId: 'd2', aiActive: true,
    lastMessage: 'كيف يمكنني ربط حساب الواتساب؟', lastMessageAt: nowMinus(20),
    unreadCount: 1, notes: [], activityLog: [],
    messages: [
      { id: 'm150', conversationId: 'conv15', direction: 'in', type: 'text', content: 'مرحباً', timestamp: nowMinus(22), read: true, delivered: true },
      { id: 'm151', conversationId: 'conv15', direction: 'out', type: 'text', content: 'أهلاً بك! كيف أقدر أساعدك اليوم؟', timestamp: nowMinus(21), read: true, delivered: true, sender: 'ai' },
      { id: 'm152', conversationId: 'conv15', direction: 'in', type: 'text', content: 'كيف يمكنني ربط حساب الواتساب؟', timestamp: nowMinus(20), read: false, delivered: true },
    ],
  },
];

// ============================================================
// Template Categories (CRUD-managed by user)
// ============================================================
export const templateCategories: TemplateCategoryItem[] = [
  { id: 'welcome', name: 'ترحيب', color: '#2563EB' },
  { id: 'followup', name: 'متابعة', color: '#06B6D4' },
  { id: 'payment', name: 'دفع', color: '#10B981' },
  { id: 'closing', name: 'إغلاق', color: '#F59E0B' },
  { id: 'custom', name: 'مخصص', color: '#94A3B8' },
];

// ============================================================
// Templates
// ============================================================
export const templates: Template[] = [
  { id: 't1', name: 'ترحيب أولي', category: 'welcome', body: 'مرحباً {{اسم_العميل}}، أهلاً بك في Qhub! كيف يمكنني مساعدتك؟', usageCount: 247, createdAt: nowMinus(60 * 24 * 90) },
  { id: 't2', name: 'متابعة استفسار', category: 'followup', body: 'مرحباً {{اسم_العميل}}، فقط أتابع معك بخصوص استفسارك السابق. هل ما زلت مهتماً؟', usageCount: 134, createdAt: nowMinus(60 * 24 * 60) },
  { id: 't3', name: 'تأكيد موعد المعاينة', category: 'welcome', body: 'تم تأكيد موعد المعاينة ليوم {{التاريخ}}. نتطلع لرؤيتك!', usageCount: 89, createdAt: nowMinus(60 * 24 * 40) },
  { id: 't4', name: 'إغلاق المحادثة', category: 'closing', body: 'شكراً لتواصلك مع Qhub. نتمنى أن نكون قد أجبنا على كل استفساراتك!', usageCount: 312, createdAt: nowMinus(60 * 24 * 120) },
  { id: 't5', name: 'تذكير الدفع', category: 'payment', body: 'مرحباً {{اسم_العميل}}، نذكرك بدفع المستحقات للطلب رقم {{رقم_الطلب}} قبل {{التاريخ}}.', usageCount: 56, createdAt: nowMinus(60 * 24 * 30) },
  { id: 't6', name: 'إيصال دفع', category: 'payment', body: 'تم استلام دفعتك بنجاح. رقم الطلب: {{رقم_الطلب}}. شكراً لك!', usageCount: 78, createdAt: nowMinus(60 * 24 * 20) },
  { id: 't7', name: 'متابعة بعد المعاينة', category: 'followup', body: 'مرحباً {{اسم_العميل}}، نأمل أن المعاينة كانت مفيدة. هل لديك أي استفسار إضافي؟', usageCount: 45, createdAt: nowMinus(60 * 24 * 15) },
  { id: 't8', name: 'عرض سيارات صلالة', category: 'custom', body: 'لدينا عروض حصرية على إيجار السيارات في صلالة لموسم الخريف. للاستفسار راسلنا.', usageCount: 22, createdAt: nowMinus(60 * 24 * 10) },
];

// ============================================================
// Campaigns
// ============================================================
export const campaigns: Campaign[] = [
  { id: 'cm1', name: 'عروض موسم الخريف 2026', message: 'استمتع بعروض حصرية على إيجار السيارات والشاليهات في صلالة لهذا الموسم. للحجز راسلنا الآن!', targetCount: 1245, sentCount: 1245, openRate: 78, status: 'completed', scheduledAt: nowMinus(60 * 24 * 5), createdAt: nowMinus(60 * 24 * 10) },
  { id: 'cm2', name: 'تجديد عقود المالكين', message: 'مرحباً {{اسم_العميل}}، حان وقت تجديد عقد العقار. تواصل معنا لمناقشة الشروط الجديدة.', targetCount: 87, sentCount: 87, openRate: 92, status: 'completed', scheduledAt: nowMinus(60 * 24 * 2), createdAt: nowMinus(60 * 24 * 7) },
  { id: 'cm3', name: 'إطلاق مجمع الخوض الجديد', message: 'يسرنا الإعلان عن افتتاح مجمع الخوض السكني الجديد. شقق فاخرة بأسعار تنافسية.', targetCount: 540, sentCount: 0, openRate: 0, status: 'scheduled', scheduledAt: new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString(), createdAt: nowMinus(60 * 24) },
  { id: 'cm4', name: 'استبيان رضا العملاء', message: 'نرحب بتقييمك لخدماتنا. ساعدنا في التحسين عبر الرابط التالي.', targetCount: 0, sentCount: 0, openRate: 0, status: 'draft', scheduledAt: null, createdAt: nowMinus(60 * 12) },
  { id: 'cm5', name: 'عيد الفطر - عروض حصرية', message: 'بمناسبة عيد الفطر، استمتع بخصم 15% على جميع عقود الإيجار الجديدة. عيد سعيد!', targetCount: 2100, sentCount: 1890, openRate: 65, status: 'failed', scheduledAt: nowMinus(60 * 24 * 30), createdAt: nowMinus(60 * 24 * 35) },
];

// ============================================================
// Campaign Templates — reusable presets for campaigns
// ============================================================
export const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'ct1',
    name: 'ترحيب بعميل جديد',
    description: 'رسالة ترحيب آلية لمن يضيف رقمه لقاعدتك للمرة الأولى',
    category: 'welcome',
    type: 'text-media',
    message: 'مرحباً {{اسم_العميل}} 👋\nشكراً لتواصلك مع فريق Qhub. نحن هنا لخدمتك في أي وقت — للاستفسار اضغط/أرسل رسالة وسنرد بأقرب فرصة.',
    defaultAudience: 'lead',
    defaultMinDelay: 15,
    defaultMaxDelay: 45,
    usageCount: 23,
    createdAt: nowMinus(60 * 24 * 60),
  },
  {
    id: 'ct2',
    name: 'عرض خصم موسمي',
    description: 'حملة تخفيضات بنسبة مرنة — يستخدم في المواسم والمناسبات',
    category: 'promo',
    type: 'text-media',
    message: '🎉 عرض حصري لفترة محدودة!\n{{اسم_العميل}}، استمتع بخصم 20% على جميع منتجاتنا. كود الخصم: {{كود_الخصم}}\nصالح حتى نهاية الأسبوع.',
    mediaUrl: 'https://example.com/promo-banner.jpg',
    defaultAudience: 'customer',
    defaultMinDelay: 30,
    defaultMaxDelay: 90,
    usageCount: 47,
    createdAt: nowMinus(60 * 24 * 45),
  },
  {
    id: 'ct3',
    name: 'تأكيد الحجز بأزرار',
    description: 'تأكيد/تأجيل/إلغاء الحجز بثلاث أزرار سريعة',
    category: 'reminder',
    type: 'buttons',
    message: '⏰ تذكير بموعدك\n{{اسم_العميل}}، نذكرك بموعدك غداً الساعة {{الوقت}}.\nهل ستحضر؟',
    buttons: ['نعم سأحضر', 'تأجيل الموعد', 'إلغاء'],
    defaultAudience: 'customer',
    defaultMinDelay: 15,
    defaultMaxDelay: 45,
    usageCount: 156,
    createdAt: nowMinus(60 * 24 * 90),
  },
  {
    id: 'ct4',
    name: 'قائمة خدمات',
    description: 'قائمة منسدلة بالخدمات ليختار العميل ما يهمه',
    category: 'announcement',
    type: 'list',
    message: 'مرحباً {{اسم_العميل}}،\nاختر الخدمة التي تهمك من القائمة:',
    listTitle: 'خدماتنا المتاحة',
    listItems: [
      { label: 'استشارة فنية', description: 'مكالمة 30 دقيقة مع متخصص' },
      { label: 'دعم تقني فوري', description: 'حل المشكلات خلال ساعات العمل' },
      { label: 'تدريب مخصص', description: 'جلسة تدريبية لفريقك' },
    ],
    defaultAudience: 'customer',
    defaultMinDelay: 30,
    defaultMaxDelay: 90,
    usageCount: 38,
    createdAt: nowMinus(60 * 24 * 30),
  },
  {
    id: 'ct5',
    name: 'استطلاع رضا العملاء',
    description: 'سؤال العميل عن تجربته بطريقة سريعة',
    category: 'followup',
    type: 'poll',
    message: '{{اسم_العميل}}، كيف كانت تجربتك معنا في آخر تعامل؟',
    pollOptions: ['ممتازة 🌟🌟🌟🌟🌟', 'جيدة 🌟🌟🌟🌟', 'متوسطة 🌟🌟🌟', 'تحتاج تحسين 🌟🌟'],
    defaultAudience: 'customer',
    defaultMinDelay: 60,
    defaultMaxDelay: 180,
    usageCount: 27,
    createdAt: nowMinus(60 * 24 * 20),
  },
  {
    id: 'ct6',
    name: 'إعلان منتج جديد',
    description: 'إعلان عام لإطلاق منتج أو خدمة جديدة',
    category: 'announcement',
    type: 'text-media',
    message: '✨ منتج جديد!\nيسعدنا أن نقدم لكم {{اسم_المنتج}} — متوفر الآن في موقعنا.\nتفاصيل أكثر: {{رابط}}',
    defaultAudience: 'all',
    defaultMinDelay: 60,
    defaultMaxDelay: 180,
    usageCount: 12,
    createdAt: nowMinus(60 * 24 * 15),
  },
];

// ============================================================
// Notifications
// ============================================================
export const notifications: Notification[] = [
  { id: 'n1', title: 'محادثة جديدة', body: 'منى الزدجالية بدأت محادثة جديدة', timestamp: nowMinus(8), read: false, type: 'conversation' },
  { id: 'n2', title: 'رسالة جديدة', body: 'أحمد الشعيلي: هل الشقة في الخوض ما زالت متاحة؟', timestamp: nowMinus(15), read: false, type: 'message' },
  { id: 'n3', title: 'حملة مكتملة', body: 'تم إرسال حملة "تجديد عقود المالكين" بنجاح', timestamp: nowMinus(60 * 2), read: true, type: 'campaign' },
  { id: 'n4', title: 'إسناد محادثة', body: 'تم إسناد محادثة جديدة إليك', timestamp: nowMinus(60 * 5), read: true, type: 'system' },
];

// ============================================================
// Integrations
// ============================================================
export const integrations: Integration[] = [
  { id: 'i1', type: 'messenger', name: 'Facebook Messenger', description: 'استقبل رسائل صفحتك على فيسبوك', connected: true, accountName: 'qhub.page', lastSync: nowMinus(5) },
  { id: 'i2', type: 'instagram', name: 'Instagram Direct', description: 'استقبل رسائل انستجرام المباشرة', connected: true, accountName: '@qhub_official', lastSync: nowMinus(12) },
  { id: 'i3', type: 'telegram', name: 'Telegram Bot', description: 'بوت تيليجرام لاستقبال الاستفسارات', connected: false },
  { id: 'i4', type: 'x', name: 'X (Twitter)', description: 'استقبل الـ Direct Messages والمنشن من X', connected: false },
  { id: 'i5', type: 'slack', name: 'Slack', description: 'إشعارات داخلية على قناة Slack', connected: false },
  { id: 'i6', type: 'zapier', name: 'Zapier', description: 'اربط Qhub بآلاف التطبيقات الأخرى', connected: false },
  { id: 'i7', type: 'webhook', name: 'Custom Webhook', description: 'استقبل أحداث المحادثات على خادمك الخاص', connected: false },
];

// ============================================================
// Widget config defaults
// ============================================================
export const widgetConfig: WidgetConfig = {
  primaryColor: '#2563EB',
  position: 'bottom-right',
  welcomeMessage: 'مرحباً 👋 كيف يمكننا مساعدتك اليوم؟',
  teamName: 'فريق Qhub',
  responseTime: 'نرد عادةً خلال دقائق',
  showAvatar: true,
  collectEmail: false,
  enabled: true,
  bubbleIcon: 'chat',
  showBusinessHours: true,
  allowAttachments: true,
  allowVoice: false,
  soundNotification: true,
};

export { departments as initialDepartments, channels as initialChannels };
