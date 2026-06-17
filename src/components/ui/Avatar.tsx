import { avatarColor, initials } from '@/utils/format';
import { cn } from '@/utils/cn';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  status?: 'online' | 'busy' | 'offline';
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-small',
  md: 'h-10 w-10 text-body',
  lg: 'h-14 w-14 text-h3',
};

const statusDot = {
  online: 'bg-success',
  busy: 'bg-warning',
  offline: 'bg-muted-light dark:bg-muted-dark',
};

export function Avatar({ name, size = 'md', className, status }: AvatarProps): JSX.Element {
  return (
    <div className="relative inline-block flex-shrink-0">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          sizeMap[size],
          avatarColor(name),
          className
        )}
      >
        {initials(name)}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 start-0 h-2.5 w-2.5 rounded-full ring-2 ring-surface-light dark:ring-surface-dark',
            statusDot[status]
          )}
        />
      )}
    </div>
  );
}
