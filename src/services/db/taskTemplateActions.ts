'use server';

import { createTaskTemplate, getAllTaskTemplates, type TaskTemplate } from '@/services/workOrderService';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all available task templates.
 */
export async function fetchTaskTemplates(): Promise<TaskTemplate[]> {
    try {
        return await getAllTaskTemplates();
    } catch (error) {
        console.error('Failed to fetch task templates:', error);
        return [];
    }
}

/**
 * Creates a new task template with the given steps.
 */
export async function saveTaskTemplate(name: string, description: string, steps: string[]): Promise<void> {
    await createTaskTemplate(name, description, steps);
    revalidatePath('/admin'); // Revalidate the admin page to show the new template
}