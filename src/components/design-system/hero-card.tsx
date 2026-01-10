/**
 * HeroCard Component
 *
 * Large visual card with image/video background and gradient overlay.
 * Pattern from Sprint Linear Clone and Smart Home Dashboard.
 *
 * Use cases:
 * - Project cards with source thumbnails
 * - Feature showcases on landing page
 * - Source preview cards
 */

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface HeroCardProps {
  /** Background image URL */
  backgroundImage?: string;
  /** Custom background element (e.g., mosaic, video) */
  backgroundElement?: ReactNode;
  /** Card content (overlays the background) */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Card height (default: h-80) */
  height?: string;
  /** Enable hover zoom effect on background */
  enableHoverZoom?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Gradient overlay intensity: light, medium, strong */
  gradientIntensity?: 'light' | 'medium' | 'strong';
}

const gradients = {
  light: 'bg-gradient-to-t from-black/60 via-black/30 to-transparent',
  medium: 'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
  strong: 'bg-gradient-to-t from-black/90 via-black/60 to-transparent',
};

export function HeroCard({
  backgroundImage,
  backgroundElement,
  children,
  className,
  height = 'h-80',
  enableHoverZoom = true,
  onClick,
  gradientIntensity = 'medium',
}: HeroCardProps) {
  const isInteractive = !!onClick;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl group',
        height,
        isInteractive && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {/* Background Layer */}
      {backgroundElement ? (
        <div className="absolute inset-0">{backgroundElement}</div>
      ) : backgroundImage ? (
        <Image
          src={backgroundImage}
          alt=""
          fill
          className={cn(
            'object-cover transition-transform duration-300',
            enableHoverZoom && 'group-hover:scale-105'
          )}
        />
      ) : (
        <div className="absolute inset-0 bg-surface-1" />
      )}

      {/* Gradient Overlay */}
      <div className={cn('absolute inset-0', gradients[gradientIntensity])} />

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col">{children}</div>
    </div>
  );
}

/**
 * HeroCardHeader - Top section of the card
 */
export function HeroCardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      {children}
    </div>
  );
}

/**
 * HeroCardContent - Bottom section with main content
 */
export function HeroCardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mt-auto', className)}>{children}</div>;
}

/**
 * HeroCardTitle - Card title
 */
export function HeroCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-xl font-bold text-white mb-2 line-clamp-2', className)}>
      {children}
    </h3>
  );
}

/**
 * HeroCardDescription - Card description
 */
export function HeroCardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-gray-300 mb-4 line-clamp-2', className)}>
      {children}
    </p>
  );
}

/**
 * HeroCardMetadata - Metadata row (icons + text)
 */
export function HeroCardMetadata({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 text-xs text-gray-400', className)}>
      {children}
    </div>
  );
}

/**
 * HeroCardMetadataItem - Single metadata item
 */
export function HeroCardMetadataItem({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Icon && <Icon className="size-3" />}
      <span>{children}</span>
    </div>
  );
}
