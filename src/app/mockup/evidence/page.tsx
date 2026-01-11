'use client';

import { useState } from 'react';
import { Search, Grid3X3, List, Clock, MessageSquare } from 'lucide-react';

/**
 * Evidence Mockup Page
 *
 * Static mockup of the Evidence Dashboard for screenshots.
 * Uses hardcoded demo data - no database required.
 */

const DEMO_TAGS = [
  { id: 't-1', name: 'Pain Point', color: '#EF4444', count: 12 },
  { id: 't-2', name: 'Feature Request', color: '#A855F7', count: 8 },
  { id: 't-3', name: 'Positive Feedback', color: '#22C55E', count: 15 },
  { id: 't-4', name: 'Usability Issue', color: '#F59E0B', count: 6 },
  { id: 't-5', name: 'Competitor Mention', color: '#06B6D4', count: 4 },
];

const DEMO_HIGHLIGHTS = [
  {
    id: 'h-1',
    content:
      'The export functionality is buried too deep. I had to click through three menus just to download a simple CSV file.',
    tag: { id: 't-1', name: 'Pain Point', color: '#EF4444' },
    source: { id: 's-1', title: 'User Interview - Sarah M.' },
    time: '2:34',
    speaker: 'Sarah',
  },
  {
    id: 'h-2',
    content:
      "I'd love to see real-time collaboration features. Right now we have to export and share files manually with the team.",
    tag: { id: 't-2', name: 'Feature Request', color: '#A855F7' },
    source: { id: 's-2', title: 'User Interview - John D.' },
    time: '5:12',
    speaker: 'John',
  },
  {
    id: 'h-3',
    content:
      "The new dashboard layout is so much cleaner. I can finally find what I'm looking for without hunting through menus.",
    tag: { id: 't-3', name: 'Positive Feedback', color: '#22C55E' },
    source: { id: 's-1', title: 'User Interview - Sarah M.' },
    time: '8:45',
    speaker: 'Sarah',
  },
  {
    id: 'h-4',
    content:
      "When I try to filter by date range, the calendar picker doesn't show which dates have data. It's frustrating to select empty ranges.",
    tag: { id: 't-4', name: 'Usability Issue', color: '#F59E0B' },
    source: { id: 's-3', title: 'User Interview - Mike R.' },
    time: '3:21',
    speaker: 'Mike',
  },
  {
    id: 'h-5',
    content:
      'We switched from Mixpanel because your pricing is more transparent. No surprise overage charges.',
    tag: { id: 't-5', name: 'Competitor Mention', color: '#06B6D4' },
    source: { id: 's-2', title: 'User Interview - John D.' },
    time: '12:08',
    speaker: 'John',
  },
  {
    id: 'h-6',
    content:
      'PDF export with charts would be a game changer. I spend hours recreating visualizations in slides for stakeholder presentations.',
    tag: { id: 't-2', name: 'Feature Request', color: '#A855F7' },
    source: { id: 's-1', title: 'User Interview - Sarah M.' },
    time: '15:33',
    speaker: 'Sarah',
  },
];

export default function EvidenceMockupPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>(['t-1', 't-2']);
  const [searchQuery, setSearchQuery] = useState('export functionality');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <span>Acme Research</span>
          <span>/</span>
          <span>Q4 Product Research</span>
          <span>/</span>
          <span className="text-white">Evidence</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Evidence Dashboard</h1>
            <p className="mt-1 text-gray-400">45 highlights across 5 sources</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Sidebar - Search & Filters */}
        <div className="col-span-3">
          <div className="sticky top-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            {/* Semantic Search */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Semantic Search
              </label>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by meaning..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Find clips by meaning, not just keywords</p>
            </div>

            {/* Tag Filters */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Filter by Tags</label>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {DEMO_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                    <span className="text-xs text-gray-500">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area - Results */}
        <div className="col-span-9 space-y-6">
          {/* View Switcher */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Showing 6 results for &quot;{searchQuery}&quot;</p>
            <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 p-1">
              <button
                onClick={() => setView('grid')}
                className={`rounded-md p-1.5 ${
                  view === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`rounded-md p-1.5 ${
                  view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            {DEMO_HIGHLIGHTS.map((highlight) => (
              <div
                key={highlight.id}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
              >
                {/* Tag */}
                <div className="mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${highlight.tag.color}20`,
                      color: highlight.tag.color,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: highlight.tag.color }}
                    />
                    {highlight.tag.name}
                  </span>
                </div>

                {/* Content */}
                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-300">
                  &quot;{highlight.content}&quot;
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {highlight.speaker}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {highlight.time}
                    </span>
                  </div>
                  <span className="truncate text-gray-600">{highlight.source.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
