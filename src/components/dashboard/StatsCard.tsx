import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  description?: string;
}

const variantStyles = {
  default: 'border-border bg-card',
  success: 'border-success/20 bg-success/5',
  warning: 'border-warning/20 bg-warning/5',
  danger: 'border-destructive/20 bg-destructive/5',
};

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  variant = 'default',
  description,
}: StatsCardProps) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 font-display text-4xl tracking-wider text-foreground">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            iconStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Decorative Element */}
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-current opacity-5" />
    </div>
  );
};

export default StatsCard;
