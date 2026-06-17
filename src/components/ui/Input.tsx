import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-input px-3 py-2 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full h-10',
            icon && 'pe-10',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-input px-3 py-2 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full min-h-[80px] resize-y',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
