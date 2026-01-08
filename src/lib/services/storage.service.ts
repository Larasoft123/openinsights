import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { logger } from '../logger';

// Configuration from environment
const config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.S3_ACCESS_KEY || 'openinsights',
  secretKey: process.env.S3_SECRET_KEY || 'openinsights_dev',
  bucket: process.env.S3_BUCKET || 'openinsights',
  region: process.env.S3_REGION || 'us-east-1',
};

// S3 client instance (singleton)
const s3Client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
  forcePathStyle: true, // Required for MinIO
});

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
}

/**
 * Upload a file to S3/MinIO using multipart upload for large files
 */
export async function uploadFile(
  key: string,
  body: Buffer | Readable,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const log = logger.child({ operation: 'uploadFile', key });

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        Metadata: options.metadata,
      },
      queueSize: 4, // Concurrent parts
      partSize: 5 * 1024 * 1024, // 5MB parts
    });

    upload.on('httpUploadProgress', (progress) => {
      log.debug({ loaded: progress.loaded, total: progress.total }, 'Upload progress');
    });

    await upload.done();

    log.info('File uploaded successfully');

    return {
      key,
      bucket: config.bucket,
      url: `${config.endpoint}/${config.bucket}/${key}`,
    };
  } catch (error) {
    log.error({ error }, 'Failed to upload file');
    throw error;
  }
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Download a file from S3/MinIO
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const log = logger.child({ operation: 'downloadFile', key });

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const stream = response.Body as Readable;

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    log.info('File downloaded successfully');
    return Buffer.concat(chunks);
  } catch (error) {
    log.error({ error }, 'Failed to download file');
    throw error;
  }
}

/**
 * Download a file as a readable stream
 */
export async function downloadFileStream(key: string): Promise<Readable> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Empty response body');
  }

  return response.Body as Readable;
}

/**
 * Delete a file from S3/MinIO
 */
export async function deleteFile(key: string): Promise<void> {
  const log = logger.child({ operation: 'deleteFile', key });

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    await s3Client.send(command);
    log.info('File deleted successfully');
  } catch (error) {
    log.error({ error }, 'Failed to delete file');
    throw error;
  }
}

/**
 * Check if a file exists in S3/MinIO
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files with a given prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map((item) => item.Key).filter((key): key is string => !!key);
}

/**
 * Generate storage key for a source file
 */
export function getSourceKey(sourceId: string, fileName: string): string {
  return `sources/${sourceId}/${fileName}`;
}

/**
 * Generate storage key for extracted audio
 */
export function getAudioKey(sourceId: string): string {
  return `sources/${sourceId}/audio.wav`;
}

// Export client for advanced usage
export { s3Client, config as storageConfig };
