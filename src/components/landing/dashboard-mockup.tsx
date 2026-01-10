'use client';

import { motion, type Variants } from 'framer-motion';
import { Play, Search, Tag, FileVideo, Sparkles, Grid, List } from 'lucide-react';

export function DashboardMockup() {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.5,
      },
    },
  };

  const panelVariants: Variants = {
    hidden: {
      opacity: 0,
      x: 100,
      y: -80,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 1.2,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      className="bg-surface-1 flex h-full w-full overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sidebar */}
      <motion.div
        className="bg-surface-2/80 border-border-subtle flex h-full w-[220px] shrink-0 flex-col border-r"
        variants={panelVariants}
      >
        {/* Logo */}
        <div className="border-border-subtle border-b p-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Sparkles className="text-accent-primary h-5 w-5" />
            <span className="text-sm font-semibold text-white">OpenInsights</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="bg-surface-3/50 text-text-tertiary flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <span className="bg-surface-3/50 ml-auto rounded px-1.5 py-0.5 text-[10px]">⌘K</span>
          </div>
        </div>

        {/* Main nav */}
        <div className="space-y-0.5 px-3">
          <NavItem icon={Grid} label="Dashboard" active />
          <NavItem icon={FileVideo} label="Sources" />
          <NavItem icon={Tag} label="Highlights" badge={47} />
        </div>

        {/* Projects section */}
        <div className="mt-5 px-3">
          <div className="text-text-tertiary px-2 py-1 text-[10px] font-medium tracking-wider uppercase">
            Recent Projects
          </div>
          <div className="mt-1 space-y-0.5">
            <NavItem icon={FileVideo} label="User Research Q1" color="text-accent-primary" />
            <NavItem icon={FileVideo} label="Customer Interviews" color="text-success" />
            <NavItem icon={FileVideo} label="Usability Tests" color="text-warning" />
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        className="bg-base flex h-full flex-1 flex-col overflow-hidden"
        variants={panelVariants}
      >
        {/* Header */}
        <div className="border-border-subtle flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold">Analysis Canvas</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-surface-2 text-text-secondary border-border-subtle hover:bg-surface-3 rounded-md border px-3 py-1.5 text-xs transition-colors">
              Export
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 gap-4 overflow-hidden p-5">
          {/* Video Player */}
          <div className="flex flex-1 flex-col">
            <div className="bg-surface-1 border-border-subtle relative aspect-video overflow-hidden rounded-lg border">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-surface-2 border-border-default flex h-16 w-16 items-center justify-center rounded-full border">
                  <Play className="text-accent-primary ml-1 h-8 w-8" fill="currentColor" />
                </div>
              </div>
              {/* Video timeline */}
              <div className="absolute right-0 bottom-0 left-0 p-4">
                <div className="bg-surface-2 h-1 overflow-hidden rounded-full">
                  <div className="bg-accent-primary h-full w-1/3" />
                </div>
              </div>
            </div>

            {/* Highlight Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button className="bg-accent-primary hover:bg-accent-hover flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-white transition-colors">
                <Tag className="h-3.5 w-3.5" />
                Add Highlight
              </button>
              <button className="bg-surface-2 text-text-secondary border-border-subtle hover:bg-surface-3 rounded-md border px-3 py-1.5 text-xs transition-colors">
                Magic Cluster
              </button>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="bg-surface-1 border-border-subtle flex w-80 flex-col rounded-lg border">
            <div className="border-border-subtle flex items-center justify-between border-b p-3">
              <span className="text-text-primary text-sm font-medium">Transcript</span>
              <div className="flex items-center gap-1">
                <button className="hover:bg-surface-2 rounded p-1">
                  <List className="text-text-secondary h-4 w-4" />
                </button>
                <button className="hover:bg-surface-2 rounded p-1">
                  <Search className="text-text-secondary h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="scrollbar-hide flex-1 space-y-3 overflow-auto p-3">
              <TranscriptSegment speaker="Interviewer" time="0:23" active>
                Can you walk me through how you currently handle customer feedback?
              </TranscriptSegment>
              <TranscriptSegment speaker="Participant" time="0:31">
                Yeah, so we mostly use spreadsheets right now. It&apos;s pretty manual and time
                consuming to organize everything.
              </TranscriptSegment>
              <TranscriptSegment speaker="Interviewer" time="0:45">
                What are the main pain points with that approach?
              </TranscriptSegment>
              <TranscriptSegment speaker="Participant" time="0:52">
                The biggest issue is finding patterns across multiple interviews. Everything is
                scattered.
              </TranscriptSegment>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  color,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  color?: string;
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
        active
          ? 'bg-surface-3 text-white'
          : 'text-text-secondary hover:bg-surface-3/50 hover:text-text-primary'
      }`}
    >
      <Icon className={`h-4 w-4 ${color || ''}`} />
      <span className="flex-1 text-xs">{label}</span>
      {badge && (
        <span className="bg-accent-primary flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

function TranscriptSegment({
  speaker,
  time,
  active,
  children,
}: {
  speaker: string;
  time: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`cursor-pointer rounded-md p-2 transition-colors ${
        active ? 'bg-accent-primary/10 border-accent-primary border-l-2' : 'hover:bg-surface-2'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-text-tertiary text-[10px] font-medium uppercase">{speaker}</span>
        <span className="text-text-tertiary text-[10px]">{time}</span>
      </div>
      <p className="text-text-secondary text-xs leading-relaxed">{children}</p>
    </div>
  );
}
