import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { EmailTemplateItem } from '../types';
import { Modal } from '../components/Modal';
import { Mail, Plus, Edit2, Trash2, Eye, Sparkles } from 'lucide-react';

export const EmailTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateItem | null>(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: templates = [], isLoading } = useQuery<EmailTemplateItem[]>({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await api.get('/settings/email-templates');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        return api.put(`/settings/email-templates/${editingTemplate._id}`, { name, subject, body });
      }
      return api.post('/settings/email-templates', { name, subject, body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/settings/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });

  const openNewModal = () => {
    setEditingTemplate(null);
    setName('');
    setSubject('Update regarding your mortgage application - {{brokerageName}}');
    setBody('<p>Dear {{clientName}},</p><p>Your advisor {{advisorName}} has an update regarding your application.</p>');
    setIsModalOpen(true);
  };

  const openEditModal = (t: EmailTemplateItem) => {
    setEditingTemplate(t);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Templates</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated mortgage emails sent when leads enter linked pipeline stages. Placeholders dynamically populate client & advisor details.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Placeholders helper card */}
      <div className="bg-primary-50/60 border border-primary-100 rounded-xl p-4 text-xs text-primary-900 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Supported Dynamic Placeholders:</div>
          <div className="flex flex-wrap gap-2 mt-1.5 font-mono text-[11px]">
            <span className="bg-white px-2 py-0.5 rounded border border-primary-200">
              {'{{clientName}}'}
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-primary-200">
              {'{{advisorName}}'}
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-primary-200">
              {'{{brokerageName}}'}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No email templates created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl._id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{tpl.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tpl)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(tpl._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  <span className="text-slate-400">Subject: </span>
                  {tpl.subject}
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-600 line-clamp-4 font-mono">
                  {tpl.body}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-3 border-t mt-3 flex justify-between">
                <span>Updated: {new Date(tpl.createdAt).toLocaleDateString('de-DE')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome & Questionnaire"
              className="w-full text-xs px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Line</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">HTML Body</label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md font-mono leading-relaxed"
            />
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs rounded-md shadow-sm transition"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
