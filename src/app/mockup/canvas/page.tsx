'use client';

import { useRef } from 'react';
import { SpeakerNamesProvider } from '@/components/analysis-canvas/transcript/speaker-names-context';
import { SourceHeader } from '@/components/sources/detail/source-header';
import { TranscriptPanel } from '@/components/analysis-canvas/transcript';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

/**
 * Canvas Mockup Page
 *
 * Static mockup of the Analysis Canvas for screenshots.
 * Uses hardcoded demo data - no database required.
 */

// Demo transcript segments
const DEMO_SEGMENTS = [
  {
    id: 'seg-1',
    content:
      "Welcome everyone to today's user interview session. I'm really excited to hear your thoughts about the new dashboard design we've been working on.",
    startTime: 0,
    endTime: 8.5,
    speakerId: 'speaker-1',
    highlights: [{ id: 'h-1', tag: { id: 't-1', name: 'Introduction', color: '#3B82F6' } }],
  },
  {
    id: 'seg-2',
    content:
      "Thanks for having me! I've been using the product for about six months now, so I'm happy to share my experience.",
    startTime: 8.5,
    endTime: 14.2,
    speakerId: 'speaker-2',
    highlights: [],
  },
  {
    id: 'seg-3',
    content:
      "Perfect. Let's start with your first impressions of the new layout. What stood out to you when you first logged in?",
    startTime: 14.2,
    endTime: 21.0,
    speakerId: 'speaker-1',
    highlights: [],
  },
  {
    id: 'seg-4',
    content:
      'The first thing I noticed was how much cleaner everything looked. The sidebar is much more intuitive now. I could find the analytics section immediately, which used to take me forever.',
    startTime: 21.0,
    endTime: 32.5,
    speakerId: 'speaker-2',
    highlights: [
      { id: 'h-2', tag: { id: 't-2', name: 'Pain Point', color: '#EF4444' } },
      { id: 'h-3', tag: { id: 't-3', name: 'Positive Feedback', color: '#22C55E' } },
    ],
  },
  {
    id: 'seg-5',
    content:
      "That's great to hear! The navigation was one of our main focuses. Were there any specific features that felt easier to access?",
    startTime: 32.5,
    endTime: 40.0,
    speakerId: 'speaker-1',
    highlights: [],
  },
  {
    id: 'seg-6',
    content:
      "Definitely the export functionality. Before, I had to click through three or four menus. Now it's right there in the header. I actually use it daily for my reports.",
    startTime: 40.0,
    endTime: 52.0,
    speakerId: 'speaker-2',
    highlights: [
      { id: 'h-4', tag: { id: 't-3', name: 'Positive Feedback', color: '#22C55E' } },
      { id: 'h-5', tag: { id: 't-4', name: 'Feature Request', color: '#A855F7' } },
    ],
  },
  {
    id: 'seg-7',
    content:
      "Speaking of reports, how do you typically use the data you export? We're trying to understand the workflow better.",
    startTime: 52.0,
    endTime: 60.0,
    speakerId: 'speaker-1',
    highlights: [],
  },
  {
    id: 'seg-8',
    content:
      "I pull weekly metrics for my team standup and monthly reports for stakeholders. The CSV format works well, but I'd love to see PDF export with charts included. That would save me so much time in presentations.",
    startTime: 60.0,
    endTime: 75.5,
    speakerId: 'speaker-2',
    highlights: [{ id: 'h-6', tag: { id: 't-4', name: 'Feature Request', color: '#A855F7' } }],
  },
  {
    id: 'seg-9',
    content:
      "That's really valuable feedback. We've actually been discussing PDF exports. How often would you use something like that?",
    startTime: 75.5,
    endTime: 84.0,
    speakerId: 'speaker-1',
    highlights: [],
  },
  {
    id: 'seg-10',
    content:
      "Probably twice a week at least. Right now I screenshot charts and paste them into slides manually. It's tedious.",
    startTime: 84.0,
    endTime: 92.0,
    speakerId: 'speaker-2',
    highlights: [{ id: 'h-7', tag: { id: 't-2', name: 'Pain Point', color: '#EF4444' } }],
  },
];

const DEMO_TAGS = [
  { id: 't-1', name: 'Introduction', color: '#3B82F6' },
  { id: 't-2', name: 'Pain Point', color: '#EF4444' },
  { id: 't-3', name: 'Positive Feedback', color: '#22C55E' },
  { id: 't-4', name: 'Feature Request', color: '#A855F7' },
];

export default function CanvasMockupPage() {
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  return (
    <SpeakerNamesProvider projectId="demo-project">
      <div className="flex h-screen flex-col space-y-8 bg-gray-950 px-8 pb-8">
        {/* Source Header */}
        <div className="shrink-0">
          <SourceHeader
            sourceId="demo-source"
            sourceTitle="User Interview - Dashboard Redesign"
            projectId="demo-project"
            projectName="Q4 Product Research"
            workspaceName="Acme Research"
            duration={185}
            segmentsCount={DEMO_SEGMENTS.length}
            highlightsCount={7}
            createdAt={new Date('2024-01-15')}
          />
        </div>

        {/* Main content - 2 column resizable layout */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full gap-8">
            {/* Left panel - Video Player Mockup */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-gray-800 bg-gray-900 p-4">
                {/* Video Player Placeholder */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-800">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
                        <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-400">User Interview Recording</p>
                      <p className="text-xs text-gray-500">3:05 duration</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute right-0 bottom-0 left-0 p-4">
                    <div className="h-1 w-full rounded-full bg-gray-700">
                      <div className="h-1 w-1/3 rounded-full bg-blue-500" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span>1:02</span>
                      <span>3:05</span>
                    </div>
                  </div>
                </div>

                {/* Tags section */}
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                    Tags in this source
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_TAGS.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right panel - Transcript */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div
                ref={transcriptContainerRef}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
              >
                <TranscriptPanel
                  segments={DEMO_SEGMENTS}
                  sourceId="demo-source"
                  onEditSegment={() => {}}
                  onDeleteSegment={() => {}}
                  onAddSegment={() => {}}
                  onSpeakerChanged={() => {}}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </SpeakerNamesProvider>
  );
}
