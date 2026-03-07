import React from 'react';
import { fetchWorkOrderData } from '@/actions/workOrderActions';
import WorkOrderDetail from '@/components/work-orders/WorkOrderDetail';
import { notFound } from 'next/navigation';

export default async function WorkOrderPage({ params }: { params: { id: string } }) {
    const data = await fetchWorkOrderData(params.id);

    if (!data) {
        notFound();
    }

    return (
        <WorkOrderDetail workOrder={data.workOrder} tasks={data.tasks} />
    );
}