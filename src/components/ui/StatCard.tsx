import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
}

export function StatCard({
  label,
  value,
  icon,
  iconBg = 'bg-primary/15',
  iconColor = 'text-primary',
  trend,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('h-11 w-11 rounded-card flex items-center justify-center', iconBg, iconColor)}>
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-small font-semibold px-2 py-1 rounded-md',
              trend.positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
            )}
          >
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-small text-muted-light dark:text-muted-dark">{label}</p>
        <p className="text-h1 font-bold">{value}</p>
      </div>
    </Card>
  );
}
