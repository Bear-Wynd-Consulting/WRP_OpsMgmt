'use client';

import React, { useState } from 'react';
import { updateTenant, type Tenant } from '@/services/workOrderActions';
import { useRouter } from 'next/navigation';

export default function TenantManager({ tenants }: { tenants: Tenant[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', location: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const startEdit = (tenant: Tenant) => {
        setEditingId(tenant.id);
        setFormData({ name: tenant.name, location: tenant.location || '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', location: '' });
    };

    const handleSave = async () => {
        if (!editingId) return;
        setIsSaving(true);
        try {
            await updateTenant(editingId, formData.name, formData.location);
            setEditingId(null);
            router.refresh(); 
        } catch (error) {
            console.error("Failed to update tenant", error);
            alert("Failed to update tenant");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTenants = tenants.filter(tenant => 
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none w-full max-w-xs"
                />
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTenants.map((tenant) => (
                        <tr key={tenant.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {editingId === tenant.id ? (
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none"
                                    />
                                ) : (
                                    <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {editingId === tenant.id ? (
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none"
                                    />
                                ) : (
                                    <div className="text-sm text-gray-500">{tenant.location}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {editingId === tenant.id ? (
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="text-green-600 hover:text-green-900 disabled:opacity-50 font-semibold"
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => startEdit(tenant)}
                                        className="text-[#673AB7] hover:text-purple-900 font-semibold"
                                    >
                                        Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                        ))}
                        {filteredTenants.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500 italic">
                                    No companies found matching "{searchQuery}".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}