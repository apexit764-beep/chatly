import type { WhatsAppTemplateStatus } from '@/types';
import { templateStatusColor, templateStatusLabel, templateStatusMeaning } from '@/utils/metaTemplates';
import { cn } from '@/utils/cn';

export function TemplateStatusBadge({ status, className }: { status: WhatsAppTemplateStatus; className?: string }): JSX.Element {
  return (
    <span
      title={templateStatusMeaning[status]}
      className={cn(
        'inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap flex-shrink-0',
        templateStatusColor[status],
        className,
      )}
    >
      {templateStatusLabel[status]}
    </span>
  );
}
