import { QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from './connection';
import type { DataEntry } from '../types';

/**
 * Gets the names of all available datasets from the database.
 * @returns A promise resolving to an array of dataset names.
 */
export async function getAllDatasetNames(): Promise<string[]> {
    console.log('[getAllDatasetNames Service] Fetching all dataset names from DB...');
    const client = await getPool().connect(); // Ensures pool is initialized and attempts connection
    try {
        const result: QueryResult<{ name: string }> = await client.query('SELECT name FROM datasets ORDER BY name');
        const names = result.rows.map((row: { name: any; }) => row.name);
        console.log(`[getAllDatasetNames Service] Returning names: [${names.join(', ')}]`);
        return names;
    } catch (error: any) {
        console.error('[getAllDatasetNames Service] Error fetching dataset names:', error);
        throw new Error(`Failed to fetch dataset names from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Creates a new dataset entry in the database. If the dataset already exists, it does nothing.
 * Sets the newly created dataset as the active one.
 * Populates the dataset with the provided initial data.
 *
 * @param name The name for the new dataset.
 * @param initialData The initial array of DataEntry objects for the dataset.
 * @returns A promise resolving to true if creation/population was successful, false otherwise.
 */
export async function createOrReplaceDataset(name: string, initialData: DataEntry[]): Promise<boolean> {
    const trimmedName = name.trim();
    console.log(`[createOrReplaceDataset Service] Called for name: ${trimmedName}. Initial data count: ${initialData.length}`);
    if (!trimmedName) {
        console.error('[createOrReplaceDataset Service] Invalid dataset name provided.');
        return false;
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        // Create dataset entry (ignore if exists)
        await client.query('INSERT INTO datasets (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [trimmedName]);
        console.log(`[createOrReplaceDataset Service] Ensured dataset '${trimmedName}' exists.`);

        // Clear existing data and relationships for this dataset before adding new ones
        console.log(`[createOrReplaceDataset Service] Clearing existing data and relationships for dataset '${trimmedName}'...`);
        await client.query('DELETE FROM relationships WHERE dataset_name = $1', [trimmedName]);
        await client.query('DELETE FROM data_entries WHERE dataset_name = $1', [trimmedName]);
        console.log(`[createOrReplaceDataset Service] Existing entries and relationships cleared for '${trimmedName}'.`);


        // Insert new data entries in batches to optimize performance and stay within parameter limits
        const BATCH_SIZE = 1000;
        for (let i = 0; i < initialData.length; i += BATCH_SIZE) {
            const batch = initialData.slice(i, i + BATCH_SIZE);
            const values: any[] = [];
            const placeholders = batch.map((entryData, index) => {
                const entryId = entryData.id ? String(entryData.id) : uuidv4();
                const { id, ...dataToStore } = entryData;
                const dataJson = JSON.stringify(dataToStore);
                values.push(trimmedName, entryId, dataJson);
                return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
            }).join(', ');

            const query = `INSERT INTO data_entries (dataset_name, entry_id, data) VALUES ${placeholders}`;
            await client.query(query, values);
            console.log(`[createOrReplaceDataset Service] Added batch of ${batch.length} entries to dataset '${trimmedName}'.`);
        }

        await client.query('COMMIT');

        console.log(`[createOrReplaceDataset Service] Dataset '${trimmedName}' created/replaced.`);
        console.log(`[createOrReplaceDataset Service] Inserted ${initialData.length} new entries.`);
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[createOrReplaceDataset Service] Error creating/replacing dataset '${trimmedName}':`, error);
        return false;
    } finally {
        client.release();
    }
}
