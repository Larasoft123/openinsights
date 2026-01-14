'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  // Handle wheel events to enable scrolling inside popover when inside a dialog
  // This works around react-remove-scroll blocking scroll events in Dialog
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const scrollableParent = target.closest(
      '[class*="overflow-y-auto"], [class*="overflow-auto"]'
    ) as HTMLElement;

    if (scrollableParent) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
      const isAtTop = scrollTop === 0 && e.deltaY < 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;

      // Stop propagation to prevent Dialog's scroll lock from blocking the scroll
      if (!isAtTop && !isAtBottom) {
        e.stopPropagation();
      }
    }
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-scroll-lock-scrollable
        onWheelCapture={handleWheel}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 pointer-events-auto z-[100] origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
