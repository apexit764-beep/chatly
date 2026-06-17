import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'animate-pulse bg-border-light dark:bg-border-dark rounded-md',
        className
      )}
    />
  );
}
