'use server';

import { getPool } from '@/services/database';

export interface DbSchemaColumn {
    table_name: string;
    column_name: string;
    data_type: string;
}

export interface DbConnectionTestResult {
    success: boolean;
    message: string;
    schema?: DbSchemaColumn[];
    error?: string;
}

export async function testDbConnectionAction(): Promise<DbConnectionTestResult> {
    try {
        const pool = getPool();
        const client = await pool.connect();
        try {
            // First simple test
            await client.query('SELECT 1');

            // Get schema information
            const query = `
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            `;
            const result = await client.query(query);

            return {
                success: true,
                message: 'Successfully connected to PostgreSQL database.',
                schema: result.rows as DbSchemaColumn[]
            };
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Database connection test failed:', error);
        return {
            success: false,
            message: 'Failed to connect to the database.',
            error: error.message || String(error)
        };
    }
}
