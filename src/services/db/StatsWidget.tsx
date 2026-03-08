import React from 'react';
import { getDashboardStats } from '@/services/db/dashboardActions';
import { ClipboardList, CheckSquare } from 'lucide-react';

export default async function StatsWidget() {
    const stats = await getDashboardStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Open Work Orders Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#673AB7] flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Open Work Orders</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.openWorkOrders}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                    <ClipboardList className="w-8 h-8 text-[#673AB7]" />
                </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingTasks}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                    <CheckSquare className="w-8 h-8 text-orange-500" />
                </div>
            </div>
        </div>
    );
}
