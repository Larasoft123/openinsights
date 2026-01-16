/**
 * Workflow Progress List Component
 *
 * Displays processing workflow steps as a minimal text-based to-do list.
 * Design: No icons, no colors, simple text symbols for status.
 */

'use client';

import { formatTimeWithOptions } from '@/lib/utils/time';
import type { WorkflowStep } from '@/lib/utils/workflow-steps';

interface WorkflowProgressListProps {
  steps: WorkflowStep[];
  /** Elapsed time in seconds for transcription step */
  elapsedTime?: number;
  /** Video duration for time estimate */
  duration?: number | null;
  /** Saved transcription duration when step completed (for showing in completed state) */
  transcriptionDuration?: number | null;
  /** Compact mode for list view - shows single line summary */
  compact?: boolean;
}

/**
 * Full workflow list for grid view overlay
 */
function FullWorkflowList({
  steps,
  elapsedTime,
  duration,
  transcriptionDuration,
}: {
  steps: WorkflowStep[];
  elapsedTime?: number;
  duration?: number | null;
  transcriptionDuration?: number | null;
}) {
  return (
    <div className="w-full space-y-0.5 font-mono text-xs">
      {steps.map((step) => {
        // Determine prefix symbol
        let prefix = '  '; // pending - 2 spaces for alignment
        if (step.status === 'completed') prefix = '✓ ';
        if (step.status === 'in_progress') prefix = '• ';
        if (step.status === 'skipped') prefix = '- ';

        // Determine suffix (progress info)
        let suffix = '';
        if (step.status === 'completed') {
          // Show transcription duration for completed transcription step
          if (step.name === 'transcription' && transcriptionDuration) {
            const durationStr = formatTimeWithOptions(transcriptionDuration, { shortFormat: true });
            suffix = ` (${durationStr})`;
          }
        } else if (step.status === 'in_progress') {
          // Special handling for transcription - show elapsed time
          if (step.showElapsedTime && elapsedTime !== undefined) {
            const elapsed = formatTimeWithOptions(elapsedTime, { shortFormat: true });
            if (duration) {
              const estimatedRemaining = Math.max(0, duration * 2 - elapsedTime);
              const remaining = formatTimeWithOptions(estimatedRemaining, { shortFormat: true });
              suffix = ` (${elapsed} / ~${remaining})`;
            } else {
              suffix = ` (${elapsed})`;
            }
          } else if (step.progress !== undefined) {
            suffix = ` (${step.progress}%)`;
          }
        }

        return (
          <div
            key={step.name}
            className={`${step.status === 'pending' ? 'text-white/50' : 'text-white/90'}`}
          >
            {prefix}
            {step.label}
            {suffix}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact single-line summary for list view
 */
function CompactWorkflowSummary({
  steps,
  elapsedTime,
  duration,
  transcriptionDuration,
}: {
  steps: WorkflowStep[];
  elapsedTime?: number;
  duration?: number | null;
  transcriptionDuration?: number | null;
}) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const inProgressStep = steps.find((s) => s.status === 'in_progress');
  const totalCount = steps.length;

  // If all steps are completed, show completion message
  if (!inProgressStep) {
    return (
      <span className="text-gray-400">
        Completed! — {completedCount} of {totalCount} steps
        {transcriptionDuration &&
          ` (transcription: ${formatTimeWithOptions(transcriptionDuration, { shortFormat: true })})`}
      </span>
    );
  }

  // Build progress info
  let progressInfo = '';
  if (inProgressStep.showElapsedTime && elapsedTime !== undefined) {
    const elapsed = formatTimeWithOptions(elapsedTime, { shortFormat: true });
    if (duration) {
      const estimatedRemaining = Math.max(0, duration * 2 - elapsedTime);
      const remaining = formatTimeWithOptions(estimatedRemaining, { shortFormat: true });
      progressInfo = `${elapsed} / ~${remaining}`;
    } else {
      progressInfo = elapsed;
    }
  } else if (inProgressStep.progress !== undefined) {
    progressInfo = `${inProgressStep.progress}%`;
  }

  return (
    <span className="text-gray-400">
      {inProgressStep.label}
      {progressInfo && ` (${progressInfo})`}
      {' — '}
      {completedCount} of {totalCount} steps
    </span>
  );
}

export function WorkflowProgressList({
  steps,
  elapsedTime,
  duration,
  transcriptionDuration,
  compact = false,
}: WorkflowProgressListProps) {
  if (compact) {
    return (
      <CompactWorkflowSummary
        steps={steps}
        elapsedTime={elapsedTime}
        duration={duration}
        transcriptionDuration={transcriptionDuration}
      />
    );
  }

  return (
    <FullWorkflowList
      steps={steps}
      elapsedTime={elapsedTime}
      duration={duration}
      transcriptionDuration={transcriptionDuration}
    />
  );
}
