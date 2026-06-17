import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, children, ...props }, ref) => (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'appearance-none bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-input px-3 py-2 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full h-10 pe-9 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
      </div>
    </div>
  )
);
Select.displayName = 'Select';
