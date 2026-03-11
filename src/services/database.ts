import { Pool, QueryResult } from 'pg';
import type { DataEntry, RelationshipEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

// ========================================================================
// ==                       PostgreSQL Implementation                    ==
// ========================================================================
// This service now connects to a PostgreSQL database.
// Ensure your environment variables are set correctly in .env
// Check the README.md for troubleshooting database connection errors.
// ========================================================================


// --- Connection Pool ---
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const host = process.env.POSTGRES_HOST || 'localhost';
        const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
        const user = process.env.POSTGRES_USER;
        const password = process.env.POSTGRES_PASSWORD; // Keep confidential
        const database = process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB;

        const connectionString = `postgres://${user}:[MASKED]@${host}:${port}/${database}`; // For logging

        if (!user || !password || !database) {
             console.error("[Database Service] ERROR: Missing required PostgreSQL environment variables (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE or POSTGRES_DB).");
             console.error(`[Database Service] Current Config: host=${host}, port=${port}, user=${user ? user : 'MISSING'}, database=${database ? database : 'MISSING'}, password=${password ? '[SET]' : 'MISSING'}`);
             throw new Error("Missing required PostgreSQL environment variables. Check your .env file.");
        }

        console.log(`[Database Service] Creating PostgreSQL connection pool with config: { host: ${host}, port: ${port}, user: ${user}, database: ${database}, password: [MASKED] }`);

        pool = new Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database,
            max: 10, // Max number of clients in the pool
            idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
            connectionTimeoutMillis: 5000, // Increased timeout for slower connections
        });

        pool.on('error', (err, client) => {
            console.error('[Database Service] PostgreSQL Pool Error: Unexpected error on idle client.', err);
            // Consider more robust error handling if needed
        });

        pool.on('connect', (client) => {
            console.log('[Database Service] Client connected to PostgreSQL.');
        });

        pool.on('acquire', (client) => {
            // This might be too verbose for regular use, uncomment if needed for debugging pool usage
            // console.log('[Database Service] Client acquired from pool.');
        });

        pool.on('remove', (client) => {
            // This might be too verbose, uncomment if needed
            // console.log('[Database Service] Client removed from pool.');
        });

         // Test the connection immediately and provide clearer error context
         console.log('[Database Service] Attempting initial connection test to PostgreSQL...');
         pool.query('SELECT NOW()')
             .then(res => console.log('[Database Service] PostgreSQL Pool connected successfully at:', res.rows[0].now))
             .catch((err: any) => {
                 console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                 console.error('[Database Service] FATAL: Initial PostgreSQL Pool connection test failed.');
                 console.error(`   Attempted to connect to: ${connectionString}`);
                 console.error(`   Error Code: ${err.code}`);
                 console.error(`   Error Message: ${err.message}`);
                 if (err.code === 'ECONNREFUSED') {
                     console.error('   ---> ECONNREFUSED error means the connection was rejected by the server.');
                     console.error('        Common causes:');
                     console.error('        1. PostgreSQL server is not running on the specified host and port.');
                     console.error('        2. Firewall is blocking the connection.');
                     console.error('        3. Incorrect POSTGRES_HOST or POSTGRES_PORT in .env.');
                     console.error('        4. If running in Docker, ensure POSTGRES_HOST matches the database service name (e.g., "db") and not "localhost".');
                 } else if (err.code === 'ENOTFOUND') {
                     console.error('   ---> ENOTFOUND error means the specified hostname could not be resolved.');
                     console.error('        Common causes:');
                     console.error('        1. Typo in POSTGRES_HOST in .env.');
                     console.error('        2. DNS resolution issues.');
                 } else if (err.code === '28P01') { // password authentication failed
                    console.error('   ---> Authentication failed (Invalid password or user).');
                    console.error('        Common causes:');
                    console.error('        1. Incorrect POSTGRES_USER or POSTGRES_PASSWORD in .env.');
                    console.error('        2. User does not have connection privileges in pg_hba.conf.');
                 } else if (err.code === '3D000') { // database does not exist
                    console.error(`   ---> Database "${database}" does not exist.`);
                    console.error('        Common causes:');
                    console.error('        1. Incorrect POSTGRES_DATABASE in .env.');
                    console.error('        2. The database was not created in PostgreSQL.');
                 }
                 console.error('   Troubleshooting Tips (See README.md for more details):');
                 console.error('     1. Is the PostgreSQL server running? (e.g., `brew services start postgresql`, `systemctl status postgresql`, Docker container running?)');
                 console.error('     2. Are the .env variables (POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) correct?');
                 console.error('     3. Is PostgreSQL configured to accept connections? Check `postgresql.conf` (listen_addresses) and `pg_hba.conf`.');
                 console.error('     4. Is a firewall blocking the connection?');
                 console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                 // Allow the application to continue starting, but subsequent DB operations will likely fail.
                 // throw new Error(`Initial PostgreSQL connection failed: ${err.message}`);
             });

    }
    return pool;
}

// --- Schema Initialization ---
const CREATE_DATASETS_TABLE = `
CREATE TABLE IF NOT EXISTS datasets (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

const CREATE_DATA_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS data_entries (
    internal_id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    entry_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, entry_id)
);`;

const CREATE_RELATIONSHIPS_TABLE = `
CREATE TABLE IF NOT EXISTS relationships (
    id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    source_entry_id TEXT NOT NULL,
    target_entry_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, source_entry_id, target_entry_id),
    FOREIGN KEY (dataset_name, source_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_name, target_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE
);`;


async function initializeSchema(): Promise<void> {
    console.log('[Database Service] Initializing database schema if needed...');
    let client;
    try {
        client = await getPool().connect(); // Use getPool() which includes the connection test
    } catch (connectError: any) {
         console.error('[Database Service] Failed to acquire client for schema initialization:', connectError);
         // Cannot proceed with schema init if connection fails
         throw new Error(`Failed to connect to database for schema initialization: ${connectError.message || connectError}`);
    }

    try {
        await client.query('BEGIN');
        await client.query(CREATE_DATASETS_TABLE);
        await client.query(CREATE_DATA_ENTRIES_TABLE);
        await client.query(CREATE_RELATIONSHIPS_TABLE);

        // Check if 'default' dataset exists, create if not
        const res = await client.query('SELECT name FROM datasets WHERE name = $1', ['default']);
        if (res.rowCount === 0) {
            console.log("[Database Service] 'default' dataset not found, creating...");
            await client.query('INSERT INTO datasets (name) VALUES ($1)', ['default']);
            console.log("[Database Service] 'default' dataset created.");
            // Populate default data ONLY if creating the dataset for the first time
            await populateDefaultData(client);
        } else {
            console.log("[Database Service] 'default' dataset already exists.");
        }

        await client.query('COMMIT');
        console.log('[Database Service] Schema initialization check complete.');

    } catch (err) {
        console.error('[Database Service] Error during schema initialization transaction:', err);
        try {
             await client.query('ROLLBACK');
             console.log('[Database Service] Schema initialization transaction rolled back.');
        } catch (rollbackErr) {
             console.error('[Database Service] Error rolling back schema initialization transaction:', rollbackErr);
        }
        throw err; // Re-throw to indicate failure
    } finally {
         if (client) {
            client.release();
         }
    }
}

async function populateDefaultData(client: any): Promise<void> {
    console.log('[Database Service] Populating default data for "default" dataset...');
    const initialDefaultData: Omit<DataEntry, 'id'>[] = [
        { name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
        { name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
        { complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
    ];
    const datasetName = 'default';

    try {
        if (initialDefaultData.length === 0) return;

        const values: any[] = [];
        const placeholders = initialDefaultData.map((entryData, index) => {
            const entryId = uuidv4();
            const dataJson = JSON.stringify(entryData);
            values.push(datasetName, entryId, dataJson);
            return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
        }).join(', ');

        const query = `INSERT INTO data_entries (dataset_name, entry_id, data) VALUES ${placeholders}`;
        await client.query(query, values);
        console.log(`[Database Service] Added ${initialDefaultData.length} default entries to dataset '${datasetName}'.`);
        console.log('[Database Service] Default data populated successfully.');
    } catch (error) {
        console.error('[Database Service] Error populating default data:', error);
        // Don't rollback the dataset creation, but log the error
    }
}


// Initialize schema on load - wrap in async IIFE
(async () => {
    try {
        // getPool() is called internally by initializeSchema
        await initializeSchema();
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("FATAL: Failed to initialize database schema on startup.");
        console.error("   Please check the database connection details in .env and ensure the PostgreSQL server is running and accessible.");
        console.error("   See detailed error above or in the README.md troubleshooting section.");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // Consider exiting the process if schema init is critical, but this might hide the error in some environments
        // process.exit(1);
    }
})();

// --- Public API ---

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

// --- Relationship Operations ---

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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Database Service] Received SIGINT. Closing connection pool...');
  if (pool) {
    await pool.end();
    console.log('[Database Service] Connection pool closed.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Database Service] Received SIGTERM. Closing connection pool...');
  if (pool) {
    await pool.end();
    console.log('[Database Service] Connection pool closed.');
  }
  process.exit(0);
});