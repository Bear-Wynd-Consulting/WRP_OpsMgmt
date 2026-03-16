import { fetchTenants } from '@/services/workOrderActions';
import TenantManager from '@/components/admin/TenantManager';

export default async function TenantsPage() {
    const tenants = await fetchTenants();

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Tenant Management</h1>
            <TenantManager tenants={tenants} />
        </div>
    );
}