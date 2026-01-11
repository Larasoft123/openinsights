'use client';

import {
  ChevronDown,
  Download,
  Plus,
  Sparkles,
  GripVertical,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Insights Mockup Page
 *
 * Static mockup of the Insight Board (Kanban) for screenshots.
 * Uses hardcoded demo data - no database required.
 */

const DEMO_THEMES = [
  {
    id: 'theme-1',
    name: 'Navigation Issues',
    color: '#EF4444',
    description: 'Problems with finding features and menu structure',
    highlights: [
      {
        id: 'h-1',
        content: 'The export functionality is buried too deep in the menu structure.',
        tag: { name: 'Pain Point', color: '#EF4444' },
        source: 'Sarah M.',
        time: '2:34',
      },
      {
        id: 'h-2',
        content: "I couldn't find the settings page for the first week of using the product.",
        tag: { name: 'Usability Issue', color: '#F59E0B' },
        source: 'John D.',
        time: '4:12',
      },
    ],
  },
  {
    id: 'theme-2',
    name: 'Export & Sharing',
    color: '#A855F7',
    description: 'Requests for better export and collaboration features',
    highlights: [
      {
        id: 'h-3',
        content: 'PDF export with charts would save me hours of work each week.',
        tag: { name: 'Feature Request', color: '#A855F7' },
        source: 'Sarah M.',
        time: '15:33',
      },
      {
        id: 'h-4',
        content: 'Real-time collaboration would be amazing. We currently share exports manually.',
        tag: { name: 'Feature Request', color: '#A855F7' },
        source: 'Mike R.',
        time: '8:21',
      },
      {
        id: 'h-5',
        content: 'The CSV export is great but I wish I could customize which columns to include.',
        tag: { name: 'Feature Request', color: '#A855F7' },
        source: 'John D.',
        time: '11:45',
      },
    ],
  },
  {
    id: 'theme-3',
    name: 'Positive Experiences',
    color: '#22C55E',
    description: 'What users love about the product',
    highlights: [
      {
        id: 'h-6',
        content: 'The new dashboard layout is so much cleaner and more intuitive.',
        tag: { name: 'Positive Feedback', color: '#22C55E' },
        source: 'Sarah M.',
        time: '8:45',
      },
      {
        id: 'h-7',
        content: 'Pricing transparency was a key factor in choosing your product.',
        tag: { name: 'Positive Feedback', color: '#22C55E' },
        source: 'John D.',
        time: '12:08',
      },
    ],
  },
];

const UNASSIGNED_HIGHLIGHTS = [
  {
    id: 'h-8',
    content: 'The loading times have improved significantly since last month.',
    tag: { name: 'Positive Feedback', color: '#22C55E' },
    source: 'Mike R.',
    time: '6:22',
  },
  {
    id: 'h-9',
    content: 'Mobile app would be useful for checking metrics on the go.',
    tag: { name: 'Feature Request', color: '#A855F7' },
    source: 'Sarah M.',
    time: '18:10',
  },
];

function HighlightCard({ highlight }: { highlight: (typeof UNASSIGNED_HIGHLIGHTS)[0] }) {
  return (
    <div className="group cursor-grab rounded-lg border border-gray-700 bg-gray-800 p-3 transition-colors hover:border-gray-600 active:cursor-grabbing">
      <div className="mb-2 flex items-start justify-between">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${highlight.tag.color}20`,
            color: highlight.tag.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: highlight.tag.color }}
          />
          {highlight.tag.name}
        </span>
        <GripVertical className="h-4 w-4 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mb-2 line-clamp-2 text-sm text-gray-300">&quot;{highlight.content}&quot;</p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {highlight.source}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {highlight.time}
        </span>
      </div>
    </div>
  );
}

function ThemeColumn({
  theme,
  isUnassigned = false,
}: {
  theme?: (typeof DEMO_THEMES)[0];
  isUnassigned?: boolean;
}) {
  const highlights = isUnassigned ? UNASSIGNED_HIGHLIGHTS : theme?.highlights || [];
  const color = isUnassigned ? '#6B7280' : theme?.color || '#6B7280';
  const title = isUnassigned ? 'Unassigned' : theme?.name || '';

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="font-medium text-white">{title}</h3>
          <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {highlights.length}
          </span>
        </div>
        {theme?.description && <p className="mt-1 text-xs text-gray-500">{theme.description}</p>}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {highlights.map((highlight) => (
          <HighlightCard key={highlight.id} highlight={highlight} />
        ))}
      </div>
    </div>
  );
}

export default function InsightsMockupPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <span>Acme Research</span>
          <span>/</span>
          <span>Q4 Product Research</span>
          <span>/</span>
          <span className="text-white">Insights</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Insight Board</h1>
            <p className="mt-1 text-gray-400">Organize highlights into themes</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
        >
          <Sparkles className="h-4 w-4" />
          Magic Cluster
        </Button>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Theme
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned Column */}
        <ThemeColumn isUnassigned />

        {/* Theme Columns */}
        {DEMO_THEMES.map((theme) => (
          <ThemeColumn key={theme.id} theme={theme} />
        ))}

        {/* Add Theme Button */}
        <div className="flex w-72 flex-shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 p-4">
          <button className="flex items-center text-gray-400 transition-colors hover:text-white">
            <Plus className="mr-2 h-5 w-5" />
            Add Theme
          </button>
        </div>
      </div>
    </div>
  );
}
