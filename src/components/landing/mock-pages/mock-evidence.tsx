'use client';

import { Search, Sparkles, Grid, List, Tag as TagIcon, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function MockEvidencePage() {
  const mockTags = [
    { id: '1', name: 'Pain Point', color: '#EF4444' },
    { id: '2', name: 'Feature Request', color: '#3B82F6' },
    { id: '3', name: 'Positive Feedback', color: '#22C55E' },
    { id: '4', name: 'Workflow Issue', color: '#F97316' },
    { id: '5', name: 'Integration Need', color: '#8B5CF6' },
  ];

  const mockHighlights = [
    {
      id: '1',
      tag: mockTags[0],
      content:
        'The current process is way too manual. We spend hours every week just organizing feedback from different sources.',
      sourceTitle: 'Interview #12 - Sarah',
      startTime: 342,
      createdAt: new Date('2024-12-10T15:30:00Z'),
    },
    {
      id: '2',
      tag: mockTags[1],
      content:
        'I wish there was better guidance during the onboarding process. The first time I used it, I was completely lost.',
      sourceTitle: 'Onboarding Session #5',
      startTime: 189,
      createdAt: new Date('2024-12-10T14:00:00Z'),
    },
    {
      id: '3',
      tag: mockTags[2],
      content:
        'The semantic search feature is amazing! It finds exactly what I need without having to remember specific keywords.',
      sourceTitle: 'Feature Validation #8',
      startTime: 456,
      createdAt: new Date('2024-12-10T11:00:00Z'),
    },
    {
      id: '4',
      tag: mockTags[3],
      content:
        'The biggest issue is finding patterns across multiple interviews. Everything is scattered across different tools.',
      sourceTitle: 'Interview #9 - Michael',
      startTime: 267,
      createdAt: new Date('2024-12-09T16:00:00Z'),
    },
    {
      id: '5',
      tag: mockTags[4],
      content:
        'We need better integration with our CRM system. Right now we have to manually copy data between tools.',
      sourceTitle: 'Interview #15 - Jessica',
      startTime: 523,
      createdAt: new Date('2024-12-08T16:00:00Z'),
    },
    {
      id: '6',
      tag: mockTags[0],
      content:
        'Export functionality is very limited. We need more control over what data gets exported and in what format.',
      sourceTitle: 'Feature Validation #3',
      startTime: 412,
      createdAt: new Date('2024-12-07T16:00:00Z'),
    },
  ];

  return (
    <div className="flex flex-col gap-8 xl:grid xl:grid-cols-12 xl:gap-8">
      {/* Left Sidebar - Search & Filters */}
      <div className="xl:col-span-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Search Evidence</h3>

          {/* Semantic Search */}
          <div className="mb-6">
            <div className="relative">
              <Sparkles className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                placeholder="Semantic search..."
                className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              AI-powered search finds meaning, not just keywords
            </p>
          </div>

          {/* Tag Filters */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-400">Filter by Tag</h4>
            <div className="space-y-2">
              {mockTags.map((tag) => (
                <button
                  key={tag.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-800"
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-left text-sm text-gray-300">{tag.name}</span>
                  <span className="text-xs text-gray-500">
                    {mockHighlights.filter((h) => h.tag.id === tag.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <button className="mt-6 w-full rounded-lg border border-gray-800 bg-gray-950 py-2 text-sm text-gray-400 transition-colors hover:border-gray-700 hover:text-white">
            Clear all filters
          </button>
        </div>
      </div>

      {/* Right Main Area - Results */}
      <div className="space-y-6 xl:col-span-9">
        {/* Header with View Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              {mockHighlights.length} highlights across all sources
            </p>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
            <button className="rounded-md bg-blue-500/10 p-2 text-blue-400">
              <Grid size={16} />
            </button>
            <button className="rounded-md p-2 text-gray-400 transition-colors hover:text-white">
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {mockHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className="group rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all hover:border-gray-700 hover:bg-gray-800"
            >
              {/* Tag */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${highlight.tag.color}20`,
                    color: highlight.tag.color,
                  }}
                >
                  <TagIcon size={12} />
                  {highlight.tag.name}
                </div>
              </div>

              {/* Content */}
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-300">
                {highlight.content}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Play size={12} />
                  <span>{highlight.sourceTitle}</span>
                  <span>•</span>
                  <span>
                    {Math.floor(highlight.startTime / 60)}:
                    {(highlight.startTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <span>{formatDistanceToNow(highlight.createdAt, { addSuffix: true })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
