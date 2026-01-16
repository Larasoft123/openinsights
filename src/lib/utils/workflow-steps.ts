/**
 * Workflow Steps Utility
 *
 * Derives workflow step status from source processing fields.
 * Used by WorkflowProgressList component to display processing progress.
 */

export type WorkflowStepStatus = 'completed' | 'in_progress' | 'pending' | 'skipped';

export interface WorkflowStep {
  name: string;
  label: string;
  status: WorkflowStepStatus;
  progress?: number;
  /** For transcription step - show elapsed time instead of percentage */
  showElapsedTime?: boolean;
}

export interface SourceWorkflowData {
  status: string;
  processingStep: string | null;
  processingProgress: number | null;
  fileType: string;
  summaryStatus: string | null;
}

/**
 * Determine workflow step status based on current processing state
 */
function getStepStatus(
  stepName: string,
  currentStep: string | null,
  sourceStatus: string,
  summaryStatus: string | null
): WorkflowStepStatus {
  // Step order: extracting -> transcribing -> vectorizing -> (completed) -> summary
  const stepOrder = ['extracting', 'transcribing', 'vectorizing'];
  const currentIndex = currentStep ? stepOrder.indexOf(currentStep) : -1;
  const stepIndex = stepOrder.indexOf(stepName);

  // Special handling for summary step
  if (stepName === 'summary') {
    if (sourceStatus === 'COMPLETED') {
      if (summaryStatus === 'GENERATING') return 'in_progress';
      if (summaryStatus === 'COMPLETED') return 'completed';
      // PENDING or null - still pending
      return 'pending';
    }
    return 'pending';
  }

  // If source is COMPLETED, all processing steps are done
  if (sourceStatus === 'COMPLETED') {
    return 'completed';
  }

  // If source is FAILED, mark current step as in_progress (to show where it failed)
  if (sourceStatus === 'FAILED') {
    if (currentStep === stepName) return 'in_progress';
    if (currentIndex === -1) {
      // No step set - failed early, mark first step
      return stepIndex === 0 ? 'in_progress' : 'pending';
    }
    return stepIndex < currentIndex ? 'completed' : 'pending';
  }

  // If no current step, we're in early processing (upload complete, waiting for first step)
  if (currentIndex === -1) {
    return stepIndex === 0 ? 'pending' : 'pending';
  }

  // Compare step positions
  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'in_progress';
  } else {
    return 'pending';
  }
}

/**
 * Get workflow steps for a source based on its current state
 */
export function getWorkflowSteps(source: SourceWorkflowData): WorkflowStep[] {
  const { status, processingStep, processingProgress, fileType, summaryStatus } = source;
  const isVideo = fileType.startsWith('video/');

  const steps: WorkflowStep[] = [];

  // Step 1: Upload - always completed if we're past PENDING/UPLOADING
  const uploadComplete = status !== 'PENDING' && status !== 'UPLOADING';
  steps.push({
    name: 'upload',
    label: 'Upload',
    status: uploadComplete ? 'completed' : status === 'UPLOADING' ? 'in_progress' : 'pending',
    progress: uploadComplete ? 100 : undefined,
  });

  // Step 2: Audio Extraction (video files only)
  if (isVideo) {
    const extractionStatus = getStepStatus('extracting', processingStep, status, summaryStatus);
    steps.push({
      name: 'extraction',
      label: 'Audio Extraction',
      status: extractionStatus,
      progress:
        extractionStatus === 'in_progress'
          ? (processingProgress ?? 0)
          : extractionStatus === 'completed'
            ? 100
            : undefined,
    });
  }

  // Step 3: Transcription
  const transcriptionStatus = getStepStatus('transcribing', processingStep, status, summaryStatus);
  steps.push({
    name: 'transcription',
    label: 'Transcription',
    status: transcriptionStatus,
    showElapsedTime: transcriptionStatus === 'in_progress',
    progress:
      transcriptionStatus === 'in_progress'
        ? (processingProgress ?? 0)
        : transcriptionStatus === 'completed'
          ? 100
          : undefined,
  });

  // Step 4: Embedding (vectorization)
  const embeddingStatus = getStepStatus('vectorizing', processingStep, status, summaryStatus);
  steps.push({
    name: 'embedding',
    label: 'Embedding',
    status: embeddingStatus,
    progress:
      embeddingStatus === 'in_progress'
        ? (processingProgress ?? 0)
        : embeddingStatus === 'completed'
          ? 100
          : undefined,
  });

  // Step 5: Summary
  const summaryStepStatus = getStepStatus('summary', processingStep, status, summaryStatus);
  steps.push({
    name: 'summary',
    label: 'Summary',
    status: summaryStepStatus,
    progress: summaryStepStatus === 'completed' ? 100 : undefined,
  });

  return steps;
}

/**
 * Get a compact summary of workflow progress
 * Returns: "Transcription (45%) - 2 of 5 steps"
 */
export function getWorkflowSummary(steps: WorkflowStep[]): {
  currentStepLabel: string;
  currentProgress?: number;
  completedCount: number;
  totalCount: number;
} {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const inProgressStep = steps.find((s) => s.status === 'in_progress');
  const totalCount = steps.length;

  return {
    currentStepLabel: inProgressStep?.label ?? 'Processing',
    currentProgress: inProgressStep?.progress,
    completedCount,
    totalCount,
  };
}
