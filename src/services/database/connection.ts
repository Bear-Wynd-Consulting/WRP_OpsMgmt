import { Pool } from 'pg';

// --- Connection Pool ---
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const host = process.env.POSTGRES_HOST || 'localhost';
        const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
        const user = process.env.POSTGRES_USER;
        const password = process.env.POSTGRES_PASSWORD; // Keep confidential
        const database = process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB;

        const connectionString = `postgres://[MASKED]:[MASKED]@[MASKED]:[MASKED]/[MASKED]`; // Redacted for logging

        if (!user || !password || !database) {
             console.error("[Database Service] ERROR: Missing required PostgreSQL environment variables (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE or POSTGRES_DB).");
             console.error(`[Database Service] Current Config Status: host=${host ? '[SET]' : 'MISSING'}, port=${port ? '[SET]' : 'MISSING'}, user=${user ? '[SET]' : 'MISSING'}, database=${database ? '[SET]' : 'MISSING'}, password=${password ? '[SET]' : 'MISSING'}`);
             throw new Error("Missing required PostgreSQL environment variables. Check your .env file.");
        }

        console.log(`[Database Service] Creating PostgreSQL connection pool.`);

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
                    console.error(`   ---> Database does not exist.`);
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
