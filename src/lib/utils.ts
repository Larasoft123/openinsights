import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the embedding column name based on dimension
 * Maps provider dimensions to specific database columns
 * @param dimension - Embedding vector dimension (768 or 1536)
 * @returns Database column name for the embedding
 * @throws Error if dimension is not supported
 */
export function getEmbeddingColumnName(dimension: number): string {
  switch (dimension) {
    case 768:
      return 'embedding_768';
    case 1536:
      return 'embedding_1536';
    default:
      throw new Error(`Unsupported embedding dimension: ${dimension}. Supported: 768, 1536`);
  }
}
