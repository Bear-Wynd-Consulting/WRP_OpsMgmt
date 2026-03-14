import { getPool } from '@/services/database';

export interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    steps: string[];
}

export interface WorkOrderTask {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    assigned_to?: string;
}

export interface WorkOrder {
    id: string;
    location: string;
    goal: string;
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

// Function to initialize tables
export async function initializeWorkOrderSchema(): Promise<void> {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS task_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                steps JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS work_orders (
                id SERIAL PRIMARY KEY,
                location VARCHAR(255) NOT NULL,
                goal TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS work_order_tasks (
                id SERIAL PRIMARY KEY,
                work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                assigned_to VARCHAR(255),
                completed_by VARCHAR(255),
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing work order schema:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function createWorkOrder(tenantId: string, location: string, goal: string): Promise<string> {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            'INSERT INTO work_orders (location, goal, status) VALUES ($1, $2, $3) RETURNING id',
            [location, goal, 'open']
        );
        const newId = res.rows[0].id;

        await client.query('COMMIT');
        return newId.toString();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating work order:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function getAllTaskTemplates(): Promise<TaskTemplate[]> {
    const client = await getPool().connect();
    try {
        const res = await client.query('SELECT * FROM task_templates ORDER BY created_at DESC');
        return res.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            steps: row.steps
        }));
    } finally {
        client.release();
    }
}

export async function createTaskTemplate(name: string, description: string, steps: string[]): Promise<void> {
    const client = await getPool().connect();
    try {
        await client.query(
            'INSERT INTO task_templates (name, description, steps) VALUES ($1, $2, $3)',
            [name, description, JSON.stringify(steps)]
        );
    } finally {
        client.release();
    }
}

export async function getWorkOrderDetails(workOrderId: string): Promise<{ workOrder: WorkOrder, tasks: WorkOrderTask[] } | null> {
    const client = await getPool().connect();
    try {
        const orderRes = await client.query('SELECT * FROM work_orders WHERE id = $1', [workOrderId]);
        if (orderRes.rows.length === 0) return null;

        const tasksRes = await client.query('SELECT * FROM work_order_tasks WHERE work_order_id = $1 ORDER BY created_at ASC', [workOrderId]);

        return {
            workOrder: orderRes.rows[0],
            tasks: tasksRes.rows
        };
    } finally {
        client.release();
    }
}

export async function completeTask(taskId: string, userId: string): Promise<void> {
    const client = await getPool().connect();
    try {
        await client.query(
            "UPDATE work_order_tasks SET status = 'completed', completed_by = $1, completed_at = NOW() WHERE id = $2",
            [userId, taskId]
        );
    } finally {
        client.release();
    }
}
