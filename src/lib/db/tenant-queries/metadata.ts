import { withTenantSchema } from '../tenant';
import type {
  TenantMetadataField,
  TenantMetadataValue,
  MetadataFieldWithValue,
  MetadataEntityType,
  MetadataFieldType,
} from './types';
import { toCamelCase } from './utils';

// ============================================
// METADATA FIELD QUERIES
// ============================================

/**
 * List all metadata fields for a given entity type and parent.
 * For SOURCE fields: parentId = projectId
 * For PROJECT fields: parentId = workspaceId
 */
export async function listMetadataFields(
  schemaName: string,
  entityType: MetadataEntityType,
  parentId: string
): Promise<TenantMetadataField[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT * FROM metadata_fields
       WHERE entity_type = $1 AND parent_id = $2
       ORDER BY display_order ASC, created_at ASC`,
      [entityType, parentId]
    );
    return result.rows.map((row) => {
      const field = toCamelCase(row) as TenantMetadataField;
      // Ensure options is always an array (PostgreSQL returns text[])
      return {
        ...field,
        options: field.options || [],
      };
    });
  });
}

/**
 * Get a single metadata field by ID.
 */
export async function getMetadataFieldById(
  schemaName: string,
  fieldId: string
): Promise<TenantMetadataField | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM metadata_fields WHERE id = $1`, [fieldId]);
    if (result.rows.length === 0) return null;
    const field = toCamelCase(result.rows[0]) as TenantMetadataField;
    return {
      ...field,
      options: field.options || [],
    };
  });
}

/**
 * Get a metadata field by name within a parent scope.
 */
export async function getMetadataFieldByName(
  schemaName: string,
  entityType: MetadataEntityType,
  parentId: string,
  name: string
): Promise<TenantMetadataField | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT * FROM metadata_fields
       WHERE entity_type = $1 AND parent_id = $2 AND name = $3`,
      [entityType, parentId, name]
    );
    if (result.rows.length === 0) return null;
    const field = toCamelCase(result.rows[0]) as TenantMetadataField;
    return {
      ...field,
      options: field.options || [],
    };
  });
}

/**
 * Create a new metadata field.
 */
export async function createMetadataField(
  schemaName: string,
  data: {
    entityType: MetadataEntityType;
    parentId: string;
    name: string;
    label: string;
    fieldType: MetadataFieldType;
    options?: string[];
    required?: boolean;
    placeholder?: string | null;
    displayOrder?: number;
  }
): Promise<TenantMetadataField> {
  return withTenantSchema(schemaName, async (client) => {
    // Get max display_order for this parent to append at end if not specified
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxResult = await client.query(
        `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
         FROM metadata_fields
         WHERE entity_type = $1 AND parent_id = $2`,
        [data.entityType, data.parentId]
      );
      displayOrder = parseInt(maxResult.rows[0].next_order, 10);
    }

    const result = await client.query(
      `INSERT INTO metadata_fields (entity_type, parent_id, name, label, field_type, options, required, placeholder, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.entityType,
        data.parentId,
        data.name,
        data.label,
        data.fieldType,
        data.options || [],
        data.required ?? false,
        data.placeholder ?? null,
        displayOrder,
      ]
    );
    const field = toCamelCase(result.rows[0]) as TenantMetadataField;
    return {
      ...field,
      options: field.options || [],
    };
  });
}

/**
 * Update a metadata field.
 */
export async function updateMetadataField(
  schemaName: string,
  fieldId: string,
  data: Partial<{
    name: string;
    label: string;
    fieldType: MetadataFieldType;
    options: string[];
    required: boolean;
    placeholder: string | null;
    displayOrder: number;
  }>
): Promise<TenantMetadataField | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.label !== undefined) {
      setClauses.push(`label = $${paramIndex++}`);
      values.push(data.label);
    }
    if (data.fieldType !== undefined) {
      setClauses.push(`field_type = $${paramIndex++}`);
      values.push(data.fieldType);
    }
    if (data.options !== undefined) {
      setClauses.push(`options = $${paramIndex++}`);
      values.push(data.options);
    }
    if (data.required !== undefined) {
      setClauses.push(`required = $${paramIndex++}`);
      values.push(data.required);
    }
    if (data.placeholder !== undefined) {
      setClauses.push(`placeholder = $${paramIndex++}`);
      values.push(data.placeholder);
    }
    if (data.displayOrder !== undefined) {
      setClauses.push(`display_order = $${paramIndex++}`);
      values.push(data.displayOrder);
    }

    if (setClauses.length === 0) return null;

    values.push(fieldId);
    const result = await client.query(
      `UPDATE metadata_fields SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    const field = toCamelCase(result.rows[0]) as TenantMetadataField;
    return {
      ...field,
      options: field.options || [],
    };
  });
}

/**
 * Delete a metadata field (cascades to values).
 */
export async function deleteMetadataField(schemaName: string, fieldId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM metadata_fields WHERE id = $1`, [fieldId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

/**
 * Reorder metadata fields by updating display_order.
 * fieldIds should be in desired order.
 */
export async function reorderMetadataFields(
  schemaName: string,
  fieldIds: string[]
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    // Update each field's display_order based on position in array
    for (let i = 0; i < fieldIds.length; i++) {
      await client.query(`UPDATE metadata_fields SET display_order = $1 WHERE id = $2`, [
        i,
        fieldIds[i],
      ]);
    }
    return true;
  });
}

// ============================================
// METADATA VALUE QUERIES
// ============================================

/**
 * Get all metadata values for a specific entity.
 */
export async function getMetadataValues(
  schemaName: string,
  entityId: string
): Promise<TenantMetadataValue[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM metadata_values WHERE entity_id = $1`, [
      entityId,
    ]);
    return result.rows.map((row) => toCamelCase(row) as TenantMetadataValue);
  });
}

/**
 * Get metadata fields with their values for a specific entity.
 * Returns all fields defined for the parent, with values filled where they exist.
 */
export async function getMetadataWithFields(
  schemaName: string,
  entityType: MetadataEntityType,
  parentId: string,
  entityId: string
): Promise<MetadataFieldWithValue[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT f.*, v.value
       FROM metadata_fields f
       LEFT JOIN metadata_values v ON v.field_id = f.id AND v.entity_id = $3
       WHERE f.entity_type = $1 AND f.parent_id = $2
       ORDER BY f.display_order ASC, f.created_at ASC`,
      [entityType, parentId, entityId]
    );
    return result.rows.map((row) => {
      const field = toCamelCase(row) as MetadataFieldWithValue;
      return {
        ...field,
        options: field.options || [],
        value: field.value ?? null,
      };
    });
  });
}

/**
 * Upsert metadata values for an entity.
 * Accepts array of { fieldId, value } objects.
 */
export async function upsertMetadataValues(
  schemaName: string,
  entityId: string,
  values: Array<{ fieldId: string; value: string | null }>
): Promise<TenantMetadataValue[]> {
  return withTenantSchema(schemaName, async (client) => {
    const results: TenantMetadataValue[] = [];

    for (const { fieldId, value } of values) {
      const result = await client.query(
        `INSERT INTO metadata_values (field_id, entity_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (field_id, entity_id)
         DO UPDATE SET value = EXCLUDED.value
         RETURNING *`,
        [fieldId, entityId, value]
      );
      results.push(toCamelCase(result.rows[0]) as TenantMetadataValue);
    }

    return results;
  });
}

/**
 * Delete all metadata values for an entity.
 * Useful when deleting the entity itself.
 */
export async function deleteMetadataValuesForEntity(
  schemaName: string,
  entityId: string
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    await client.query(`DELETE FROM metadata_values WHERE entity_id = $1`, [entityId]);
    return true;
  });
}

// ============================================
// ACCESS VERIFICATION
// ============================================

/**
 * Verify that a metadata field belongs to the expected parent.
 */
export async function verifyMetadataFieldAccess(
  schemaName: string,
  fieldId: string,
  entityType: MetadataEntityType,
  parentId: string
): Promise<TenantMetadataField | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT * FROM metadata_fields
       WHERE id = $1 AND entity_type = $2 AND parent_id = $3`,
      [fieldId, entityType, parentId]
    );
    if (result.rows.length === 0) return null;
    const field = toCamelCase(result.rows[0]) as TenantMetadataField;
    return {
      ...field,
      options: field.options || [],
    };
  });
}
