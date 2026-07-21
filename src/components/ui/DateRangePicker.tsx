import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

type PresetKey = 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

function startOfDay(d: Date): Date { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date): Date { const n = startOfDay(d); n.setDate(n.getDate() - n.getDay()); return n; }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isSameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isInRange(d: Date, from: Date, to: Date): boolean { const t = startOfDay(d).getTime(); return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime(); }
function formatDate(d: Date): string {
  return d.toLocaleDateString('ar-OM-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PRESETS: { key: PresetKey; label: string; range: () => [Date, Date] }[] = [
  { key: 'today', label: 'اليوم', range: () => { const t = startOfDay(new Date()); return [t, t]; } },
  { key: 'yesterday', label: 'أمس', range: () => { const y = addDays(new Date(), -1); return [startOfDay(y), startOfDay(y)]; } },
  { key: 'last7', label: 'آخر 7 أيام', range: () => [startOfDay(addDays(new Date(), -6)), startOfDay(new Date())] },
  { key: 'last14', label: 'آخر 14 يوم', range: () => [startOfDay(addDays(new Date(), -13)), startOfDay(new Date())] },
  { key: 'last30', label: 'آخر 30 يوم', range: () => [startOfDay(addDays(new Date(), -29)), startOfDay(new Date())] },
  { key: 'thisWeek', label: 'هذا الأسبوع', range: () => [startOfWeek(new Date()), startOfDay(new Date())] },
  { key: 'lastWeek', label: 'الأسبوع الماضي', range: () => { const s = addDays(startOfWeek(new Date()), -7); return [s, addDays(s, 6)]; } },
  { key: 'thisMonth', label: 'هذا الشهر', range: () => [startOfMonth(new Date()), startOfDay(new Date())] },
  { key: 'lastMonth', label: 'الشهر الماضي', range: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); return [s, endOfMonth(s)]; } },
];

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

function CalendarMonth({ year, month, from, to, hoverDate, onSelect, onHover }: {
  year: number; month: number; from: Date | null; to: Date | null;
  hoverDate: Date | null; onSelect: (d: Date) => void; onHover: (d: Date | null) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const effectiveTo = to ?? hoverDate;

  return (
    <div className="w-[230px]">
      <div className="text-center font-bold text-body mb-2">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-[11px] font-medium text-muted-light dark:text-muted-dark mb-1">
        {DAY_NAMES_SHORT.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="h-8" />;
          const isToday = isSameDay(date, today);
          const isFrom = from && isSameDay(date, from);
          const isTo = effectiveTo && isSameDay(date, effectiveTo);
          const inRange = from && effectiveTo && !isSameDay(from, effectiveTo) && isInRange(date, from, effectiveTo);
          const isEndpoint = isFrom || isTo;
          const isFuture = date.getTime() > today.getTime();

          return (
            <button
              key={date.toISOString()}
              disabled={isFuture}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'h-8 text-[13px] transition-colors relative',
                isFuture && 'opacity-30 cursor-not-allowed',
                isEndpoint && 'bg-primary text-white font-bold',
                isEndpoint && isFrom && !isTo && 'rounded-s-full',
                isEndpoint && isTo && !isFrom && 'rounded-e-full',
                isEndpoint && isFrom && isTo && 'rounded-full',
                !isEndpoint && inRange && 'bg-primary/10',
                !isEndpoint && !inRange && !isFuture && 'hover:bg-bg-light dark:hover:bg-bg-dark',
                isToday && !isEndpoint && 'font-bold text-primary',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ from, to, onChangeRange }: {
  from: Date; to: Date;
  onChangeRange: (from: Date, to: Date, preset?: PresetKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<PresetKey>('last7');

  const [draftFrom, setDraftFrom] = useState<Date | null>(from);
  const [draftTo, setDraftTo] = useState<Date | null>(to);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date(from);
    d.setMonth(d.getMonth() - 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const rightMonth = { year: leftMonth.month === 11 ? leftMonth.year + 1 : leftMonth.year, month: (leftMonth.month + 1) % 12 };

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    setSelectingEnd(false);
    const d = new Date(from);
    d.setMonth(d.getMonth() - 1);
    setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => setLeftMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 });
  const nextMonth = () => setLeftMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 });

  const handleSelect = (d: Date) => {
    if (!selectingEnd || !draftFrom) {
      setDraftFrom(d);
      setDraftTo(null);
      setSelectingEnd(true);
      setActivePreset('' as PresetKey);
    } else {
      const [f, t] = d < draftFrom ? [d, draftFrom] : [draftFrom, d];
      setDraftFrom(f);
      setDraftTo(t);
      setSelectingEnd(false);
      setActivePreset('' as PresetKey);
      onChangeRange(f, t);
      setOpen(false);
    }
  };

  const handlePreset = (p: typeof PRESETS[number]) => {
    const [f, t] = p.range();
    setDraftFrom(f);
    setDraftTo(t);
    setSelectingEnd(false);
    setActivePreset(p.key);
    onChangeRange(f, t, p.key);
    setOpen(false);
  };

  const label = `${formatDate(from)} — ${formatDate(to)}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-10 px-4 rounded-xl border text-small font-medium flex items-center gap-2 transition-all',
          open
            ? 'border-primary ring-2 ring-primary/10 bg-white dark:bg-surface-dark'
            : 'border-border-light dark:border-border-dark bg-white dark:bg-surface-dark hover:border-primary/40'
        )}
      >
        <Calendar className="h-4 w-4 text-muted-light dark:text-muted-dark" />
        <span>{label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-light dark:text-muted-dark transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 start-0 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-xl overflow-hidden">
          <div className="flex">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={nextMonth} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-6">
                <CalendarMonth
                  year={leftMonth.year} month={leftMonth.month}
                  from={draftFrom} to={draftTo} hoverDate={selectingEnd ? hoverDate : null}
                  onSelect={handleSelect} onHover={setHoverDate}
                />
                <CalendarMonth
                  year={rightMonth.year} month={rightMonth.month}
                  from={draftFrom} to={draftTo} hoverDate={selectingEnd ? hoverDate : null}
                  onSelect={handleSelect} onHover={setHoverDate}
                />
              </div>
            </div>
            <div className="w-40 border-s border-border-light dark:border-border-dark p-2 flex flex-col gap-0.5">
              <p className="text-[11px] font-bold text-muted-light dark:text-muted-dark px-2 py-1.5">اختيارات سريعة</p>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    'text-start px-3 py-1.5 rounded-lg text-[13px] transition-colors flex items-center gap-2',
                    activePreset === p.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-bg-light dark:hover:bg-bg-dark text-body'
                  )}
                >
                  {activePreset === p.key && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
