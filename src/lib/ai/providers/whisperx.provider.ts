import { AIProvider, TranscriptionInput, TranscriptionResult, EmbeddingResult } from '../types';
import { logger } from '../../logger';

// WhisperX ASR API response types
interface WhisperXSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface WhisperXResponse {
  text: WhisperXSegment[];
  language?: string;
}

const DEFAULT_WHISPERX_MODEL = 'large-v3';

export interface WhisperXProviderOptions {
  endpoint?: string | null;
  transcriptionModel?: string | null;
}

/**
 * WhisperX provider for self-hosted speech-to-text transcription.
 *
 * Compatible with whisperx-asr-service API (https://github.com/murtaza-nasir/whisperx-asr-service)
 *
 * Features:
 * - Fully local/private transcription (no data leaves your infrastructure)
 * - Speaker diarization via pyannote-audio
 * - Word-level timestamps
 * - GPU-accelerated (requires NVIDIA GPU for best performance)
 *
 * NOTE: This provider only supports transcription. Use OpenAI, Gemini, or Ollama
 * for embeddings and text generation.
 */
export class WhisperXProvider implements AIProvider {
  readonly name = 'whisperx';
  private endpoint: string;
  private transcriptionModel: string;
  private log = logger.child({ provider: 'whisperx' });

  constructor(options?: WhisperXProviderOptions) {
    const endpoint = options?.endpoint || process.env.WHISPERX_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        'WhisperX endpoint is required. Please configure it in Settings or set WHISPERX_ENDPOINT environment variable (e.g., http://localhost:9000).'
      );
    }

    // Normalize endpoint URL (remove trailing slash)
    this.endpoint = endpoint.replace(/\/$/, '');
    this.transcriptionModel = options?.transcriptionModel || DEFAULT_WHISPERX_MODEL;
    this.log.info(
      { endpoint: this.endpoint, model: this.transcriptionModel },
      'WhisperX provider initialized'
    );
  }

  supportsVideoInput(): boolean {
    return false; // WhisperX requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error('WhisperX transcription does not support video input. Extract audio first.');
    }

    this.log.info(
      { sourceId: input.sourceId, endpoint: this.endpoint },
      'Starting WhisperX transcription'
    );

    try {
      // First, fetch the audio file from the presigned URL
      const audioResponse = await fetch(input.fileUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

      // Create form data for WhisperX API
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.mp3');
      formData.append('task', 'transcribe');
      formData.append('output_format', 'json');
      formData.append('word_timestamps', 'true');
      formData.append('diarize', 'true');
      formData.append('model', this.transcriptionModel);

      // Send to WhisperX API
      const response = await fetch(`${this.endpoint}/asr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhisperX API error (${response.status}): ${errorText}`);
      }

      const result: WhisperXResponse = await response.json();

      // Process segments with speaker info
      const textSegments = result.text || [];
      const segments = textSegments.map((segment) => ({
        startTime: segment.start,
        endTime: segment.end,
        content: segment.text.trim(),
        speakerId: segment.speaker || undefined,
      }));

      // Calculate duration from last segment
      const duration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;

      this.log.info(
        {
          sourceId: input.sourceId,
          segmentCount: segments.length,
          duration,
          language: result.language,
        },
        'WhisperX transcription complete'
      );

      return {
        segments,
        duration,
        language: result.language,
      };
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'WhisperX transcription failed');
      throw error;
    }
  }

  async embed(_texts: string[]): Promise<EmbeddingResult> {
    throw new Error(
      'WhisperX does not support embeddings. Use OpenAI, Gemini, or Ollama for embedding generation.'
    );
  }

  // WhisperX does not support text generation
  // generateText is intentionally not implemented
}
