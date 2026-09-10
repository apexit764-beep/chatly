// يولّد ملف «سجل التعديلات الاخيرة.docx» في مجلد docs/
// التشغيل: npm run changelog
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, LevelFormat, convertInchesToTwip,
} from 'docx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', 'docs', 'سجل التعديلات الاخيرة.docx',
);

// =====================================================================
//  بيانات السجل — أضف كل تعديل جديد هنا في أعلى مصفوفة ENTRIES
// =====================================================================
// status: 'live'    = منشور على الإنتاج
//         'pending' = مرفوع على الفرع ولم يُنشر بعد
//         'wip'     = قيد التطوير، غير مرفوع

const BUILD_LIVE = '06e4f0fa-ddab-4ae4-8ad8-f853c3466c95';

const ENTRIES = [
  {
    id: 6,
    date: '10 سبتمبر 2026',
    title: 'إعادة تصميم شريط الفهرسة على هيئة مسطرة تظهر عند الاقتراب',
    page: 'صندوق الوارد',
    route: '/inbox',
    file: 'src/components/inbox/SessionRail.tsx · src/pages/Inbox.tsx',
    commit: '—',
    status: 'pending',
    points: [
      'الشكل السابق كان كتلاً سميكة بينها فجوات، فكان يُقرأ كشريط تقدّم مكسور لا كأداة تنقّل. صار الآن مسطرة: خطّ شعري على حافة الثريد وعليه علامات رفيعة عند بدايات الدورات.',
      'العلامة صارت تقع في موضعها النسبي الحقيقي من ارتفاع التمرير — تُقاس من موضع أول رسالة في الدورة داخل الثريد — فصار الشريط خريطة فعلية للمحادثة لا مجرد قائمة مرتّبة.',
      'القياس يُعاد عند تغيير المحادثة أو وصول رسالة، ويُراقَب تغيّر حجم اللوحة بـ ResizeObserver حتى لا تصير المواضع قديمة عند طيّ لوحة التفاصيل أو تغيير حجم النافذة.',
      'المسطرة باهتة في الوضع العادي وتتوضّح بالكامل عند اقتراب المؤشر من الحافة أو عند وصول لوحة المفاتيح إليها.',
      'أُبقي أثر خافت دائم بدل الإخفاء التام: ميزة لا يدل عليها شيء لا يعرفها أحد، والإخفاء الكامل كان سيجعلها غير قابلة للاكتشاف.',
      'صارت طبقة عائمة (overlay) بدل عمود يحجز عرضاً ثابتاً، فرجع نحو 36 بكسل لمساحة الرسائل.',
      'وُضعت بعد شريط التمرير بمقدار 8 بكسل حتى لا تحجب سحبه.',
      'التمييز بين المؤكَّد والمقدَّر بقي قائماً بصرياً: علامة متصلة للدورة المسجّلة، ومتقطّعة للمستنتَجة، مع بقاء «بداية تقديرية» في التلميح.',
      'تنازل مقصود: الشكل السابق كان يعبّر عن حجم كل دورة بارتفاعها، والمسطرة لا تفعل. حجم الدورة انتقل إلى التلميح، لأن المطلوب الأساسي هو موضع بداية الدورة لا حجمها.',
      'عوينت النتيجة في المتصفح: العلامات الثلاث ظهرت في مواضع غير متساوية تطابق مواضع التمرير الفعلية، والتوضّح بالاقتراب والتلميح والانتقال تعمل.',
    ],
  },
  {
    id: 5,
    date: '10 سبتمبر 2026',
    title: 'شريط فهرسة دورات المحادثة داخل الثريد',
    page: 'صندوق الوارد',
    route: '/inbox',
    file: 'src/components/inbox/SessionRail.tsx · src/pages/Inbox.tsx · src/store/mockData.ts',
    commit: 'e05e715',
    status: 'live',
    points: [
      'شريط رأسي على حافة الثريد يقسّمه إلى دورات فتح وإغلاق، ليصل الموظف إلى بداية أي دورة في المحادثات الطويلة التي تُعاد فتحها مراراً.',
      'ارتفاع كل مقطع يتناسب مع عدد رسائله، فيعطي إحساساً بحجم كل دورة قبل الدخول إليها.',
      'المرور على المقطع يُظهر اليوم والتاريخ وعدد الرسائل — «اليوم» و«أمس» لما قرُب، واسم اليوم لما بعُد.',
      'الضغط ينقل إلى أول رسالة في الدورة، والمقطع الذي يقابل موضع القراءة الحالي يُبرَز تلقائياً أثناء التمرير.',
      'المقاطع ذات البداية المستنتجة تُعرض بحدّ متقطّع ويذكر التلميح «بداية تقديرية»، فيبقى الفرق بين المؤكَّد والمقدَّر ظاهراً للموظف لا مخفياً عنه.',
      'الشريط يختفي كلياً حين تكون المحادثة دورة واحدة، فلا معنى لفهرس لا يفهرس شيئاً.',
      'الدورات الخالية من الرسائل مستبعدة من الشريط بقرار مقصود — لا شيء يمكن الانتقال إليه فيها.',
      'وُزّعت رسائل محادثة أحمد الشعيلي التجريبية على ثلاث دورات عبر ثلاثة أشهر لتصير الميزة قابلة للمعاينة، وصار sessionCount فيها مطابقاً للواقع بعد أن كان رقماً مكتوباً بلا سند. آخر دورة مسجّلة بحدث حقيقي وما قبلها مستنتج، ليظهر الشكلان معاً.',
      'عوينت النتيجة في المتصفح: الشريط والتلميح والانتقال والإبراز تعمل في الوضعين الفاتح والليلي، والمحادثات أحادية الدورة سليمة بلا شريط.',
    ],
  },
  {
    id: 4,
    date: '10 سبتمبر 2026',
    title: 'تسجيل دورات المحادثة واشتقاقها — أساس شريط فهرسة الثريد',
    page: 'صندوق الوارد (طبقة البيانات)',
    route: '/inbox',
    file: 'src/utils/sessions.ts · src/store/useDataStore.ts · src/types/index.ts',
    commit: '5cf29e1',
    status: 'live',
    points: [
      'المشكلة: المحادثة الواحدة تُعاد فتحها كلما راسل العميل بعد الإغلاق، فيصير الثريد بلا نهاية. ولرسم شريط فهرسة يقسّمه إلى دورات، لزم معرفة توقيت كل فتح وإغلاق — وهي بيانات لم تكن تُسجَّل إطلاقاً.',
      'كان الحقل sessionCount يُكتب مرة واحدة عند الإنشاء ولا يزيده أي سطر في المشروع، وقيمه في البيانات التجريبية مكتوبة يدوياً. كذلك activityLog على المحادثة كان مُعرَّفاً في الأنواع لكن لا دالة تكتب فيه وقت التشغيل.',
      'أُضيف النوع SessionEvent لتسجيل حدث فتح أو إغلاق بتوقيته وصاحبه، والنوع ConversationSession يمثّل الدورة المشتقّة.',
      'صارت أربعة مواضع تسجّل الحدث فعلياً: setConversationStatus عند الإغلاق أو إعادة الفتح، reopenConversation، ورسالة العميل الواردة نصية أو صوتية حين تُحيي محادثة مغلقة — وهذا آخرها كان يمرّ بلا أي أثر رغم أنه أكثرها تكراراً.',
      'أُضيفت الدالة deriveSessions التي تقسّم الثريد إلى دورات: الأحداث المسجّلة مرجع قاطع، وما سبقها من تاريخ قديم تُستنتج حدوده من فجوات الصمت (24 ساعة افتراضاً) وتُعلَّم inferred حتى يظل الفرق بين المؤكَّد والمقدَّر ظاهراً.',
      'الدالة تتعامل مع الحالة المختلطة: ثريد فيه تاريخ قديم مُستنتج ودورات جديدة مسجّلة في آن واحد.',
      'اختُبر المنطق على ثماني حالات شملت الثريد الفارغ والرسالة الواحدة والفجوات المتعددة والأحداث المسجّلة والحالة المختلطة والمدخلات غير المرتّبة زمنياً — جميعها نجحت.',
      'ملاحظة على البيانات الحالية: كل المحادثات التجريبية تُنتج دورة واحدة لأن رسائلها متقاربة بدقائق ولا فجوات فيها. الشريط لن يُظهر تقسيماً حقيقياً قبل توفّر بيانات متباعدة زمنياً.',
      'لم تُبنَ واجهة الشريط بعد — هذا التعديل يغطّي طبقة البيانات وحدها.',
    ],
  },
  {
    id: 3,
    date: '10 سبتمبر 2026',
    title: 'إزالة كارت نسبة الاستجابة من صفحة تقييمات العملاء',
    page: 'تقييمات العملاء',
    route: '/rating',
    file: 'src/pages/CustomerRatings.tsx',
    commit: 'cc8bd4f',
    status: 'live',
    points: [
      'حُذف كارت «نسبة الاستجابة» بالكامل من شريط الإحصائيات — صارت 3 كروت بدل 4.',
      'حُذف معه حساب responseRate لأنه لم يعد له مستهلك في الصفحة.',
      'حُذف استيراد أيقونة TrendingUp لأنها كانت مستخدمة في هذا الكارت وحده.',
      'عُدّلت شبكة العرض من grid-cols-2 lg:grid-cols-4 إلى grid-cols-1 sm:grid-cols-3، حتى لا يبقى كارت يتيم في سطر منفصل على الشاشات الصغيرة.',
      'الكروت الباقية: متوسط تقييم المحادثة، متوسط تقييم الموظفين، إجمالي الروابط.',
    ],
  },
  {
    id: 2,
    date: '9 سبتمبر 2026',
    title: 'تغيير تسمية زر الترقية في صفحة الفوترة',
    page: 'الفوترة',
    route: '/billing',
    file: 'src/pages/Billing.tsx',
    commit: 'be5b3c0',
    status: 'live',
    points: [
      'زر «ترقية» أصبح «تغيير الباقة».',
      'سبب التغيير: الزر يوصّل إلى مسار يشمل الترقية والتخفيض معاً، فالتسمية القديمة كانت تصف نصف وظيفته.',
    ],
  },
  {
    id: 1,
    date: '9 سبتمبر 2026',
    title: 'ميزة تغيير الباقة — US-131',
    page: 'الاشتراك',
    route: '/subscribe',
    file: 'src/pages/Subscribe.tsx',
    commit: 'be5b3c0 · c49b797',
    status: 'live',
    points: [
      'إعادة بناء شبه كاملة للصفحة — 715 سطراً متغيّراً.',
      'اختيار الباقة صار بشريط تمرير (slider) حسب عدد المحادثات الشهرية بدل شبكة الكروت. كل باقة نقطة توقف على الشريط، وباقة المؤسسات هي النقطة الأخيرة بعنوان «غير محدود».',
      'مسار من ست خطوات: اختيار الباقة، ثم تأكيد التخفيض، ثم الدفع، ثم المعالجة، ثم النجاح أو الفشل.',
      'احتساب تناسبي للترقية: يُحصَّل فرق السعر عن الأيام المتبقية من الدورة الحالية فقط، ويظهر المبلغ مفصّلاً في ملخص الدفع.',
      'التخفيض له شاشة تأكيد مستقلة ولا يذهب مباشرة إلى الدفع.',
      'دورة الفوترة تُقرأ من اشتراك العميل الحالي بدل أن تبدأ بقيمة ثابتة.',
      'أُصلحت علامات تعارض الدمج (merge conflict markers) التي كانت باقية في الملف — كوميت c49b797.',
    ],
  },
];

// =====================================================================
const FONT = 'Arial';
const BLUE = '2563EB';
const DARK = '1E293B';
const GREY = '64748B';
const LIGHT = 'F1F5F9';
const GREEN = '15803D';
const AMBER = 'B45309';
const W = 9000;

const STATUS = {
  live:    { label: 'منشور على الإنتاج', color: GREEN, fill: 'ECFDF5' },
  pending: { label: 'مرفوع — غير منشور', color: AMBER, fill: 'FFFBEB' },
  wip:     { label: 'قيد التطوير',        color: GREY,  fill: 'F1F5F9' },
};

function P(text, o = {}) {
  const { size = 21, bold = false, color = DARK, align = AlignmentType.RIGHT, before = 0, after = 100 } = o;
  return new Paragraph({
    bidirectional: true, alignment: align, spacing: { before, after, line: 300 },
    children: [new TextRun({ text, size, bold, color, rightToLeft: true, font: FONT })],
  });
}
function H1(text) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT, heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 } },
    children: [new TextRun({ text, size: 30, bold: true, color: BLUE, rightToLeft: true, font: FONT })],
  });
}
function H2(text) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT, heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, size: 24, bold: true, color: DARK, rightToLeft: true, font: FONT })],
  });
}
function Bullet(text) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    numbering: { reference: 'bul', level: 0 }, spacing: { after: 70, line: 290 },
    children: [new TextRun({ text, size: 21, color: DARK, rightToLeft: true, font: FONT })],
  });
}
function cell(text, { w, bold = false, bg = null, color = DARK, size = 19, align = AlignmentType.RIGHT } = {}) {
  const lines = String(text).split('\n');
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: bg ? { type: ShadingType.CLEAR, fill: bg, color: 'auto' } : undefined,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    children: lines.map((l, i) => new Paragraph({
      bidirectional: true, alignment: align,
      spacing: { after: i === lines.length - 1 ? 0 : 50, line: 280 },
      children: [new TextRun({ text: l, size, bold, color, rightToLeft: true, font: FONT })],
    })),
  });
}
function table(headers, rows, cols, cellStyles) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cols, visuallyRightToLeft: true,
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { w: cols[i], bold: true, bg: BLUE, color: 'FFFFFF' })),
      }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => {
          const st = cellStyles ? cellStyles(ri, i) : {};
          return cell(c, { w: cols[i], bg: st.bg !== undefined ? st.bg : (ri % 2 ? LIGHT : null),
            color: st.color || (i === 0 ? BLUE : DARK), bold: st.bold !== undefined ? st.bold : i === 0 });
        }),
      })),
    ],
  });
}
function box(title, lines, fill, accent) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W], visuallyRightToLeft: true,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
      left: { style: BorderStyle.SINGLE, size: 4, color: accent },
      right: { style: BorderStyle.SINGLE, size: 18, color: accent },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
      margins: { top: 140, bottom: 140, left: 160, right: 160 },
      children: [
        new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 90 },
          children: [new TextRun({ text: title, size: 21, bold: true, color: accent, rightToLeft: true, font: FONT })] }),
        ...lines.map((l) => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT,
          spacing: { after: 60, line: 290 },
          children: [new TextRun({ text: l, size: 20, color: DARK, rightToLeft: true, font: FONT })] })),
      ],
    })] })],
  });
}
function spacer(h = 140) { return new Paragraph({ spacing: { after: h }, children: [] }); }

// ---------- build ----------
const kids = [];

kids.push(
  new Paragraph({ spacing: { before: 1700 }, children: [] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: 'Qhub', size: 58, bold: true, color: BLUE, font: FONT })] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 180 },
    children: [new TextRun({ text: 'سجل التعديلات', size: 44, bold: true, color: DARK, rightToLeft: true, font: FONT })] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'بورتال الكلاينت', size: 26, color: GREY, rightToLeft: true, font: FONT })] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: 'وثيقة حيّة — تُحدَّث مع كل تعديل جديد', size: 21, color: GREY, rightToLeft: true, font: FONT })] }),
  new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: 'آخر تحديث: 10 سبتمبر 2026', size: 21, color: GREY, rightToLeft: true, font: FONT })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// --- summary ---
kids.push(H1('ملخص التعديلات'));
kids.push(P('كل تعديل على بورتال الكلاينت، الأحدث أولاً. التفاصيل الكاملة في القسم التالي.'));
kids.push(spacer(80));
kids.push(table(
  ['#', 'التاريخ', 'التعديل', 'الصفحة', 'الحالة'],
  ENTRIES.map((e) => [String(e.id), e.date, e.title, e.page, STATUS[e.status].label]),
  [600, 1500, 3600, 1500, 1800],
  (ri, ci) => {
    if (ci !== 4) return {};
    const st = STATUS[ENTRIES[ri].status];
    return { bg: st.fill, color: st.color, bold: true };
  },
));

kids.push(H2('دلالة الحالات'));
kids.push(spacer(60));
kids.push(table(
  ['الحالة', 'المعنى'],
  [
    [STATUS.live.label, 'التعديل مرفوع على الفرع ومنشور على qhub-client.apexes.click — العملاء يرونه الآن.'],
    [STATUS.pending.label, 'التعديل مرفوع على فرع Git لكنه لم يُنشر على السيرفر بعد — العملاء لا يرونه.'],
    [STATUS.wip.label, 'التعديل في مجلد العمل ولم يُرفع على Git بعد.'],
  ],
  [2400, 6600],
  (ri, ci) => ci === 0 ? { bg: [STATUS.live, STATUS.pending, STATUS.wip][ri].fill,
                           color: [STATUS.live, STATUS.pending, STATUS.wip][ri].color, bold: true } : {},
));

kids.push(spacer(200));
const pendingCount = ENTRIES.filter((e) => e.status === 'pending').length;
kids.push(box('حالة النشر الآن', [
  'البناء المنشور على الإنتاج: ' + BUILD_LIVE,
  pendingCount > 0
    ? 'يوجد ' + pendingCount + ' تعديل مرفوع على الفرع ولم يُنشر بعد — مبيّن في الجدول أعلاه.'
    : 'كل التعديلات المرفوعة منشورة على الإنتاج.',
  'قاعدة العمل المتفق عليها: الرفع على فرع Git يتم مباشرة، أما النشر على السيرفر فلا يتم إلا بطلب صريح.',
], 'FFFBEB', AMBER));

kids.push(new Paragraph({ children: [new PageBreak()] }));

// --- details ---
kids.push(H1('تفاصيل التعديلات'));

ENTRIES.forEach((e, idx) => {
  const st = STATUS[e.status];
  kids.push(H2('تعديل رقم ' + e.id + ' — ' + e.title));
  kids.push(spacer(50));
  kids.push(table(
    ['التاريخ', 'الصفحة', 'المسار', 'الملف', 'الكوميت', 'الحالة'],
    [[e.date, e.page, e.route, e.file, e.commit, st.label]],
    [1250, 1250, 1150, 2500, 1350, 1500],
    (ri, ci) => ci === 5 ? { bg: st.fill, color: st.color, bold: true } : { bold: false, color: DARK },
  ));
  kids.push(spacer(90));
  e.points.forEach((p) => kids.push(Bullet(p)));
  if (idx !== ENTRIES.length - 1) kids.push(spacer(160));
});

// --- how to update ---
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1('كيف يُحدَّث هذا السجل'));
kids.push(P('هذه الوثيقة مُولَّدة من سكربت، فلا تُحرَّر يدوياً في Word — أي تعديل يدوي سيضيع عند التوليد التالي.'));
kids.push(spacer(60));
kids.push(Bullet('كل تعديل جديد يُضاف كعنصر في أعلى مصفوفة ENTRIES داخل سكربت التوليد.'));
kids.push(Bullet('العنصر يحمل: الرقم، التاريخ، العنوان، الصفحة، المسار، الملف، الكوميت، الحالة، وقائمة النقاط.'));
kids.push(Bullet('الحالة تأخذ إحدى ثلاث قيم: live أو pending أو wip.'));
kids.push(Bullet('عند نشر أي تعديل على السيرفر تُحدَّث حالته من pending إلى live، ويُحدَّث رقم البناء المنشور في أعلى السكربت.'));
kids.push(Bullet('جدول الملخص ومربع حالة النشر يُحسبان تلقائياً من البيانات، فلا حاجة لتعديلهما يدوياً.'));

kids.push(spacer(220));
kids.push(P('عدد التعديلات المسجّلة: ' + ENTRIES.length, { align: AlignmentType.CENTER, color: GREY, size: 20 }));

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 21, color: DARK }, paragraph: { spacing: { line: 300 } } } } },
  numbering: { config: [{ reference: 'bul', levels: [{
    level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT,
    style: { paragraph: { indent: { right: convertInchesToTwip(0.28), hanging: convertInchesToTwip(0.22) } } },
  }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 1100, right: 1080, bottom: 1100, left: 1080 } } },
    children: kids,
  }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('تم توليد:', OUT, '—', buf.length, 'بايت،', ENTRIES.length, 'تعديل');
