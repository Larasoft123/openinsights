'use client';

import { useState } from 'react';
import { FileText, Tag, Lightbulb, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import type { SharedProjectData } from '@/lib/services/share.service';

interface SharedProjectViewProps {
  project: SharedProjectData;
  includeEvidence: boolean;
  includeInsights: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SharedProjectView({
  project,
  includeEvidence,
  includeInsights,
}: SharedProjectViewProps) {
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());

  const toggleTheme = (themeId: string) => {
    setExpandedThemes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(themeId)) {
        newSet.delete(themeId);
      } else {
        newSet.add(themeId);
      }
      return newSet;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 text-sm text-gray-500">Shared Research Project</div>
        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
        {project.description && <p className="mt-2 text-gray-400">{project.description}</p>}

        {/* Stats */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
            <FileText size={16} className="text-blue-400" />
            <span className="text-sm text-gray-300">
              {project.sources.length} source{project.sources.length !== 1 ? 's' : ''}
            </span>
          </div>
          {includeEvidence && project.tags && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
              <Tag size={16} className="text-green-400" />
              <span className="text-sm text-gray-300">
                {project.tags.reduce((sum, t) => sum + t._count.highlights, 0)} highlights
              </span>
            </div>
          )}
          {includeInsights && project.themes && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
              <Lightbulb size={16} className="text-yellow-400" />
              <span className="text-sm text-gray-300">
                {project.themes.length} theme{project.themes.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Sources Overview */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-white">Sources</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h3 className="truncate font-medium text-white">{source.title}</h3>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDuration(source.duration)}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    source.status === 'COMPLETED'
                      ? 'bg-green-900/50 text-green-400'
                      : source.status === 'PROCESSING'
                        ? 'bg-yellow-900/50 text-yellow-400'
                        : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {source.status.toLowerCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence Hub */}
      {includeEvidence && project.highlights && project.highlights.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Evidence Hub</h2>
          <div className="space-y-4">
            {project.highlights.map((highlight) => (
              <div key={highlight.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white">
                      {highlight.selectedText || highlight.segment.content}
                    </p>
                    {highlight.note && (
                      <p className="mt-2 text-sm text-gray-400 italic">Note: {highlight.note}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <span>{highlight.segment.source.title}</span>
                      <span>|</span>
                      <span>
                        {formatTimestamp(highlight.segment.startTime)} -{' '}
                        {formatTimestamp(highlight.segment.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span
                      className="rounded px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${highlight.tag.color}20`,
                        color: highlight.tag.color,
                      }}
                    >
                      {highlight.tag.name}
                    </span>
                    {highlight.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {highlight.themes.map(({ theme }) => (
                          <span
                            key={theme.id}
                            className="rounded px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: `${theme.color}20`,
                              color: theme.color,
                            }}
                          >
                            {theme.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Insights Board */}
      {includeInsights && project.themes && project.themes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Insights Board</h2>
          <div className="space-y-4">
            {project.themes.map((theme) => (
              <div
                key={theme.id}
                className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
              >
                <button
                  onClick={() => toggleTheme(theme.id)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: theme.color }} />
                    <div>
                      <h3 className="font-medium text-white">{theme.name}</h3>
                      {theme.description && (
                        <p className="text-sm text-gray-400">{theme.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {theme.highlights.length} highlight
                      {theme.highlights.length !== 1 ? 's' : ''}
                    </span>
                    {expandedThemes.has(theme.id) ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedThemes.has(theme.id) && theme.highlights.length > 0 && (
                  <div className="space-y-3 border-t border-gray-800 p-4">
                    {theme.highlights.map(({ highlight }) => (
                      <div key={highlight.id} className="rounded-lg bg-gray-800/50 p-3">
                        <p className="text-sm text-white">
                          {highlight.selectedText || highlight.segment.content}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span
                            className="rounded px-1.5 py-0.5"
                            style={{
                              backgroundColor: `${highlight.tag.color}20`,
                              color: highlight.tag.color,
                            }}
                          >
                            {highlight.tag.name}
                          </span>
                          <span>|</span>
                          <span>{highlight.segment.source.title}</span>
                          <span>|</span>
                          <span>{formatTimestamp(highlight.segment.startTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
