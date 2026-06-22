import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Building2,
  UsersRound,
  MessageSquareQuote,
  Globe,
  Check,
  ArrowLeft,
  X,
  Rocket,
} from 'lucide-react';
import { SekaaLogo } from '@components/ui';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useOnboardingSteps, type OnboardingStep } from '@/hooks/useOnboardingSteps';
import { cn } from '@/utils/cn';

const ICONS = {
  channels: Smartphone,
  departments: Building2,
  team: UsersRound,
  replies: MessageSquareQuote,
  widget: Globe,
} as const;

export function OnboardingModal(): JSX.Element | null {
  const navigate = useNavigate();
  const { skipped, finished, skip, finish } = useOnboardingStore();
  const { steps, doneCount, total, allComplete, progress } = useOnboardingSteps();

  // Disappears permanently once every step is satisfied.
  useEffect(() => {
    if (allComplete && !finished) finish();
  }, [allComplete, finished, finish]);

  const visible = !finished && !skipped && !allComplete;
  if (!visible) return null;

  const goToStep = (step: OnboardingStep): void => {
    skip(); // hide modal, keep the sidebar reminder so they can return
    navigate(step.to);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary to-primary-dark text-white">
          <button
            onClick={skip}
            className="absolute top-4 end-4 h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center"
            aria-label="تخطٍّ"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-lg">
            <SekaaLogo className="h-8 w-8" />
          </div>
          <h2 className="text-h2 font-extrabold">أهلاً بك في Chatly 👋</h2>
          <p className="text-body opacity-90 mt-1">
            خمس خطوات سريعة تجهّز نظامك بالكامل. أكمِلها متى ما ناسبك.
          </p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-small mb-1.5">
              <span className="font-semibold">{doneCount} من {total} مكتمل</span>
              <span className="opacity-90 tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-2">
          {steps.map((step) => {
            const Icon = ICONS[step.icon];
            return (
              <button
                key={step.key}
                onClick={() => !step.done && goToStep(step)}
                disabled={step.done}
                className={cn(
                  'w-full text-start p-3 rounded-card border flex items-center gap-3 transition-colors',
                  step.done
                    ? 'border-success/30 bg-success/5 cursor-default'
                    : 'border-border-light dark:border-border-dark hover:border-primary/40 hover:bg-bg-light dark:hover:bg-bg-dark'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    step.done ? 'bg-success text-white' : 'bg-primary/10 text-primary'
                  )}
                >
                  {step.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-body font-semibold', step.done && 'text-muted-light dark:text-muted-dark line-through')}>
                    {step.title}
                  </p>
                  <p className="text-small text-muted-light dark:text-muted-dark line-clamp-1">
                    {step.description}
                  </p>
                </div>
                {step.done ? (
                  <span className="text-[11px] font-semibold text-success flex-shrink-0">تم</span>
                ) : (
                  <span className="text-small font-semibold text-primary flex items-center gap-1 flex-shrink-0">
                    ابدأ <ArrowLeft className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Skip */}
        <div className="border-t border-border-light dark:border-border-dark p-4">
          <button
            onClick={skip}
            className="w-full h-9 rounded-full text-small font-medium text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            تخطّي الإعداد الآن
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Compact onboarding reminder shown in the sidebar after the user skips,
 * until every step is complete. Clicking it reopens the full checklist.
 */
export function OnboardingReminder({ collapsed = false }: { collapsed?: boolean }): JSX.Element | null {
  const { skipped, finished } = useOnboardingStore();
  const reopen = useOnboardingStore((s) => s.reopen);
  const { doneCount, total, allComplete, progress } = useOnboardingSteps();

  if (finished || allComplete || !skipped) return null;

  if (collapsed) {
    return (
      <button
        onClick={reopen}
        title={`إكمال الإعداد · ${doneCount}/${total}`}
        aria-label="إكمال الإعداد"
        className="relative h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-sky-300 flex items-center justify-center hover:bg-white/15 transition-colors"
      >
        <Rocket className="h-4 w-4" />
        <span className="absolute -top-1 -end-1 h-4 min-w-4 px-1 rounded-full bg-sky-400 text-[#0F2554] text-[9px] font-bold flex items-center justify-center ring-2 ring-[#172554]">
          {doneCount}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={reopen}
      className="w-full text-start p-3 rounded-xl bg-gradient-to-br from-white/[0.14] to-white/[0.06] border border-white/15 hover:border-sky-300/50 hover:from-white/[0.18] transition-all relative overflow-hidden group"
    >
      <span className="absolute -top-6 -end-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl pointer-events-none group-hover:bg-sky-400/30 transition-colors" />
      <div className="relative flex items-center gap-2 mb-2">
        <span className="h-6 w-6 rounded-md bg-sky-400/20 flex items-center justify-center">
          <Rocket className="h-3.5 w-3.5 text-sky-300" />
        </span>
        <span className="text-small font-semibold flex-1 text-white">إكمال الإعداد</span>
        <span className="text-[11px] text-sky-300 font-bold tabular-nums">{doneCount}/{total}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all bg-gradient-to-r from-sky-400 to-sky-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
