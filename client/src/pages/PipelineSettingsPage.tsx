import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { PipelineStageItem, EmailTemplateItem } from '../types';
import { Modal } from '../components/Modal';
import { Sliders, Mail, CheckSquare, Plus, Trash2, Edit3 } from 'lucide-react';

export const PipelineSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<PipelineStageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for stage edit
  const [emailTemplateId, setEmailTemplateId] = useState<string>('');
  const [taskTemplates, setTaskTemplates] = useState<Array<{ title: string; dueDays: number; description?: string }>>([]);

  // Fetch stages
  const { data: stages = [], isLoading } = useQuery<PipelineStageItem[]>({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await api.get('/settings/stages');
      return res.data.data;
    },
  });

  // Fetch email templates
  const { data: emailTemplates = [] } = useQuery<EmailTemplateItem[]>({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await api.get('/settings/email-templates');
      return res.data.data;
    },
  });

  // Update Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStage) return;
      const res = await api.put(`/settings/stages/${selectedStage._id}`, {
        name: selectedStage.name,
        order: selectedStage.order,
        emailTemplateId: emailTemplateId || null,
        taskTemplates,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setIsModalOpen(false);
      setSelectedStage(null);
    },
  });

  const openConfigModal = (stage: PipelineStageItem) => {
    setSelectedStage(stage);
    setEmailTemplateId(stage.emailTemplateId?._id || (stage.emailTemplateId as any) || '');
    setTaskTemplates(stage.taskTemplates || []);
    setIsModalOpen(true);
  };

  const addTaskTemplate = () => {
    setTaskTemplates([...taskTemplates, { title: 'New Task', dueDays: 2, description: '' }]);
  };

  const removeTaskTemplate = (index: number) => {
    setTaskTemplates(taskTemplates.filter((_, i) => i !== index));
  };

  const updateTaskField = (index: number, field: string, value: any) => {
    const updated = [...taskTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setTaskTemplates(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pipeline Automations</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure automated email triggers and task generation when a mortgage lead transitions into a stage.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage) => (
            <div
              key={stage._id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{stage.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    Order: {stage.order}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Trigger Email:{' '}
                      {stage.emailTemplateId?.name ? (
                        <strong className="text-slate-800">{stage.emailTemplateId.name}</strong>
                      ) : (
                        <span className="italic text-slate-400">None configured</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Automated Tasks:{' '}
                      <strong className="text-slate-800">{stage.taskTemplates?.length || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openConfigModal(stage)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Configure Automations</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stage Automations Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Automations for Stage: ${selectedStage?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Linked Email Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trigger Automated Email On Entry
            </label>
            <select
              value={emailTemplateId}
              onChange={(e) => setEmailTemplateId(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md"
            >
              <option value="">No email automation</option>
              {emailTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} (Subject: {t.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Configured Task Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tasks Automatically Created on Stage Entry
              </label>
              <button
                type="button"
                onClick={addTaskTemplate}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {taskTemplates.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No tasks configured for this stage.</div>
              ) : (
                taskTemplates.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border rounded-lg flex items-start gap-2 text-xs"
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Task title"
                        value={task.title}
                        onChange={(e) => updateTaskField(idx, 'title', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Due in:</span>
                        <input
                          type="number"
                          min="1"
                          value={task.dueDays}
                          onChange={(e) => updateTaskField(idx, 'dueDays', Number(e.target.value))}
                          className="w-16 px-2 py-0.5 border rounded text-xs"
                        />
                        <span className="text-[11px] text-slate-500">days</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTaskTemplate(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => updateStageMutation.mutate()}
            disabled={updateStageMutation.isPending}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs rounded-md shadow-sm transition"
          >
            {updateStageMutation.isPending ? 'Saving...' : 'Save Stage Automations'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
