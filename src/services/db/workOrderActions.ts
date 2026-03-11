'use server';

import { getWorkOrderDetails, completeTask } from '@/services/workOrderService';
import { revalidatePath } from 'next/cache';

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