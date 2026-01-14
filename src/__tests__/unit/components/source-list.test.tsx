import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { SourceList } from '@/components/sources/source-list';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/projects/test-project',
}));

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface MockSource {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: ProcessingStatus;
  duration: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  processingStep: string | null;
  processingProgress: number | null;
  processingStartedAt: string | null;
}

const createMockSource = (overrides: Partial<MockSource> = {}): MockSource => ({
  id: 'source-1',
  title: 'Test Source',
  fileName: 'test.mp4',
  fileType: 'video/mp4',
  status: 'PROCESSING',
  duration: null,
  thumbnailUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  processingStep: 'Transcribing...',
  processingProgress: 50,
  processingStartedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to wait for a specific time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SourceList - Processing Completion Notifications', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('should show success toast when source transitions from PROCESSING to COMPLETED', async () => {
    const processingSource = createMockSource({
      id: 'source-1',
      title: 'My Video',
      status: 'PROCESSING',
    });

    const completedSource = createMockSource({
      id: 'source-1',
      title: 'My Video',
      status: 'COMPLETED',
    });

    // First poll returns processing status, second returns completed
    let pollCount = 0;
    fetchMock.mockImplementation(() => {
      pollCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sources: pollCount === 1 ? [processingSource] : [completedSource],
          }),
      });
    });

    render(<SourceList projectId="test-project" initialSources={[processingSource]} />);

    // Wait for two poll cycles (3s each = 6s, plus buffer)
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
      { timeout: 8000 }
    );

    // After second poll, the status changed from PROCESSING to COMPLETED
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Source "My Video" processing complete!');
    });
  }, 15000);

  it('should show error toast when source transitions from PROCESSING to FAILED', async () => {
    const processingSource = createMockSource({
      id: 'source-2',
      title: 'Failed Video',
      status: 'PROCESSING',
    });

    const failedSource = createMockSource({
      id: 'source-2',
      title: 'Failed Video',
      status: 'FAILED',
    });

    let pollCount = 0;
    fetchMock.mockImplementation(() => {
      pollCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sources: pollCount === 1 ? [processingSource] : [failedSource],
          }),
      });
    });

    render(<SourceList projectId="test-project" initialSources={[processingSource]} />);

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
      { timeout: 8000 }
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Source "Failed Video" processing failed');
    });
  }, 15000);

  it('should NOT show toast on initial load with completed source', async () => {
    const completedSource = createMockSource({
      id: 'source-3',
      title: 'Already Completed',
      status: 'COMPLETED',
    });

    render(<SourceList projectId="test-project" initialSources={[completedSource]} />);

    // Wait a bit to ensure no polling happens (no PROCESSING/UPLOADING sources)
    await wait(500);

    // Should not show any toasts - no polling for completed sources
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    // No fetch calls since there are no processing sources
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should NOT show toast when status changes from UPLOADING to PROCESSING', async () => {
    const uploadingSource = createMockSource({
      id: 'source-4',
      title: 'Uploading Source',
      status: 'UPLOADING',
    });

    const processingSource = createMockSource({
      id: 'source-4',
      title: 'Uploading Source',
      status: 'PROCESSING',
    });

    let pollCount = 0;
    fetchMock.mockImplementation(() => {
      pollCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sources: pollCount === 1 ? [uploadingSource] : [processingSource],
          }),
      });
    });

    render(<SourceList projectId="test-project" initialSources={[uploadingSource]} />);

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
      { timeout: 8000 }
    );

    // Wait a bit more to ensure no toasts appear
    await wait(500);

    // No toast should be shown for UPLOADING -> PROCESSING
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  }, 15000);

  it('should handle multiple sources completing simultaneously', async () => {
    const sources = [
      createMockSource({ id: 'source-a', title: 'Video A', status: 'PROCESSING' }),
      createMockSource({ id: 'source-b', title: 'Video B', status: 'PROCESSING' }),
    ];

    const completedSources = [
      createMockSource({ id: 'source-a', title: 'Video A', status: 'COMPLETED' }),
      createMockSource({ id: 'source-b', title: 'Video B', status: 'COMPLETED' }),
    ];

    let pollCount = 0;
    fetchMock.mockImplementation(() => {
      pollCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            sources: pollCount === 1 ? sources : completedSources,
          }),
      });
    });

    render(<SourceList projectId="test-project" initialSources={sources} />);

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
      { timeout: 8000 }
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(2);
    });

    // Both toasts should be shown
    expect(toast.success).toHaveBeenCalledWith('Source "Video A" processing complete!');
    expect(toast.success).toHaveBeenCalledWith('Source "Video B" processing complete!');
  }, 15000);
});
