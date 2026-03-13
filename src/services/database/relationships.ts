import { QueryResult } from 'pg';
import { getPool } from './connection';
import type { RelationshipEntry } from '../types';

/**
 * Asynchronously adds a relationship between two data entries in the *active* dataset in PostgreSQL.
 * Does nothing if the relationship already exists.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param sourceEntryId The ID of the source entry.
 * @param targetEntryId The ID of the target entry.
 * @returns A promise that resolves to the newly created or existing RelationshipEntry or null if source/target not found or self-reference.
 * @throws {Error} If the database operation fails or no dataset is active.
 */
export async function addRelationship(datasetName: string, sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    if (!datasetName) {
        console.error(`[addRelationship Service] Cannot add relationship, no dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
    console.log(`[addRelationship Service - Dataset: ${datasetName}] Called: Source ${sourceIdStr}, Target ${targetIdStr}`);

    if (sourceIdStr === targetIdStr) {
        console.warn(`[addRelationship Service - Dataset: ${datasetName}] Failed: Cannot add self-referencing relationship for ID ${sourceIdStr}.`);
        return null;
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        // Check if source and target entries exist in the active dataset
        const checkSource = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [datasetName, sourceIdStr]);
        const checkTarget = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [datasetName, targetIdStr]);

        if (checkSource.rowCount === 0) {
            console.warn(`[addRelationship Service - Dataset: ${datasetName}] Failed: Source ID ${sourceIdStr} not found.`);
            await client.query('ROLLBACK');
            return null;
        }
        if (checkTarget.rowCount === 0) {
            console.warn(`[addRelationship Service - Dataset: ${datasetName}] Failed: Target ID ${targetIdStr} not found.`);
            await client.query('ROLLBACK');
            return null;
        }

        // Insert the relationship, ignoring if it already exists
        const insertQuery = `
            INSERT INTO relationships (dataset_name, source_entry_id, target_entry_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (dataset_name, source_entry_id, target_entry_id) DO NOTHING
            RETURNING id, source_entry_id, target_entry_id, created_at;
        `;
        const insertResult = await client.query(insertQuery, [datasetName, sourceIdStr, targetIdStr]);

        let relationship: RelationshipEntry | null = null;
        if (insertResult.rowCount && insertResult.rowCount > 0) {
            relationship = insertResult.rows[0];
            console.log(`[addRelationship Service - Dataset: ${datasetName}] Successfully added relationship:`, relationship);
        } else {
            // Relationship already existed, fetch it
            console.log(`[addRelationship Service - Dataset: ${datasetName}] Relationship ${sourceIdStr} -> ${targetIdStr} already exists. Fetching...`);
             const selectResult = await client.query(
                 'SELECT id, source_entry_id, target_entry_id, created_at FROM relationships WHERE dataset_name = $1 AND source_entry_id = $2 AND target_entry_id = $3',
                 [datasetName, sourceIdStr, targetIdStr]
             );
             if (selectResult.rowCount && selectResult.rowCount > 0) {
                 relationship = selectResult.rows[0];
             } else {
                 // Should not happen if ON CONFLICT worked correctly, but handle defensively
                 console.error(`[addRelationship Service - Dataset: ${datasetName}] Could not find existing relationship ${sourceIdStr} -> ${targetIdStr} after ON CONFLICT.`);
             }
        }

        await client.query('COMMIT');
        return relationship;

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`[addRelationship Service - Dataset: ${datasetName}] Error adding relationship ${sourceIdStr} -> ${targetIdStr}:`, error);
        throw new Error(`Failed to add relationship ${sourceIdStr} -> ${targetIdStr} in database: ${error.message}`);
    } finally {
        client.release();
    }
}


/**
 * Asynchronously fetches all relationships originating from a specific source ID in the *active* dataset from PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param sourceEntryId The ID of the source entry.
 * @returns A promise resolving to an array of RelationshipEntry objects.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getRelationshipsBySourceId(datasetName: string, sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    if (!datasetName) {
        console.error(`[getRelationshipsBySourceId Service] No dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    const sourceIdStr = String(sourceEntryId);
    console.log(`[getRelationshipsBySourceId Service - Dataset: ${datasetName}] Called for source ID: ${sourceIdStr}`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT id, source_entry_id, target_entry_id, created_at
            FROM relationships
            WHERE dataset_name = $1 AND source_entry_id = $2
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<RelationshipEntry> = await client.query(query, [datasetName, sourceIdStr]);

        console.log(`[getRelationshipsBySourceId Service - Dataset: ${datasetName}] Found ${result.rowCount} relationships for source ${sourceIdStr}.`);
        return result.rows;
    } catch (error: any) {
        console.error(`[getRelationshipsBySourceId Service - Dataset: ${datasetName}] Error fetching relationships for source ID ${sourceIdStr}:`, error);
        throw new Error(`Failed to fetch relationships for ID ${sourceIdStr} from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches all relationships from the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @returns A promise resolving to an array of all RelationshipEntry objects in the active dataset.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllRelationships(datasetName: string): Promise<RelationshipEntry[]> {
    if (!datasetName) {
        console.error(`[getAllRelationships Service] No dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    console.log(`[getAllRelationships Service - Dataset: ${datasetName}] Called`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT id, source_entry_id, target_entry_id, created_at
            FROM relationships
            WHERE dataset_name = $1
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<RelationshipEntry> = await client.query(query, [datasetName]);

        console.log(`[getAllRelationships Service - Dataset: ${datasetName}] Returning ${result.rowCount} relationships.`);
        return result.rows;
    } catch (error: any) {
        console.error(`[getAllRelationships Service - Dataset: ${datasetName}] Error fetching all relationships:`, error);
        throw new Error(`Failed to fetch all relationships from database: ${error.message}`);
    } finally {
        client.release();
    }
}

// Consider adding functions for deleting entries and relationships if needed.
// export async function deleteDataById(id: number | string): Promise<boolean> { ... }
// export async function deleteRelationship(relationshipId: number): Promise<boolean> { ... }
// export async function deleteDataset(name: string): Promise<boolean> { ... }
