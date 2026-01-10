import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { APIError } from './auth';

/**
 * Centralized API error handler
 * Handles APIError instances and unknown errors consistently
 *
 * @param error - The error to handle
 * @param defaultMessage - Default error message for unknown errors
 * @returns NextResponse with appropriate status code and error message
 *
 * @example
 * ```ts
 * export async function DELETE(req: Request) {
 *   try {
 *     const { workspaceId } = await requireAuth();
 *     // ... route logic
 *   } catch (error) {
 *     return handleAPIError(error, 'Failed to delete resource');
 *   }
 * }
 * ```
 */
export function handleAPIError(error: unknown, defaultMessage = 'Internal server error') {
  const log = logger.child({ handler: 'error' });

  // Handle known APIError instances
  if (error instanceof APIError) {
    log.warn({ error: error.message, status: error.status }, 'API Error');
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    log.error({ error: error.message, stack: error.stack }, defaultMessage);
    return NextResponse.json({ error: defaultMessage }, { status: 500 });
  }

  // Handle unknown error types
  log.error({ error }, defaultMessage);
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
}
