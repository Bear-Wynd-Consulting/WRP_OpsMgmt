'use client';

import React, { useState, useEffect } from 'react';
import { fetchTaskTemplates, saveTaskTemplate } from '@/services/db/taskTemplateActions';
import type { TaskTemplate } from '@/services/workOrderService';

export default function TaskTemplateManager() {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<string[]>(['']); // Start with one empty step
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        setLoading(true);
        const data = await fetchTaskTemplates();
        setTemplates(data);
        setLoading(false);
    }

    // --- Step Management ---

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index] = value;
        setSteps(newSteps);
    };

    const addStep = () => {
        setSteps([...steps, '']);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
    };

    // --- Submission ---

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || steps.some(s => !s.trim())) {
            alert('Please fill in the template name and all steps.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Filter out empty steps just in case
            const validSteps = steps.filter(s => s.trim() !== '');
            await saveTaskTemplate(name, description, validSteps);
            
            // Reset form
            setName('');
            setDescription('');
            setSteps(['']);
            
            // Refresh list
            await loadTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Left Column: Create New Template */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-[#673AB7]">Create New Task Template</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none"
                            placeholder="e.g., Standard Unit Turnover"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#673AB7] outline-none"
                            placeholder="Describe when this template should be used..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Steps</label>
                        <div className="space-y-2">
                            {steps.map((step, index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="py-2 text-gray-500 font-mono text-sm">{index + 1}.</span>
                                    <input
                                        type="text"
                                        value={step}
                                        onChange={(e) => handleStepChange(index, e.target.value)}
                                        className="flex-1 p-2 border border-gray-300 rounded focus:border-[#673AB7] outline-none"
                                        placeholder={`Step ${index + 1} description`}
                                        required
                                    />
                                    {steps.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeStep(index)}
                                            className="text-red-500 hover:text-red-700 px-2"
                                            title="Remove step"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addStep}
                            className="mt-3 text-sm text-[#673AB7] font-medium hover:underline"
                        >
                            + Add Another Step
                        </button>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#673AB7] text-white py-2 px-4 rounded hover:bg-purple-800 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right Column: Existing Templates List */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Existing Templates</h2>
                {loading ? (
                    <p className="text-gray-500">Loading templates...</p>
                ) : templates.length === 0 ? (
                    <p className="text-gray-500 italic">No templates defined yet.</p>
                ) : (
                    <div className="space-y-4">
                        {templates.map((template) => (
                            <div key={template.id} className="bg-white p-4 rounded shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
                                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                    <p className="font-medium text-gray-700 mb-1">Steps:</p>
                                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                                        {template.steps.slice(0, 3).map((step, i) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                        {template.steps.length > 3 && (
                                            <li className="list-none text-gray-400 text-xs pl-4">
                                                + {template.steps.length - 3} more steps...
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
