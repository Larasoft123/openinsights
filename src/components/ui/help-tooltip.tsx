'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface HelpTooltipProps {
  children: React.ReactNode;
}

/**
 * A reusable help tooltip component with a HelpCircle icon.
 * Touch-friendly (uses button) and keyboard accessible.
 *
 * Usage:
 * ```tsx
 * <label>
 *   Field Name
 *   <HelpTooltip>Description text here</HelpTooltip>
 * </label>
 * ```
 */
export function HelpTooltip({ children }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="ml-1 inline-flex cursor-help align-middle"
            aria-label="Help"
          >
            <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
