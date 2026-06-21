import { motion } from 'framer-motion';
import { MessageSquare, Users, BarChart3, Bot } from 'lucide-react';
import { SekaaLogo } from '@components/ui';

const FEATURES = [
  { icon: MessageSquare, label: 'صندوق وارد واحد', desc: 'واتساب، بريد، إنستغرام ومسنجر بنفس اللوحة' },
  { icon: Bot, label: 'مساعد AI ذكي', desc: 'يرد على عملاءك بلهجتك على مدار الساعة' },
  { icon: Users, label: 'توزيع تلقائي للمحادثات', desc: 'كل عميل يصل لأنسب موظف من فريقك' },
  { icon: BarChart3, label: 'تقارير لحظية', desc: 'تابع أداء فريقك ورضا عملاءك بنظرة' },
];

export function AuthHero(): JSX.Element {
  const noiseUrl =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>";

  return (
    <div className="flex-1 relative text-white p-12 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 35%, #1D4ED8 65%, #1E3A8A 100%)' }}>
      {/* Big background logo */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <SekaaLogo className="w-[80%] max-w-[600px] opacity-[0.07]" />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.25]"
        style={{ backgroundImage: `url("${noiseUrl}")`, backgroundSize: '200px 200px' }}
      />

      {/* Big logo mark coming in from the bottom-left corner — fades into the gradient */}
      <svg
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-40 -left-40 w-[700px] h-[700px] pointer-events-none opacity-[0.20]"
        style={{
          maskImage: 'radial-gradient(circle at 25% 75%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'radial-gradient(circle at 25% 75%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0) 75%)',
        }}
      >
        <path d="M24 0H16V12.0632C15.9663 14.2434 14.1885 16 12.0005 16H0V24H8.68629C10.808 24 12.8429 23.1571 14.3431 21.6569L21.6569 14.3431C23.1571 12.8429 24 10.808 24 8.68629V0Z" fill="#ffffff"/>
        <path d="M16 40H24V27.9368C24.0337 25.7566 25.8115 24 27.9995 24H40V16H31.3137C29.192 16 27.1571 16.8429 25.6569 18.3431L18.3431 25.6569C16.8429 27.1571 16 29.192 16 31.3137V40Z" fill="#ffffff"/>
      </svg>

      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -end-20 h-80 w-80 rounded-full bg-sky-400/15 blur-[100px]" />
        <div className="absolute -bottom-20 -start-20 h-72 w-72 rounded-full bg-blue-950/40 blur-[80px]" />
        <div className="absolute top-1/3 start-1/4 h-64 w-64 rounded-full bg-white/5 blur-[60px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative w-full max-w-lg"
      >
        {/* Logo + brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/20">
            <SekaaLogo className="h-9 w-9" />
          </div>
          <div className="text-start">
            <p className="text-2xl font-extrabold leading-tight">Chatly</p>
            <p className="text-[11px] opacity-70 leading-tight">Multi-channel CRM</p>
          </div>
        </div>

        {/* Main heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl xl:text-[2.25rem] font-extrabold leading-tight mb-4">
            كل محادثات عملاءك
            <br />
            في مكان واحد
          </h2>
          <p className="text-sm xl:text-base opacity-80 max-w-md mx-auto leading-relaxed">
            اربط كل قنوات تواصلك مع عملاءك بلوحة واحدة، وخلِّ الذكاء الاصطناعي يساعد فريقك يرد أسرع ويبيع أكثر.
          </p>
        </div>

        {/* Feature cards grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
              className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-4 hover:bg-white/[0.18] transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-white/[0.15] flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-semibold mb-1">{f.label}</p>
              <p className="text-[11px] opacity-65 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
