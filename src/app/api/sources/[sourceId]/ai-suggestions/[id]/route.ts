import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { updateAISuggestion } from '@/lib/db/tenant-queries/ai-suggestions';
import { updateAISuggestionSchema } from '@/lib/validations';

/**
 * PATCH /api/sources/[sourceId]/ai-suggestions/[id]
 *
 * Updates an AI suggestion (note, selectedText, tagNames) before approval.
 * This allows users to edit suggestions while they're still pending.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; id: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, id } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateAISuggestionSchema.parse(body);

    // Update suggestion
    const updatedSuggestion = await updateAISuggestion(schemaName, id, validatedData);

    if (!updatedSuggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found or no fields to update' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSuggestion, { status: 200 });
  } catch (error) {
    return handleAPIError(error, 'Failed to update AI suggestion');
  }
}
