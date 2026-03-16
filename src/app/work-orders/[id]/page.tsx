import { fetchWorkOrderData } from '@/services/db/workOrderActions';
import WorkOrderDetail from '@/services/db/WorkOrderDetail';
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
