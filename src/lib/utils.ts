import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the embedding column name based on dimension
 * OpenInsights uses a single 'embedding' column with dimensions configured at deployment time.
 * Changing embedding provider requires re-vectorizing all data.
 *
 * @param dimension - Embedding vector dimension (768 or 1536)
 * @returns Database column name for the embedding
 * @throws Error if dimension is not supported
 */
export function getEmbeddingColumnName(dimension: number): string {
  // Validate dimension is supported
  if (dimension !== 768 && dimension !== 1536) {
    throw new Error(`Unsupported embedding dimension: ${dimension}. Supported: 768, 1536`);
  }

  // Return the single embedding column name
  // The database column dimension is configured during setup-db.sh
  return 'embedding';
}
