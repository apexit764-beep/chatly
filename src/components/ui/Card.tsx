import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-light dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';
