'use client';

import { submitWorkOrder, type Tenant } from '@/services/workOrderActions';
import { useFormStatus } from 'react-dom';
import { useState } from 'react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button 
            type="submit" 
            disabled={pending}
            className="w-full bg-[#673AB7] text-white py-2 px-4 rounded hover:bg-purple-800 transition-colors disabled:opacity-50 font-medium"
        >
            {pending ? 'Creating Work Order...' : 'Create Work Order'}
        </button>
    );
}

interface Props {
    tenants: Tenant[];
}

export default function NewWorkOrderForm({ tenants }: Props) {
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [location, setLocation] = useState('');

    const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedTenantId(id);
        const tenant = tenants.find(t => t.id === id);
        if (tenant) {
            setLocation(tenant.location);
        } else {
            setLocation('');
        }
    };

    return (
        <form action={submitWorkOrder} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div>
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                </label>
                <select
                    name="tenantId"
                    id="tenantId"
                    required
                    value={selectedTenantId}
                    onChange={handleTenantChange}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none transition-shadow bg-white"
                >
                    <option value="">Select a Company</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                </label>
                <input 
                    type="text" 
                    name="location" 
                    id="location" 
                    required 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Unit 402, Main Lobby, Gym"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none transition-shadow"
                />
            </div>

            {selectedTenantId && (
                <div className="flex items-center">
                    <input type="checkbox" name="updateCompany" id="updateCompany" className="h-4 w-4 text-[#673AB7] focus:ring-[#673AB7] border-gray-300 rounded" />
                    <label htmlFor="updateCompany" className="ml-2 block text-sm text-gray-900">
                        Update company location record with this value
                    </label>
                </div>
            )}

            <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                    Goal / Issue Description
                </label>
                <textarea 
                    name="goal" 
                    id="goal" 
                    required 
                    rows={4}
                    placeholder="Describe the maintenance issue or task goal..."
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none transition-shadow"
                />
            </div>

            <SubmitButton />
        </form>
    );
}