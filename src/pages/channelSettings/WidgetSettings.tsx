import { useState } from 'react';
import {
  Copy,
  Check,
  Code,
  Eye,
  Globe,
  MessageCircle,
  Type,
  Image as ImageIcon,
  Send,
  Smile,
  Paperclip,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { Card, Input, Textarea } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import type { WidgetConfig } from '@/types';

const presetColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#0F172A'];

export type WidgetSubTab = 'appearance' | 'messages' | 'behavior' | 'install';

/**
 * Widget settings shell: editor panel on the start side, live preview on the end side.
 * Rendered inside ChannelDetail when the active channel is `widget`.
 */
export function WidgetSettings({ subTab }: { subTab: WidgetSubTab }): JSX.Element {
  const config = useDataStore((s) => s.widgetConfig);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Editor */}
      <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark p-5">
        {subTab === 'appearance' && <AppearancePanel />}
        {subTab === 'messages' && <MessagesPanel />}
        {subTab === 'behavior' && <BehaviorPanel />}
        {subTab === 'install' && <InstallPanel />}
      </div>

      {/* Live preview */}
      <div className="bg-bg-light dark:bg-bg-dark rounded-card border border-border-light dark:border-border-dark overflow-hidden sticky top-4">
        <div className="px-4 py-3 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <p className="text-small font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            معاينة مباشرة
          </p>
          <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">yourstore.com</span>
        </div>
        <div
          className="relative overflow-hidden h-[560px]"
          style={{ backgroundImage: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)' }}
        >
          <div className="absolute inset-4 bg-white rounded-card shadow-sm p-4 opacity-70">
            <div className="h-3 w-32 bg-slate-200 rounded mb-2" />
            <div className="h-2 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-2 w-3/4 bg-slate-100 rounded mb-3" />
            <div className="h-20 bg-slate-100 rounded mb-3" />
            <div className="h-2 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-2 w-2/3 bg-slate-100 rounded" />
          </div>
          <WidgetPreview config={config} />
        </div>
      </div>
    </div>
  );
}

function AppearancePanel(): JSX.Element {
  const config = useDataStore((s) => s.widgetConfig);
  const updateConfig = useDataStore((s) => s.updateWidgetConfig);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 font-bold mb-3">لون الـ Brand</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {presetColors.map((c) => (
            <button
              key={c}
              onClick={() => updateConfig({ primaryColor: c })}
              className={cn('h-10 w-10 rounded-full transition-all', config.primaryColor === c && 'ring-2 ring-offset-2 ring-current')}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={config.primaryColor}
            onChange={(e) => updateConfig({ primaryColor: e.target.value })}
            className="h-10 w-10 rounded-full cursor-pointer border border-border-light dark:border-border-dark"
            title="لون مخصص"
          />
          <input
            type="text"
            value={config.primaryColor}
            onChange={(e) => updateConfig({ primaryColor: e.target.value })}
            className="h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body font-mono w-32 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="text-h3 font-bold mb-3">موضع الـ Widget</h3>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => updateConfig({ position: 'bottom-right' })}
            className={cn('rounded-card border-2 p-4 transition-all text-start', config.position === 'bottom-right' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark hover:border-primary/30')}
          >
            <div className="h-20 rounded-lg bg-bg-light dark:bg-bg-dark relative">
              <div className="absolute bottom-2 end-2 h-6 w-6 rounded-full" style={{ background: config.primaryColor }} />
            </div>
            <p className="text-body font-medium mt-2">يمين الأسفل</p>
          </button>
          <button
            onClick={() => updateConfig({ position: 'bottom-left' })}
            className={cn('rounded-card border-2 p-4 transition-all text-start', config.position === 'bottom-left' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark hover:border-primary/30')}
          >
            <div className="h-20 rounded-lg bg-bg-light dark:bg-bg-dark relative">
              <div className="absolute bottom-2 start-2 h-6 w-6 rounded-full" style={{ background: config.primaryColor }} />
            </div>
            <p className="text-body font-medium mt-2">يسار الأسفل</p>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-h3 font-bold mb-3">أيقونة الـ Bubble</h3>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'chat', icon: <MessageCircle className="h-5 w-5" /> },
            { key: 'message', icon: <Type className="h-5 w-5" /> },
            { key: 'help', icon: <HelpCircle className="h-5 w-5" /> },
          ] as const).map((b) => (
            <button
              key={b.key}
              onClick={() => updateConfig({ bubbleIcon: b.key })}
              className={cn('h-14 w-14 rounded-full transition-all flex items-center justify-center text-white', config.bubbleIcon === b.key && 'ring-2 ring-offset-2 ring-current scale-110')}
              style={{ background: config.primaryColor }}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-h3 font-bold mb-3">إعدادات إضافية</h3>
        <div className="space-y-3 max-w-md">
          <SwitchRow label="إظهار صورة الموظف" hint="عرض avatar الموظف الذي يرد" checked={config.showAvatar} onChange={(v) => updateConfig({ showAvatar: v })} />
        </div>
      </div>
    </div>
  );
}

function MessagesPanel(): JSX.Element {
  const config = useDataStore((s) => s.widgetConfig);
  const updateConfig = useDataStore((s) => s.updateWidgetConfig);
  return (
    <div className="space-y-5">
      <Input label="اسم الفريق" value={config.teamName} onChange={(e) => updateConfig({ teamName: e.target.value })} placeholder="فريق Chatly" icon={<ImageIcon className="h-4 w-4" />} />
      <Textarea label="رسالة الترحيب" value={config.welcomeMessage} onChange={(e) => updateConfig({ welcomeMessage: e.target.value })} rows={3} placeholder="مرحباً 👋 كيف يمكننا مساعدتك اليوم؟" />
      <Input label="وقت الاستجابة المتوقع" value={config.responseTime} onChange={(e) => updateConfig({ responseTime: e.target.value })} placeholder="نرد عادةً خلال دقائق" />
    </div>
  );
}

function BehaviorPanel(): JSX.Element {
  const config = useDataStore((s) => s.widgetConfig);
  const updateConfig = useDataStore((s) => s.updateWidgetConfig);
  return (
    <div className="space-y-3">
      <SwitchRow
        label="جمع البريد الإلكتروني"
        hint="اطلب من الزائر بريده قبل بدء المحادثة"
        checked={config.collectEmail}
        onChange={(v) => updateConfig({ collectEmail: v })}
      />
      <SwitchRow
        label="إظهار ساعات العمل"
        hint="عرض حالة 'متصل/غير متصل' حسب ساعات الدوام"
        checked={config.showBusinessHours}
        onChange={(v) => updateConfig({ showBusinessHours: v })}
      />
      <SwitchRow
        label="السماح بالمرفقات"
        hint="الزائر يقدر يبعت صور وملفات"
        checked={config.allowAttachments}
        onChange={(v) => updateConfig({ allowAttachments: v })}
      />
      <SwitchRow
        label="رسائل صوتية"
        hint="السماح بإرسال رسائل صوتية"
        checked={config.allowVoice}
        onChange={(v) => updateConfig({ allowVoice: v })}
      />
      <SwitchRow
        label="إشعار بالصوت"
        hint="تشغيل صوت تنبيه عند رسالة جديدة"
        checked={config.soundNotification}
        onChange={(v) => updateConfig({ soundNotification: v })}
      />
    </div>
  );
}

function InstallPanel(): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const widgetId = 'wdgt_chatly_8f3a2b';
  const installCode = `<!-- Chatly Live Chat Widget -->
<script>
  (function(s,e,k,a){
    s.ChatlyChat=k;
    s[k]=s[k]||function(){(s[k].q=s[k].q||[]).push(arguments)};
    var d=e.createElement('script'),x=e.getElementsByTagName('script')[0];
    d.async=1;d.src='https://chat-client.apexes.click/widget.js';
    d.setAttribute('data-id',a);x.parentNode.insertBefore(d,x);
  })(window,document,'chatly','${widgetId}');
</script>`;
  const npmInstall = `npm install @chatly/chat-widget

// In your app:
import ChatlyChat from '@chatly/chat-widget';
ChatlyChat.init({ widgetId: '${widgetId}' });`;

  const copy = (text: string): void => {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    showToast('تم النسخ', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-primary/5 border-primary/20">
        <h3 className="text-h3 font-bold mb-2 flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Widget ID
        </h3>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-surface-dark">
          <code className="flex-1 text-body font-mono font-semibold">{widgetId}</code>
          <button onClick={() => copy(widgetId)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-h3 font-bold">شفرة التثبيت (HTML)</h3>
          <button onClick={() => copy(installCode)} className="h-9 px-3 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            نسخ الكود
          </button>
        </div>
        <p className="text-small text-muted-light dark:text-muted-dark mb-3">
          أضف هذه الشفرة قبل تاج <code className="px-1 rounded bg-bg-light dark:bg-bg-dark font-mono">{'</body>'}</code> في كل صفحة تريد ظهور الـ widget فيها
        </p>
        <pre className="p-4 rounded-card bg-[#0F172A] text-[#E2E8F0] text-small font-mono overflow-x-auto leading-relaxed" dir="ltr">
          <code>{installCode}</code>
        </pre>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-h3 font-bold">React / Next.js</h3>
          <button onClick={() => copy(npmInstall)} className="h-9 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
            <Copy className="h-4 w-4" />
            نسخ
          </button>
        </div>
        <pre className="p-4 rounded-card bg-[#0F172A] text-[#E2E8F0] text-small font-mono overflow-x-auto leading-relaxed" dir="ltr">
          <code>{npmInstall}</code>
        </pre>
      </div>
    </div>
  );
}

function WidgetPreview({ config }: { config: WidgetConfig }): JSX.Element {
  const [open, setOpen] = useState(true);
  const positionCls = config.position === 'bottom-right' ? 'bottom-4 end-4' : 'bottom-4 start-4';
  return (
    <>
      {open && (
        <div
          dir="rtl"
          className={cn('absolute w-[300px] max-w-[calc(100%-32px)] bg-white rounded-card shadow-2xl overflow-hidden flex flex-col', config.position === 'bottom-right' ? 'bottom-20 end-4' : 'bottom-20 start-4')}
          style={{ height: 420 }}
        >
          <div className="p-4 text-white relative" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${shade(config.primaryColor, -15)})` }}>
            <div className="flex items-center gap-3">
              {config.showAvatar && (
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-base">C</div>
              )}
              <div>
                <p className="font-bold">{config.teamName}</p>
                <p className="text-[11px] opacity-90 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  متصل · {config.responseTime}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="absolute top-3 end-3 h-7 w-7 rounded-full hover:bg-white/15 flex items-center justify-center" aria-label="إغلاق">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#F8F9FC]">
            <div className="flex">
              <div className="max-w-[85%] bg-white border border-border-light px-3 py-2 rounded-2xl rounded-bl-sm text-small shadow-sm">{config.welcomeMessage}</div>
            </div>
            {config.collectEmail && (
              <div className="flex">
                <div className="max-w-[85%] bg-white border border-border-light px-3 py-2 rounded-2xl rounded-bl-sm text-small shadow-sm">قبل ما نبدأ، ممكن نأخذ بريدك الإلكتروني؟ ✉️</div>
              </div>
            )}
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-small text-white shadow-sm" style={{ background: config.primaryColor }}>مرحباً! بدي أستفسر عن شقة في الخوض</div>
            </div>
            <div className="flex">
              <div className="max-w-[85%] bg-white border border-border-light px-3 py-2 rounded-2xl rounded-bl-sm text-small shadow-sm">أهلاً وسهلاً! نعم، لدينا عدة خيارات. كم غرفة تحتاج؟</div>
            </div>
          </div>
          <div className="border-t border-border-light p-2 flex items-center gap-1">
            <button className="h-8 w-8 rounded-full text-muted-light hover:bg-bg-light flex items-center justify-center flex-shrink-0"><Paperclip className="h-4 w-4" /></button>
            <button className="h-8 w-8 rounded-full text-muted-light hover:bg-bg-light flex items-center justify-center flex-shrink-0"><Smile className="h-4 w-4" /></button>
            <input placeholder="اكتب رسالتك..." className="flex-1 min-w-0 h-9 bg-bg-light rounded-full px-3 text-small focus:outline-none border-0" />
            <button className="h-9 w-9 rounded-full text-white flex items-center justify-center flex-shrink-0" style={{ background: config.primaryColor }}><Send className="h-4 w-4" /></button>
          </div>
          <div className="text-center py-1.5 text-[10px] text-muted-light border-t border-border-light/60">🚀 يعمل بواسطة Chatly</div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('absolute h-14 w-14 rounded-full text-white flex items-center justify-center shadow-xl transition-transform hover:scale-110', positionCls)}
        style={{ background: config.primaryColor }}
      >
        {open ? '✕' : config.bubbleIcon === 'chat' ? <MessageCircle className="h-6 w-6" /> : config.bubbleIcon === 'message' ? <Mail className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <label className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark cursor-pointer">
      <div>
        <p className="text-body font-medium">{label}</p>
        {hint && <p className="text-small text-muted-light dark:text-muted-dark">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0', checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')}
        role="switch"
        aria-checked={checked}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
      </button>
    </label>
  );
}

function shade(hex: string, percent: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const adjust = (v: number): number => Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)));
  return '#' + [adjust(r), adjust(g), adjust(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
