import type { CamelCaseObject } from './types';

/**
 * Convert snake_case object keys to camelCase.
 * Used to transform SQL results to JS-friendly format.
 */
export function toCamelCase<T extends Record<string, unknown>>(obj: T): CamelCaseObject<T> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as CamelCaseObject<T>;
}

/**
 * Convert array of snake_case objects to camelCase.
 */
export function rowsToCamelCase<T extends Record<string, unknown>>(
  rows: T[]
): CamelCaseObject<T>[] {
  return rows.map(toCamelCase);
}
