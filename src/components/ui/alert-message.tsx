import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertMessageProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

const VARIANT_CONFIG = {
  error: {
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-700 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
};

export function AlertMessage({ variant = 'error', message, className }: AlertMessageProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
        config.className,
        className
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
