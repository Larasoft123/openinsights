'use client';

import { Plus, Sparkles, Download, Tag as TagIcon } from 'lucide-react';

export function MockInsightsPage() {
  const mockThemes = [
    {
      id: '1',
      name: 'Manual Workflows',
      description: 'Pain points related to manual, repetitive processes',
      color: '#EF4444',
      highlights: [
        {
          id: '1',
          tag: { name: 'Pain Point', color: '#EF4444' },
          content: 'The current process is way too manual. We spend hours organizing feedback...',
          source: 'Interview #12',
        },
        {
          id: '2',
          tag: { name: 'Workflow Issue', color: '#F97316' },
          content: 'Finding patterns across multiple interviews is the biggest challenge...',
          source: 'Interview #9',
        },
      ],
    },
    {
      id: '2',
      name: 'Onboarding Friction',
      description: 'First-time user experience challenges',
      color: '#3B82F6',
      highlights: [
        {
          id: '3',
          tag: { name: 'Feature Request', color: '#3B82F6' },
          content:
            'Better guidance during onboarding would help a lot. First time users feel lost...',
          source: 'Onboarding #5',
        },
      ],
    },
    {
      id: '3',
      name: 'Feature Wins',
      description: 'Features users love and want more of',
      color: '#22C55E',
      highlights: [
        {
          id: '4',
          tag: { name: 'Positive Feedback', color: '#22C55E' },
          content: 'The semantic search feature is amazing! Finds exactly what I need...',
          source: 'Validation #8',
        },
      ],
    },
  ];

  const unassignedHighlights = [
    {
      id: '5',
      tag: { name: 'Integration Need', color: '#8B5CF6' },
      content: 'We need better CRM integration. Manual data copying is tedious...',
      source: 'Interview #15',
    },
    {
      id: '6',
      tag: { name: 'Feature Request', color: '#3B82F6' },
      content: 'Export functionality needs more options and flexibility...',
      source: 'Validation #3',
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header with Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Insights</h1>
          <p className="mt-1 text-sm text-gray-400">
            Organize highlights into themes to surface key insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-700 hover:text-white">
            <Download size={16} />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/20">
            <Sparkles size={16} />
            Magic Cluster
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600">
            <Plus size={16} />
            New Theme
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full gap-4">
          {/* Unassigned Column */}
          <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-400">Unassigned</h3>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                {unassignedHighlights.length}
              </span>
            </div>

            <div className="space-y-3">
              {unassignedHighlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="cursor-move rounded-lg border border-gray-800 bg-gray-950 p-3 transition-all hover:border-gray-700 hover:bg-gray-900"
                >
                  <div
                    className="mb-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${highlight.tag.color}20`,
                      color: highlight.tag.color,
                      width: 'fit-content',
                    }}
                  >
                    <TagIcon size={10} />
                    {highlight.tag.name}
                  </div>
                  <p className="mb-2 line-clamp-3 text-sm leading-relaxed text-gray-300">
                    {highlight.content}
                  </p>
                  <p className="text-xs text-gray-500">{highlight.source}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Theme Columns */}
          {mockThemes.map((theme) => (
            <div
              key={theme.id}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-800 p-4"
              style={{ backgroundColor: `${theme.color}05`, borderColor: `${theme.color}40` }}
            >
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-semibold text-white">{theme.name}</h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
                  >
                    {theme.highlights.length}
                  </span>
                </div>
                {theme.description && <p className="text-xs text-gray-500">{theme.description}</p>}
              </div>

              <div className="space-y-3">
                {theme.highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="cursor-move rounded-lg border border-gray-800 bg-gray-950 p-3 transition-all hover:border-gray-700 hover:bg-gray-900"
                  >
                    <div
                      className="mb-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${highlight.tag.color}20`,
                        color: highlight.tag.color,
                        width: 'fit-content',
                      }}
                    >
                      <TagIcon size={10} />
                      {highlight.tag.name}
                    </div>
                    <p className="mb-2 line-clamp-3 text-sm leading-relaxed text-gray-300">
                      {highlight.content}
                    </p>
                    <p className="text-xs text-gray-500">{highlight.source}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add Theme Button */}
          <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border-2 border-dashed border-gray-700 p-4">
            <button className="flex h-full items-center justify-center text-gray-400 transition-colors hover:text-white">
              <Plus className="mr-2 h-5 w-5" />
              Add Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
