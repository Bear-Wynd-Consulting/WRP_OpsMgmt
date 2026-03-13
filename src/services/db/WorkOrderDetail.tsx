'use client';

import React, { useState } from 'react';
import { markTaskAsComplete } from '@/services/workOrderActions';
import type { WorkOrder, WorkOrderTask } from '@/services/workOrderService';

interface WorkOrderDetailProps {
    workOrder: WorkOrder;
    tasks: WorkOrderTask[];
}

export default function WorkOrderDetail({ workOrder, tasks }: WorkOrderDetailProps) {
    const [processingTask, setProcessingTask] = useState<string | null>(null);

    const handleComplete = async (taskId: string) => {
        setProcessingTask(taskId);
        try {
            await markTaskAsComplete(taskId, workOrder.id);
        } catch (error) {
            console.error('Failed to complete task', error);
            alert('Failed to update task status');
        } finally {
            setProcessingTask(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const completionPercentage = tasks.length > 0 
        ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) 
        : 0;

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Work Order</h1>
                        <p className="text-sm text-gray-500 font-mono">{workOrder.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(workOrder.status)} uppercase tracking-wide`}>
                        {workOrder.status.replace('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Location</h3>
                        <p className="text-lg text-gray-800 font-medium">{workOrder.location}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Goal</h3>
                        <p className="text-lg text-gray-800">{workOrder.goal}</p>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-[#673AB7] h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
                </div>
                <ul className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                        <li key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                            <div className="flex-1">
                                <p className={`text-gray-800 font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                                    {task.description}
                                </p>
                                {task.assigned_to && (
                                    <p className="text-xs text-gray-500 mt-1">Assigned to: {task.assigned_to}</p>
                                )}
                            </div>
                            
                            <div className="ml-4">
                                {task.status === 'completed' ? (
                                    <span className="flex items-center text-green-600 text-sm font-medium">
                                        <span className="mr-1">✓</span> Completed
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleComplete(task.id)}
                                        disabled={processingTask === task.id}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-[#673AB7] hover:text-white hover:border-[#673AB7] transition-all disabled:opacity-50"
                                    >
                                        {processingTask === task.id ? 'Updating...' : 'Mark Complete'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                    {tasks.length === 0 && (
                        <li className="p-6 text-center text-gray-500 italic">No tasks assigned to this work order.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
