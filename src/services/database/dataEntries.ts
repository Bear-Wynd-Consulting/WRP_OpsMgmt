import { QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from './connection';
import type { DataEntry } from '../types';

/**
 * Asynchronously adds one or more data entries to the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param data The data entry or array of entries to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(datasetName: string, data: DataEntry | DataEntry[]): Promise<boolean> {
    if (!datasetName) {
        console.error('[addData Service] Cannot add data, no dataset name provided.');
        return false;
    }
    console.log(`[addData Service - Dataset: ${datasetName}] Called.`);

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const entriesToAdd = Array.isArray(data) ? data : [data];

        // Process entries in batches to optimize performance and stay within parameter limits
        const BATCH_SIZE = 1000;
        for (let i = 0; i < entriesToAdd.length; i += BATCH_SIZE) {
            const batch = entriesToAdd.slice(i, i + BATCH_SIZE);
            const values: any[] = [];
            const placeholders = batch.map((entry, index) => {
                const entryId = entry.id ? String(entry.id) : uuidv4();
                const { id, ...dataToStore } = entry;
                const dataJson = JSON.stringify(dataToStore);
                values.push(datasetName, entryId, dataJson);
                return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
            }).join(', ');

            // Use ON CONFLICT to handle potential duplicate entry_id within the same dataset
            // This effectively makes addData behave like an upsert based on entry_id
            const query = `
                INSERT INTO data_entries (dataset_name, entry_id, data)
                VALUES ${placeholders}
                ON CONFLICT (dataset_name, entry_id)
                DO UPDATE SET data = EXCLUDED.data;
            `;
            await client.query(query, values);
            console.log(`[addData Service - Dataset: ${datasetName}] Added/Updated batch of ${batch.length} entries.`);
        }

        await client.query('COMMIT');
        console.log(`[addData Service - Dataset: ${datasetName}] Successfully added/updated ${entriesToAdd.length} entries.`);
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[addData Service - Dataset: ${datasetName}] Error adding data:`, error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches all data entries from the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @returns A promise that resolves to an array of DataEntry objects.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllData(datasetName: string): Promise<DataEntry[]> {
    if (!datasetName) {
        console.error('[getAllData Service] No dataset name provided.');
        throw new Error('No dataset name provided.');
    }
    console.log(`[getAllData Service - Dataset: ${datasetName}] Called.`);
    const client = await getPool().connect();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 ORDER BY created_at DESC',
            [datasetName]
        );

        // Combine entry_id back into the data object
        const entries = result.rows.map((row: { entry_id: any; data: any; }) => ({
            id: row.entry_id, // Use entry_id as the 'id' field
            ...row.data        // Spread the JSONB data
        }));

        console.log(`[getAllData Service - Dataset: ${datasetName}] Returning ${entries.length} entries.`);
        return entries;
    } catch (error: any) {
        console.error(`[getAllData Service - Dataset: ${datasetName}] Error fetching data:`, error);
        throw new Error(`Failed to fetch data from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches a single data entry by its ID from the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param id The entry_id of the data entry to fetch.
 * @returns A promise that resolves to the DataEntry object or null if not found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataById(datasetName: string, id: number | string): Promise<DataEntry | null> {
    if (!datasetName) {
        console.error(`[getDataById Service] No dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    const searchId = String(id);
    console.log(`[getDataById Service - Dataset: ${datasetName}] Called for ID: ${searchId}`);

    const client = await getPool().connect();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 AND entry_id = $2',
            [datasetName, searchId]
        );

        if (result.rowCount === 0) {
            console.warn(`[getDataById Service - Dataset: ${datasetName}] Entry not found for ID ${searchId}.`);
            return null;
        }

        const row = result.rows[0];
        const entry = {
            id: row.entry_id,
            ...row.data
        };
        console.log(`[getDataById Service - Dataset: ${datasetName}] Found entry for ID ${searchId}.`);
        return entry;

    } catch (error: any) {
        console.error(`[getDataById Service - Dataset: ${datasetName}] Error fetching data for ID ${searchId}:`, error);
        throw new Error(`Failed to fetch data for ID ${searchId} from database: ${error.message}`);
    } finally {
        client.release();
    }
}


/**
 * Asynchronously fetches multiple data entries by their IDs from the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param ids An array of entry_ids of the data entries to fetch.
 * @returns A promise that resolves to an array of DataEntry objects found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataByIds(datasetName: string, ids: (number | string)[]): Promise<DataEntry[]> {
    if (!datasetName) {
        console.error(`[getDataByIds Service] No dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    const searchIds = ids.map(String);
    if (searchIds.length === 0) {
        return []; // Return empty array if no IDs are provided
    }
    console.log(`[getDataByIds Service - Dataset: ${datasetName}] Called for IDs: [${searchIds.join(', ')}]`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT entry_id, data
            FROM data_entries
            WHERE dataset_name = $1 AND entry_id = ANY($2::text[])
        `;
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(query, [datasetName, searchIds]);

        const entries = result.rows.map(row => ({
            id: row.entry_id,
            ...row.data
        }));

        console.log(`[getDataByIds Service - Dataset: ${datasetName}] Found ${entries.length} entries for IDs [${searchIds.join(', ')}].`);
        return entries;
    } catch (error: any) {
        console.error(`[getDataByIds Service - Dataset: ${datasetName}] Error fetching data for IDs [${searchIds.join(', ')}]:`, error);
        throw new Error(`Failed to fetch multiple data entries from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously updates a data entry by its ID in the *active* dataset in PostgreSQL.
 *
 * @param datasetName The name of the dataset to operate on.
 * @param id The entry_id of the data entry to update.
 * @param updatedData The partial or full data object. The 'id' field within this object is ignored.
 * @returns A promise that resolves to true if the update was successful (row found and updated), false otherwise.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function updateDataById(datasetName: string, id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    if (!datasetName) {
        console.error(`[updateDataById Service] Cannot update data, no dataset name provided.`);
        throw new Error('No dataset name provided.');
    }
    const updateId = String(id);
    // Remove 'id' property from the data to be stored/merged in JSONB
    const { id: ignoredId, ...dataToUpdate } = updatedData;
    const dataJson = JSON.stringify(dataToUpdate);

    console.log(`[updateDataById Service - Dataset: ${datasetName}] Called for ID: ${updateId}`);

    const client = await getPool().connect();
    try {
        // We update the entire JSONB column with the new data.
        // For merging/partial updates, JSONB operators could be used, but replacing is simpler here.
        const query = `
            UPDATE data_entries
            SET data = $3
            WHERE dataset_name = $1 AND entry_id = $2
        `;
        const result = await client.query(query, [datasetName, updateId, dataJson]);

        if (result.rowCount === 0) {
            console.warn(`[updateDataById Service - Dataset: ${datasetName}] Entry not found for update (ID: ${updateId}).`);
            return false;
        }

        console.log(`[updateDataById Service - Dataset: ${datasetName}] Successfully updated entry ID ${updateId}.`);
        return true;
    } catch (error: any) {
        console.error(`[updateDataById Service - Dataset: ${datasetName}] Error updating data for ID ${updateId}:`, error);
        throw new Error(`Failed to update data for ID ${updateId} in database: ${error.message}`);
    } finally {
        client.release();
    }
}
