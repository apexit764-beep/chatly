import { useState } from 'react';
import {
  BookOpen,
  Video,
  MessageCircle,
  Mail,
  Phone,
  Keyboard,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Drawer } from '@components/ui';
import { cn } from '@/utils/cn';

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts: Array<{ key: string; desc: string }> = [
  { key: '⌘K / Ctrl+K', desc: 'فتح البحث الشامل' },
  { key: '/', desc: 'البحث السريع' },
  { key: 'ESC', desc: 'إغلاق النوافذ' },
  { key: '↑ ↓', desc: 'التنقّل في القوائم' },
  { key: 'Enter', desc: 'إرسال رسالة' },
  { key: 'Shift+Enter', desc: 'سطر جديد' },
];

const faqs: Array<{ q: string; a: string }> = [
  { q: 'كيف أربط رقم واتساب جديد؟', a: 'من صفحة "القنوات"، اضغط "إضافة قناة" واتبع تعليمات مسح الـ QR من تطبيق واتساب على هاتفك (الأجهزة المرتبطة → ربط جهاز).' },
  { q: 'كيف أنشئ قسماً وأعيّن موظفين له؟', a: 'اذهب إلى "الأقسام" واضغط "قسم جديد". أدخل الاسم واللون، ثم اختر الموظفين والقنوات المرتبطة.' },
  { q: 'كيف أبدأ حملة؟', a: 'من "الحملات" اضغط "حملة جديدة"، أدخل النص والجمهور المستهدف (حسب نوع الجهة أو الوسوم)، وحدد التوقيت.' },
  { q: 'كيف أصدّر بياناتي؟', a: 'في جدول جهات الاتصال أو الفواتير، اضغط "تصدير CSV" — يفتح ملف بصيغة Excel متوافقة مع العربية.' },
  { q: 'هل يمكن إلغاء الاشتراك؟', a: 'نعم، من صفحة "الفوترة" اضغط "إلغاء الاشتراك". سيستمر حسابك حتى نهاية الفترة المدفوعة.' },
];

export function HelpDrawer({ open, onClose }: HelpDrawerProps): JSX.Element {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <Drawer open={open} onClose={onClose} title="المساعدة" side="start" width="w-[440px]">
      <div className="space-y-6">
        {/* Quick links */}
        <div>
          <p className="text-small font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">روابط سريعة</p>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink icon={<BookOpen className="h-4 w-4" />} label="مركز المساعدة" desc="مقالات شاملة" onClick={() => window.open('https://help.example.com', '_blank')} />
            <QuickLink icon={<Video className="h-4 w-4" />} label="فيديوهات تعليمية" desc="دروس قصيرة" onClick={() => window.open('https://youtube.com/@chatly', '_blank')} />
            <QuickLink icon={<MessageCircle className="h-4 w-4" />} label="دردشة مباشرة" desc="فريق الدعم" onClick={() => undefined} />
            <QuickLink icon={<Sparkles className="h-4 w-4" />} label="ما الجديد" desc="آخر التحديثات" onClick={() => undefined} />
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="text-small font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">تواصل معنا</p>
          <div className="space-y-1.5">
            <a href="mailto:support@apexes.click" className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark hover:bg-primary/5 transition-colors">
              <Mail className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-small font-medium">البريد الإلكتروني</p>
                <p className="text-[11px] text-muted-light dark:text-muted-dark">support@apexes.click</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" />
            </a>
            <a href="tel:+96891234567" className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark hover:bg-primary/5 transition-colors">
              <Phone className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-small font-medium">الهاتف</p>
                <p className="text-[11px] text-muted-light dark:text-muted-dark">+968 9123 4567</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" />
            </a>
          </div>
        </div>

        {/* Shortcuts */}
        <div>
          <p className="text-small font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5" /> اختصارات لوحة المفاتيح
          </p>
          <div className="space-y-1">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between p-2.5 rounded-lg bg-bg-light dark:bg-bg-dark">
                <span className="text-small">{s.desc}</span>
                <kbd className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono">{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <p className="text-small font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">أسئلة شائعة</p>
          <div className="space-y-1">
            {faqs.map((f, i) => (
              <div key={i} className="border border-border-light dark:border-border-dark rounded-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  <span className="text-small font-medium">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-light dark:text-muted-dark" /> : <ChevronDown className="h-4 w-4 text-muted-light dark:text-muted-dark" />}
                </button>
                {openFaq === i && (
                  <p className="px-3 pb-3 text-small text-muted-light dark:text-muted-dark leading-relaxed">
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function QuickLink({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className="p-3 rounded-card bg-bg-light dark:bg-bg-dark hover:bg-primary/5 transition-colors text-start group">
      <div className={cn('h-7 w-7 rounded-md bg-white dark:bg-surface-dark text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors')}>
        {icon}
      </div>
      <p className="text-small font-semibold">{label}</p>
      <p className="text-[10px] text-muted-light dark:text-muted-dark">{desc}</p>
    </button>
  );
}
