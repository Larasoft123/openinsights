# OpenInsights Unified Design System

## Overview

This design system unifies patterns from the **Sprint Linear Clone** (landing page) and **Modern Smart Home Dashboard** (app dashboard) to create a cohesive, professional aesthetic across the entire OpenInsights platform.

**Core Philosophy:**
- **Dark-first aesthetic** - Professional, privacy-focused feel
- **Consistent layering** - Surface elevation system for visual hierarchy
- **Purposeful motion** - Smooth, meaningful animations
- **Information density balance** - Dense where needed, spacious elsewhere

---

## Quick Start

### Using Design Tokens

```typescript
import { tokens } from '@/lib/design-tokens';

// Access design tokens in your components
const myColor = tokens.colors.accent.primary;
const mySpacing = tokens.spacing[6];
```

### Using Components

```tsx
import {
  HeroCard,
  HeroCardContent,
  HeroCardTitle,
  StatWidget,
  PillNavigation,
} from '@/components/design-system';

// Use in your components
<HeroCard backgroundImage="/path/to/image.jpg">
  <HeroCardContent>
    <HeroCardTitle>My Project</HeroCardTitle>
  </HeroCardContent>
</HeroCard>
```

---

## Color System

### Using Colors in Tailwind

The design system provides both semantic and surface-level colors:

```tsx
// Semantic colors (backwards compatible)
<div className="bg-background text-foreground" />
<div className="bg-card border-border" />

// Surface layers (new unified system)
<div className="bg-base" />        {/* Main background */}
<div className="bg-surface-1" />   {/* Cards, panels */}
<div className="bg-surface-2" />   {/* Nested cards */}
<div className="bg-surface-3" />   {/* Hover states */}

// Extended borders
<div className="border-border-subtle" />   {/* 1px dividers */}
<div className="border-border-default" />  {/* Standard borders */}
<div className="border-border-strong" />   {/* Emphasized borders */}

// Text colors
<p className="text-text-primary" />    {/* Main text */}
<p className="text-text-secondary" />  {/* Muted text */}
<p className="text-text-tertiary" />   {/* Very muted */}

// Accent colors
<button className="bg-accent-primary hover:bg-accent-hover" />

// Status colors
<div className="text-success" />
<div className="text-warning" />
<div className="text-error" />
<div className="text-info" />
```

### Color Palette Reference

#### Dark Theme (Primary)
```css
--base: #09090B          /* gray-950 */
--surface-1: #18181B     /* gray-900 */
--surface-2: #27272A     /* gray-800 */
--surface-3: #3F3F46     /* gray-700 */
```

#### Light Theme
```css
--base: #FFFFFF
--surface-1: #F9FAFB     /* gray-50 */
--surface-2: #F3F4F6     /* gray-100 */
--surface-3: #E5E7EB     /* gray-200 */
```

---

## Typography

### Font Families

```tsx
// Sans-serif (default)
<p className="font-sans">Geist Sans</p>

// Monospace
<code className="font-mono">Geist Mono</code>
```

### Type Scale

```tsx
// Landing page headlines
<h1 className="text-hero">        {/* 40-56px responsive */}
<h1 className="text-h1">          {/* 32-48px responsive */}
<h2 className="text-h2">          {/* 28-36px responsive */}

// Dashboard headers
<h1 className="text-pageTitle">   {/* 30px */}
<h2 className="text-sectionTitle">{/* 24px */}
<h3 className="text-cardTitle">   {/* 20px */}

// Body text
<p className="text-lg">            {/* 18px */}
<p className="text-base">          {/* 16px - default */}
<p className="text-sm">            {/* 14px */}
<p className="text-xs">            {/* 12px */}
```

### Font Weights & Line Heights

```tsx
// Weights
<p className="font-medium">    {/* 500 */}
<p className="font-semibold">  {/* 600 */}
<p className="font-bold">      {/* 700 */}

// Line heights
<h1 className="leading-tight">    {/* 1.1 - headlines */}
<p className="leading-normal">    {/* 1.5 - body */}
<p className="leading-relaxed">   {/* 1.625 - landing copy */}

// Letter spacing
<h1 className="tracking-tight">   {/* -0.0325em - large headlines */}
<span className="tracking-wide">  {/* 0.05em - uppercase labels */}
```

---

## Spacing

### Standard Scale (4px base)

```tsx
<div className="p-4">     {/* 16px */}
<div className="p-6">     {/* 24px */}
<div className="p-8">     {/* 32px */}

<div className="gap-3">   {/* 12px */}
<div className="gap-4">   {/* 16px */}
<div className="gap-6">   {/* 24px */}
```

### Responsive Scaling

```tsx
// Component padding
<div className="p-4 md:p-6 lg:p-8" />  {/* 16→24→32px */}

// Grid gaps
<div className="gap-3 md:gap-4 lg:gap-6" />  {/* 12→16→24px */}

// Section spacing
<section className="space-y-6 lg:space-y-8 xl:space-y-12" />
```

---

## Border Radius

```tsx
<div className="rounded-sm">    {/* 6px */}
<div className="rounded-md">    {/* 8px */}
<div className="rounded-lg">    {/* 12px */}
<div className="rounded-xl">    {/* 16px */}
<div className="rounded-2xl">   {/* 24px */}
<div className="rounded-3xl">   {/* 32px */}
<div className="rounded-full">  {/* 9999px - pills, avatars */}
```

**Guidelines:**
- Landing page: Use `xl-3xl` for visual cards
- Dashboard widgets: Use `lg-xl` for consistency
- Interactive pills: Use `full`
- Inputs/forms: Use `md`

---

## Component Patterns

### 1. Hero Card

Large visual cards with background images and gradient overlays.

**Example:**
```tsx
import {
  HeroCard,
  HeroCardHeader,
  HeroCardContent,
  HeroCardTitle,
  HeroCardDescription,
  HeroCardMetadata,
  HeroCardMetadataItem,
} from '@/components/design-system';
import { FileVideo, Tag, Clock } from 'lucide-react';

<HeroCard
  backgroundImage="/project-thumbnail.jpg"
  height="h-80"
  enableHoverZoom
  onClick={() => router.push('/project/123')}
>
  <HeroCardHeader>
    <StatusBadge status="active" />
  </HeroCardHeader>

  <HeroCardContent>
    <HeroCardTitle>User Research Q1 2024</HeroCardTitle>
    <HeroCardDescription>
      In-depth interviews with 25 participants exploring pain points in the onboarding flow.
    </HeroCardDescription>

    <HeroCardMetadata>
      <HeroCardMetadataItem icon={FileVideo}>
        12 sources
      </HeroCardMetadataItem>
      <HeroCardMetadataItem icon={Tag}>
        47 highlights
      </HeroCardMetadataItem>
      <HeroCardMetadataItem icon={Clock}>
        Updated 2h ago
      </HeroCardMetadataItem>
    </HeroCardMetadata>
  </HeroCardContent>
</HeroCard>
```

### 2. Stat Widget

Display metrics with optional trends and icons.

**Example:**
```tsx
import { StatWidget } from '@/components/design-system';
import { FolderOpen, FileVideo, Tag } from 'lucide-react';

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <StatWidget
    icon={FolderOpen}
    label="Active Projects"
    value={12}
    change="+2 this month"
    trend="up"
  />

  <StatWidget
    icon={FileVideo}
    label="Processing"
    value={3}
    subtitle="2 transcribing, 1 vectorizing"
    trend="neutral"
  />

  <StatWidget
    icon={Tag}
    label="New Highlights"
    value={47}
    change="+18 this week"
    trend="up"
  />
</div>
```

### 3. Pill Navigation

Interactive pill-style navigation for views, filters, or tabs.

**Example:**
```tsx
import { PillNavigation } from '@/components/design-system';
import { Grid, List, Kanban } from 'lucide-react';

const views = [
  { id: 'grid', label: 'Grid View', icon: Grid },
  { id: 'list', label: 'List View', icon: List },
  { id: 'board', label: 'Board View', icon: Kanban },
];

<PillNavigation
  items={views}
  selectedId={currentView}
  onSelectionChange={setCurrentView}
  size="md"
  iconsOnlyMobile
/>
```

---

## Utility Classes

### Scrollbar Hiding
```tsx
<div className="overflow-x-auto scrollbar-hide">
  {/* Content */}
</div>
```

### Gradient Overlays
```tsx
{/* For image cards */}
<div className="gradient-overlay-dark" />
<div className="gradient-overlay-dark-bottom" />
<div className="gradient-overlay-dark-top" />
```

### Glassmorphism
```tsx
<div className="glass">         {/* Dark glass */}
<div className="glass-light">   {/* Light glass */}
```

### Text Truncation
```tsx
<p className="line-clamp-1">    {/* Single line */}
<p className="line-clamp-2">    {/* Two lines */}
<p className="line-clamp-3">    {/* Three lines */}
```

### Glow Effects
```tsx
<div className="glow-indigo">    {/* Subtle indigo glow */}
<div className="glow-indigo-sm"> {/* Smaller glow */}
```

---

## Layout Patterns

### Landing Page Layout
```tsx
<div className="bg-base min-h-screen">
  {/* Fixed navbar with blur */}
  <nav className="fixed top-0 w-full bg-base/80 backdrop-blur-md border-b border-border-subtle z-50">
    <div className="max-w-4xl mx-auto px-6 py-4">
      {/* Nav content */}
    </div>
  </nav>

  {/* Sections */}
  <section className="px-6 py-24">
    <div className="max-w-4xl mx-auto">
      {/* Section content */}
    </div>
  </section>
</div>
```

### Dashboard Layout
```tsx
<div className="h-screen bg-base text-text-primary flex">
  {/* Sidebar */}
  <aside className="w-64 border-r border-border-subtle">
    {/* Sidebar content */}
  </aside>

  {/* Main content */}
  <main className="flex-1 overflow-y-auto p-6 lg:p-8">
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Dashboard content */}
    </div>
  </main>
</div>
```

---

## Animation Guidelines

### Transition Durations
```tsx
className="transition-all duration-200"  {/* Default */}
className="transition-all duration-300"  {/* Slower */}
className="transition-all duration-500"  {/* Page transitions */}
```

### Common Patterns
```tsx
// Hover lift
className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1"

// Image zoom on card hover
<div className="group overflow-hidden">
  <Image className="transition-transform duration-300 group-hover:scale-105" />
</div>

// Button press
className="active:scale-95 transition-transform"
```

### Framer Motion (for complex animations)
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  {/* Content */}
</motion.div>
```

---

## Responsive Breakpoints

```typescript
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large
```

### Responsive Patterns
```tsx
// Sidebar visibility
className="hidden lg:block"

// Grid collapsing
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"

// Text scaling
className="text-2xl md:text-3xl lg:text-4xl"

// Padding scaling
className="p-4 md:p-6 lg:p-8"
```

---

## Best Practices

### 1. Dark Theme First
Design for dark mode first, then adapt to light mode. Our primary users are research professionals who prefer dark interfaces.

### 2. Layered Surfaces
Use the surface system (`surface-1`, `surface-2`, `surface-3`) to create depth:
- Base: Page background
- Surface-1: Cards, panels
- Surface-2: Nested cards, hover states
- Surface-3: Active/selected states

### 3. Consistent Spacing
Stick to the 4px spacing scale. Use responsive scaling patterns for different screen sizes.

### 4. Meaningful Motion
Only animate when it adds value:
- ✅ Hover states for affordance
- ✅ Loading states for feedback
- ✅ Page transitions for context
- ❌ Decorative animations

### 5. Accessibility
- Always provide focus states
- Use semantic HTML
- Ensure color contrast meets WCAG AA standards
- Test with keyboard navigation

---

## Migration Guide

### From Old to New

**Colors:**
```tsx
// Old
<div className="bg-gray-900" />

// New (semantic)
<div className="bg-surface-1" />

// Direct (when needed)
<div className="bg-[#18181B]" />
```

**Cards:**
```tsx
// Old
<Card className="bg-card rounded-lg p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// New (for visual cards)
<HeroCard backgroundImage="/image.jpg">
  <HeroCardContent>
    <HeroCardTitle>Title</HeroCardTitle>
  </HeroCardContent>
</HeroCard>

// New (for stats)
<StatWidget
  icon={Icon}
  label="Label"
  value={123}
/>
```

---

## Resources

- **Design Tokens:** `/src/lib/design-tokens.ts`
- **Components:** `/src/components/design-system/`
- **Styles:** `/src/app/globals.css`
- **Templates Reference:**
  - Sprint Linear Clone: `/tmp_docs/sprint-a-linear-clone/`
  - Smart Home Dashboard: `/tmp_docs/modern-smart-home-dashboard/`

---

## Contributing

When adding new components:
1. Follow existing patterns from the design system
2. Use design tokens from `/src/lib/design-tokens.ts`
3. Support both light and dark themes
4. Include TypeScript types
5. Add JSDoc comments
6. Update this documentation

---

**Questions?** Review the template implementations in `/tmp_docs` or check the DASHBOARD_DESIGN_ANALYSIS.md for detailed pattern analysis.
