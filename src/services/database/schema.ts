import { v4 as uuidv4 } from 'uuid';
import { getPool } from './connection';
import type { DataEntry } from '../types';

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


export async function initializeSchema(): Promise<void> {
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
