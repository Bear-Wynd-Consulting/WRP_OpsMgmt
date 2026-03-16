'use server';

import { getPool } from '@/services/database';

export interface DashboardStats {
    openWorkOrders: number;
    pendingTasks: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const client = await getPool().connect();
    try {
        const [openOrdersRes, pendingTasksRes] = await Promise.all([
            client.query("SELECT COUNT(*) FROM work_orders WHERE status = 'open'"),
            client.query("SELECT COUNT(*) FROM work_order_tasks WHERE status = 'pending'")
        ]);
        
        return {
            openWorkOrders: parseInt(openOrdersRes.rows[0].count, 10),
            pendingTasks: parseInt(pendingTasksRes.rows[0].count, 10)
        };
    } finally {
        client.release();
    }
}