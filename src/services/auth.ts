import { getPool } from './database';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function signIn(username: string, password: string):Promise<boolean> {
    const pool = getPool();
    const client = await pool.connect();

    try {
        const res = await client.query('SELECT id, password FROM users WHERE username = $1', [username]);
        if (res.rowCount === 0) {
            return false;
        }

        const user = res.rows[0];

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        if (user.password !== hashedPassword) {
             return false;
        }

        // Generate session
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await client.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [sessionId, user.id, expiresAt]);

        // set cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            path: '/'
        });

        return true;
    } finally {
        client.release();
    }
}

export async function signOut() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
        } finally {
            client.release();
        }
        cookieStore.delete('session');
    }
}

export async function getGenericUserId() {
    const pool = getPool();
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id FROM users WHERE username = $1', ['generic_user']);
        if (res.rowCount === 0) {
            return null; // fallback or error
        }
        return res.rows[0].id;
    } catch (err) {
        console.error('Error fetching generic user id', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getAuthUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
        return null;
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT u.id, u.username, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1 AND s.expires_at > NOW()
        `, [sessionId]);

        if (res.rowCount === 0) {
            return null;
        }

        return res.rows[0];
    } catch(err) {
        console.error('Error fetching auth user', err);
        return null;
    } finally {
        client.release();
    }
}
