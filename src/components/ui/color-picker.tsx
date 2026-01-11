import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onColorChange: (color: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showCheckmark?: boolean;
}

export function ColorPicker({
  colors,
  selectedColor,
  onColorChange,
  size = 'md',
  showCheckmark = false,
}: ColorPickerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onColorChange(color)}
          className={cn(
            'rounded-full transition-transform hover:scale-110',
            sizeClasses[size],
            selectedColor === color && 'ring-ring ring-2 ring-offset-2',
            showCheckmark && 'flex items-center justify-center'
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {showCheckmark && selectedColor === color && (
            <Check className="text-foreground h-3 w-3" />
          )}
        </button>
      ))}
    </div>
  );
}
