import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import {
  AIProvider,
  TranscriptionInput,
  TranscriptionResult,
  EmbeddingResult,
  TranscriptSegment,
} from '../types';
import { logger } from '../../logger';

const TRANSCRIPTION_MODEL = 'gemini-3-flash-preview';
const EMBEDDING_MODEL = 'text-embedding-004';

// Prompt for video/audio transcription with timestamps
const TRANSCRIPTION_PROMPT = `You are a transcription assistant. Transcribe the audio from this media file.

Output ONLY valid JSON in this exact format:
{
  "segments": [
    {
      "startTime": 0.0,
      "endTime": 5.5,
      "content": "The transcribed text here",
      "speakerId": "speaker_1"
    }
  ],
  "duration": 120.5,
  "language": "en"
}

Rules:
- Segment the transcript naturally by sentence or phrase
- Include accurate timestamps in seconds
- Identify different speakers if present (speaker_1, speaker_2, etc.)
- If you cannot determine speakers, omit the speakerId field
- Be accurate with the transcription
- Output ONLY the JSON, no markdown code blocks or other text`;

export interface GeminiProviderOptions {
  apiKey?: string | null;
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private log = logger.child({ provider: 'gemini' });

  /**
   * @param options - Optional overrides from workspace settings
   *        apiKey: Workspace API key (falls back to env var)
   */
  constructor(options?: GeminiProviderOptions) {
    // Priority for API key: workspace config > env var
    const apiKey = options?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please configure it in Settings or set GOOGLE_GENERATIVE_AI_API_KEY environment variable.'
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  supportsVideoInput(): boolean {
    return true; // Gemini can process video directly
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    this.log.info(
      { sourceId: input.sourceId, fileType: input.fileType },
      'Starting Gemini transcription'
    );

    try {
      const model = this.client.getGenerativeModel({ model: TRANSCRIPTION_MODEL });

      // Fetch the media file
      const response = await fetch(input.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      const mediaBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(mediaBuffer).toString('base64');

      // Determine MIME type
      const mimeType = input.fileType === 'video' ? 'video/mp4' : 'audio/wav';

      // Create multimodal content
      const mediaPart: Part = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart: Part = {
        text: TRANSCRIPTION_PROMPT,
      };

      // Generate transcription
      const result = await model.generateContent([mediaPart, textPart]);
      const responseText = result.response.text();

      // Parse JSON response
      const parsed = this.parseTranscriptionResponse(responseText);

      this.log.info(
        { sourceId: input.sourceId, segmentCount: parsed.segments.length },
        'Transcription complete'
      );

      return parsed;
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'Transcription failed');
      throw error;
    }
  }

  private parseTranscriptionResponse(responseText: string): TranscriptionResult {
    // Clean up potential markdown formatting
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    // Fix malformed timestamps like "1.0.128" -> convert to seconds
    // Gemini sometimes outputs timestamps as minutes.seconds.ms format
    jsonText = jsonText.replace(
      /"(startTime|endTime)":\s*(\d+)\.(\d+)\.(\d+)/g,
      (_, key, mins, secs, ms) => {
        const totalSeconds = Number(mins) * 60 + Number(secs) + Number(ms) / 1000;
        return `"${key}": ${totalSeconds.toFixed(3)}`;
      }
    );

    try {
      const rawParsed = JSON.parse(jsonText) as
        | { segments: TranscriptSegment[]; duration?: number; language?: string }
        | Array<{ segments: TranscriptSegment[]; duration?: number; language?: string }>;

      // Handle array wrapper (sometimes Gemini wraps response in array)
      const parsed = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed;

      // Validate structure
      if (!parsed || !Array.isArray(parsed.segments)) {
        throw new Error('Invalid response: segments must be an array');
      }

      // Filter out placeholder/duplicate segments
      const filteredSegments = parsed.segments.filter(
        (seg: TranscriptSegment) =>
          seg.content &&
          seg.content !== 'The transcribed text here' &&
          typeof seg.startTime === 'number' &&
          typeof seg.endTime === 'number'
      );

      return {
        segments: filteredSegments.map((seg: TranscriptSegment) => ({
          startTime: Number(seg.startTime) || 0,
          endTime: Number(seg.endTime) || 0,
          content: String(seg.content || '').trim(),
          speakerId: seg.speakerId ? String(seg.speakerId) : undefined,
        })),
        duration: Number(parsed.duration) || 0,
        language: parsed.language,
      };
    } catch (error) {
      this.log.error({ responseText, error }, 'Failed to parse transcription response');
      throw new Error('Failed to parse Gemini transcription response');
    }
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: EMBEDDING_MODEL, dimensions: 768 };
    }

    this.log.info({ textCount: texts.length }, 'Generating embeddings');

    try {
      const model = this.client.getGenerativeModel({ model: EMBEDDING_MODEL });

      // Gemini embeds one text at a time
      const embeddings: number[][] = [];

      for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
      }

      this.log.info({ textCount: texts.length }, 'Embeddings generated');

      return {
        embeddings,
        model: EMBEDDING_MODEL,
        dimensions: embeddings[0]?.length || 768,
      };
    } catch (error) {
      this.log.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }
}
