import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-h3 font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-body text-muted-light dark:text-muted-dark max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
