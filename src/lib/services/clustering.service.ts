/**
 * Clustering Service
 *
 * Implements k-means clustering with cosine distance for grouping
 * semantically similar highlights based on their segment embeddings.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'clustering' });

// ============================================================================
// Types
// ============================================================================

export interface ClusteringOptions {
  minClusters?: number;
  maxClusters?: number;
}

export interface Cluster {
  centroid: number[];
  highlightIds: string[];
  representativeContent: string[];
}

export interface ClusterResult {
  clusters: Cluster[];
  silhouetteScore: number;
}

interface HighlightWithEmbedding {
  highlightId: string;
  content: string;
  embedding: number[];
}

// ============================================================================
// Vector Math (Cosine Distance - matches pgvector)
// ============================================================================

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

function addVectors(a: number[], b: number[]): number[] {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}

function scaleVector(v: number[], scalar: number): number[] {
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] * scalar;
  }
  return result;
}

function normalizeVector(v: number[]): number[] {
  const mag = magnitude(v);
  if (mag === 0) return v;
  return scaleVector(v, 1 / mag);
}

// ============================================================================
// K-Means++ Initialization
// ============================================================================

function kMeansPlusPlusInit(embeddings: number[][], k: number): number[][] {
  const n = embeddings.length;
  const centroids: number[][] = [];

  // First centroid: random
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...embeddings[firstIdx]]);

  // Remaining centroids: weighted by distance squared
  for (let c = 1; c < k; c++) {
    const distances: number[] = [];
    let totalDist = 0;

    for (let i = 0; i < n; i++) {
      // Find min distance to any existing centroid
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = cosineDistance(embeddings[i], centroid);
        if (dist < minDist) minDist = dist;
      }
      distances.push(minDist * minDist); // Square for weighting
      totalDist += minDist * minDist;
    }

    // Weighted random selection
    let target = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < n; i++) {
      target -= distances[i];
      if (target <= 0) {
        selectedIdx = i;
        break;
      }
    }

    centroids.push([...embeddings[selectedIdx]]);
  }

  return centroids;
}

// ============================================================================
// K-Means Algorithm
// ============================================================================

interface KMeansResult {
  labels: number[];
  centroids: number[][];
  iterations: number;
}

function kMeans(embeddings: number[][], k: number, maxIterations: number = 100): KMeansResult {
  const n = embeddings.length;
  if (n === 0 || k <= 0) {
    return { labels: [], centroids: [], iterations: 0 };
  }

  // Clamp k to data size
  k = Math.min(k, n);

  // Initialize centroids with k-means++
  let centroids = kMeansPlusPlusInit(embeddings, k);
  let labels = new Array(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;

    // Assignment step: assign each point to nearest centroid
    const newLabels = new Array(n);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let minLabel = 0;
      for (let c = 0; c < k; c++) {
        const dist = cosineDistance(embeddings[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minLabel = c;
        }
      }
      newLabels[i] = minLabel;
    }

    // Check convergence
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (newLabels[i] !== labels[i]) {
        changed = true;
        break;
      }
    }

    labels = newLabels;

    if (!changed) break;

    // Update step: recalculate centroids
    const dims = embeddings[0].length;
    const newCentroids: number[][] = [];
    const counts: number[] = new Array(k).fill(0);

    for (let c = 0; c < k; c++) {
      newCentroids.push(new Array(dims).fill(0));
    }

    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      newCentroids[c] = addVectors(newCentroids[c], embeddings[i]);
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        newCentroids[c] = scaleVector(newCentroids[c], 1 / counts[c]);
        // Normalize for cosine distance
        newCentroids[c] = normalizeVector(newCentroids[c]);
      }
    }

    centroids = newCentroids;
  }

  return { labels, centroids, iterations };
}

// ============================================================================
// Silhouette Score (Cluster Quality Metric)
// ============================================================================

function silhouetteScore(embeddings: number[][], labels: number[]): number {
  const n = embeddings.length;
  if (n < 2) return 0;

  const uniqueLabels = [...new Set(labels)];
  if (uniqueLabels.length < 2) return 0;

  let totalScore = 0;

  for (let i = 0; i < n; i++) {
    const cluster = labels[i];

    // a(i): mean distance to other points in same cluster
    let aSum = 0;
    let aCount = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j && labels[j] === cluster) {
        aSum += cosineDistance(embeddings[i], embeddings[j]);
        aCount++;
      }
    }
    const a = aCount > 0 ? aSum / aCount : 0;

    // b(i): min mean distance to points in other clusters
    let b = Infinity;
    for (const otherCluster of uniqueLabels) {
      if (otherCluster === cluster) continue;

      let bSum = 0;
      let bCount = 0;
      for (let j = 0; j < n; j++) {
        if (labels[j] === otherCluster) {
          bSum += cosineDistance(embeddings[i], embeddings[j]);
          bCount++;
        }
      }
      if (bCount > 0) {
        const meanDist = bSum / bCount;
        if (meanDist < b) b = meanDist;
      }
    }

    // Silhouette coefficient for point i
    const s = b === Infinity ? 0 : (b - a) / Math.max(a, b);
    totalScore += s;
  }

  return totalScore / n;
}

// ============================================================================
// Find Optimal K
// ============================================================================

function findOptimalK(embeddings: number[][], minK: number, maxK: number): number {
  const n = embeddings.length;

  // Clamp to valid range
  minK = Math.max(2, Math.min(minK, n));
  maxK = Math.max(minK, Math.min(maxK, n));

  let bestK = minK;
  let bestScore = -1;

  for (let k = minK; k <= maxK; k++) {
    const { labels } = kMeans(embeddings, k);
    const score = silhouetteScore(embeddings, labels);

    log.debug({ k, score }, 'Evaluated k');

    if (score > bestScore) {
      bestScore = score;
      bestK = k;
    }
  }

  log.info({ bestK, bestScore }, 'Found optimal k');
  return bestK;
}

// ============================================================================
// Parse pgvector String
// ============================================================================

function parseVectorString(vectorStr: string): number[] {
  // pgvector returns vectors as "[0.1,0.2,0.3,...]"
  const cleaned = vectorStr.replace(/[\[\]]/g, '');
  return cleaned.split(',').map((s) => parseFloat(s.trim()));
}

// ============================================================================
// Fetch Unassigned Highlights with Embeddings
// ============================================================================

async function fetchUnassignedHighlightsWithEmbeddings(
  projectId: string
): Promise<HighlightWithEmbedding[]> {
  // Determine which embedding column to use based on what's populated
  // Try 1536 first (OpenAI), then 768 (Gemini/Ollama)
  const sampleCheck = await prisma.$queryRaw<Array<{ has_1536: boolean; has_768: boolean }>>`
    SELECT
      EXISTS(SELECT 1 FROM transcript_segments ts
             JOIN sources s ON ts.source_id = s.id
             WHERE s.project_id = ${projectId} AND ts.embedding_1536 IS NOT NULL) as has_1536,
      EXISTS(SELECT 1 FROM transcript_segments ts
             JOIN sources s ON ts.source_id = s.id
             WHERE s.project_id = ${projectId} AND ts.embedding_768 IS NOT NULL) as has_768
  `;

  const embeddingColumn = sampleCheck[0]?.has_1536
    ? 'embedding_1536'
    : sampleCheck[0]?.has_768
      ? 'embedding_768'
      : null;

  if (!embeddingColumn) {
    throw new Error('No embeddings found for this project');
  }

  log.debug({ embeddingColumn }, 'Using embedding column');

  // Fetch unassigned highlights with their segment embeddings
  // A highlight is "unassigned" if it has no entries in highlight_themes
  const highlights = await prisma.$queryRawUnsafe<
    Array<{
      highlight_id: string;
      content: string;
      embedding: string;
    }>
  >(
    `
    SELECT
      h.id as highlight_id,
      ts.content,
      ts.${embeddingColumn}::text as embedding
    FROM highlights h
    JOIN transcript_segments ts ON h.segment_id = ts.id
    JOIN sources s ON ts.source_id = s.id
    WHERE s.project_id = $1
      AND ts.${embeddingColumn} IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM highlight_themes ht WHERE ht.highlight_id = h.id
      )
    `,
    projectId
  );

  return highlights.map((h) => ({
    highlightId: h.highlight_id,
    content: h.content,
    embedding: parseVectorString(h.embedding),
  }));
}

// ============================================================================
// Main Clustering Function
// ============================================================================

export async function clusterUnassignedHighlights(
  projectId: string,
  options: ClusteringOptions = {}
): Promise<ClusterResult> {
  const { minClusters = 3, maxClusters = 7 } = options;

  log.info({ projectId, minClusters, maxClusters }, 'Starting clustering');

  // Fetch highlights with embeddings
  const highlights = await fetchUnassignedHighlightsWithEmbeddings(projectId);

  if (highlights.length < 3) {
    throw new Error(
      `Need at least 3 unassigned highlights for clustering, found ${highlights.length}`
    );
  }

  log.info({ highlightCount: highlights.length }, 'Fetched highlights');

  // Extract embeddings
  const embeddings = highlights.map((h) => h.embedding);

  // Find optimal k
  const optimalK = findOptimalK(
    embeddings,
    Math.min(minClusters, highlights.length),
    Math.min(maxClusters, highlights.length)
  );

  // Run k-means with optimal k
  const { labels, centroids, iterations } = kMeans(embeddings, optimalK);

  log.info({ optimalK, iterations }, 'Completed k-means');

  // Calculate final silhouette score
  const score = silhouetteScore(embeddings, labels);

  // Group highlights by cluster
  const clusterMap = new Map<number, HighlightWithEmbedding[]>();
  for (let i = 0; i < highlights.length; i++) {
    const label = labels[i];
    if (!clusterMap.has(label)) {
      clusterMap.set(label, []);
    }
    clusterMap.get(label)!.push(highlights[i]);
  }

  // Build cluster results
  const clusters: Cluster[] = [];
  for (const [label, clusterHighlights] of clusterMap) {
    // Get representative content (up to 5 highlights for LLM prompt)
    const representativeContent = clusterHighlights.slice(0, 5).map((h) => h.content);

    clusters.push({
      centroid: centroids[label],
      highlightIds: clusterHighlights.map((h) => h.highlightId),
      representativeContent,
    });
  }

  log.info(
    {
      clusterCount: clusters.length,
      silhouetteScore: score,
      highlightDistribution: clusters.map((c) => c.highlightIds.length),
    },
    'Clustering complete'
  );

  return {
    clusters,
    silhouetteScore: score,
  };
}
