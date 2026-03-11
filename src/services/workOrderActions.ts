'use server';

import { getWorkOrderDetails, completeTask, createWorkOrder } from '@/services/workOrderService';
import { getPool } from '@/services/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function fetchWorkOrderData(workOrderId: string) {
    try {
        return await getWorkOrderDetails(workOrderId);
    } catch (error) {
        console.error('Error fetching work order:', error);
        return null;
    }
}

export async function markTaskAsComplete(taskId: string, workOrderId: string) {
    // TODO: Integrate with your authentication system to get the actual User ID
    const userId = 'current-user-id'; 
    
    await completeTask(taskId, userId);
    revalidatePath(`/work-orders/${workOrderId}`);
}

export interface Tenant {
    id: string;
    name: string;
    location: string;
}

export async function fetchTenants(): Promise<Tenant[]> {
    const client = await getPool().connect();
    try {
        // Ensure table exists for this context
        await client.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                location TEXT
            );
        `);
        
        // Seed if empty for demonstration
        const countRes = await client.query('SELECT COUNT(*) FROM tenants');
        if (parseInt(countRes.rows[0].count) === 0) {
             await client.query(`
                INSERT INTO tenants (name, location) VALUES 
                ('Acme Corp', '123 Industrial Way'),
                ('Globex Corporation', '456 Cypress Creek'),
                ('Soylent Corp', '789 People Place');
             `);
        }

        const res = await client.query('SELECT id, name, location FROM tenants ORDER BY name');
        return res.rows;
    } catch (e) {
        console.error("Error fetching tenants", e);
        return [];
    } finally {
        client.release();
    }
}

export async function submitWorkOrder(formData: FormData) {
    const location = formData.get('location') as string;
    const goal = formData.get('goal') as string;
    const tenantId = formData.get('tenantId') as string;
    const updateCompany = formData.get('updateCompany') === 'on';

    if (!location || !goal || !tenantId) {
        throw new Error('Company, Location, and Goal are required fields.');
    }

    if (updateCompany) {
        const client = await getPool().connect();
        try {
            await client.query('UPDATE tenants SET location = $1 WHERE id = $2', [location, tenantId]);
        } finally {
            client.release();
        }
    }

    const newId = await createWorkOrder(tenantId, location, goal);
    
    revalidatePath('/');
    redirect(`/work-orders/${newId}`);
}

export async function updateTenant(id: string, name: string, location: string) {
    const client = await getPool().connect();
    try {
        await client.query('UPDATE tenants SET name = $1, location = $2 WHERE id = $3', [name, location, id]);
        revalidatePath('/admin/tenants');
        revalidatePath('/work-orders/new');
    } finally {
        client.release();
    }
}