import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  color: string;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ name, color, className, onClick }: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs', onClick && 'cursor-pointer', className)}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
      onClick={onClick}
    >
      {name}
    </Badge>
  );
}
