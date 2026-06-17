import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { widgetConfig as initialWidgetConfig } from '@/store/mockData';

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  /** Route the step links to */
  to: string;
  /** Lucide icon name resolved by the component */
  icon: 'channels' | 'departments' | 'team' | 'replies' | 'widget';
  done: boolean;
}

/**
 * Derives onboarding completion purely from store data — never from a manual
 * "mark complete" flag. Each step reflects whether the underlying data exists.
 */
export function useOnboardingSteps(): {
  steps: OnboardingStep[];
  doneCount: number;
  total: number;
  allComplete: boolean;
  progress: number;
} {
  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const agents = useDataStore((s) => s.agents);
  const templates = useDataStore((s) => s.templates);
  const widget = useDataStore((s) => s.widgetConfig);

  return useMemo(() => {
    const widgetCustomized = JSON.stringify(widget) !== JSON.stringify(initialWidgetConfig);

    const steps: OnboardingStep[] = [
      {
        key: 'channels',
        title: 'اربط قنوات التواصل',
        description: 'فعّل واتساب أو إنستجرام أو أي قناة يستخدمها عملاؤك',
        to: '/channels',
        icon: 'channels',
        done: channels.length > 0,
      },
      {
        key: 'departments',
        title: 'أنشئ الأقسام',
        description: 'نظّم المحادثات في أقسام مثل المبيعات والدعم',
        to: '/departments',
        icon: 'departments',
        done: departments.length > 0,
      },
      {
        key: 'team',
        title: 'ادعُ فريق العمل',
        description: 'أضف موظفيك ليردّوا على العملاء معك',
        to: '/team',
        icon: 'team',
        done: agents.length > 1,
      },
      {
        key: 'replies',
        title: 'جهّز الردود السريعة',
        description: 'اكتب قوالب جاهزة لتسريع ردود فريقك',
        to: '/saved-replies',
        icon: 'replies',
        done: templates.length > 0,
      },
      {
        key: 'widget',
        title: 'خصّص الويدجت',
        description: 'عدّل ألوان ورسائل أداة الدردشة على موقعك',
        to: '/channels/widget',
        icon: 'widget',
        done: widgetCustomized,
      },
    ];

    const doneCount = steps.filter((s) => s.done).length;
    const total = steps.length;
    return {
      steps,
      doneCount,
      total,
      allComplete: doneCount === total,
      progress: Math.round((doneCount / total) * 100),
    };
  }, [channels, departments, agents, templates, widget]);
}
