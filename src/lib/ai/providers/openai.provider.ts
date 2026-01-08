import OpenAI from 'openai';
import { AIProvider, TranscriptionInput, TranscriptionResult, EmbeddingResult } from '../types';
import { logger } from '../../logger';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const WHISPER_MODEL = 'whisper-1';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private log = logger.child({ provider: 'openai' });

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider');
    }

    this.client = new OpenAI({ apiKey });
  }

  supportsVideoInput(): boolean {
    return false; // Whisper requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error('OpenAI Whisper does not support video input. Extract audio first.');
    }

    this.log.info({ sourceId: input.sourceId }, 'Starting Whisper transcription');

    try {
      // Fetch audio file from URL
      const response = await fetch(input.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();

      // Create a File-like object for the API
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      // Call Whisper API with verbose JSON for timestamps
      const result = await this.client.audio.transcriptions.create({
        model: WHISPER_MODEL,
        file: audioFile,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Parse segments from response
      const segments = (result.segments || []).map((seg) => ({
        startTime: seg.start,
        endTime: seg.end,
        content: seg.text.trim(),
        speakerId: undefined, // Whisper doesn't provide speaker diarization
      }));

      this.log.info(
        { sourceId: input.sourceId, segmentCount: segments.length },
        'Transcription complete'
      );

      return {
        segments,
        duration: result.duration || 0,
        language: result.language,
      };
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'Transcription failed');
      throw error;
    }
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS };
    }

    this.log.info({ textCount: texts.length }, 'Generating embeddings');

    try {
      const result = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const embeddings = result.data.map((item) => item.embedding);

      this.log.info({ textCount: texts.length }, 'Embeddings generated');

      return {
        embeddings,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      };
    } catch (error) {
      this.log.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }
}
