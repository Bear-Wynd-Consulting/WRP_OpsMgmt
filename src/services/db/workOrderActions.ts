'use server';

import { getWorkOrderDetails, completeTask } from '@/services/workOrderService';
import { revalidatePath } from 'next/cache';
import { getAuthUser, getGenericUserId } from '@/services/auth';

export async function fetchWorkOrderData(workOrderId: string) {
    try {
        return await getWorkOrderDetails(workOrderId);
    } catch (error) {
        console.error('Error fetching work order:', error);
        return null;
    }
}

export async function markTaskAsComplete(taskId: string, workOrderId: string) {
    const user = await getAuthUser();
    let userId = user?.id;
    if (!userId) {
        userId = await getGenericUserId();
        if (!userId) {
            throw new Error("Unable to identify generic user ID");
        }
    }
    
    await completeTask(taskId, userId);
    revalidatePath(`/work-orders/${workOrderId}`);
}