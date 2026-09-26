import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Lead, TaskItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Building,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  FileText,
} from 'lucide-react';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'APPLICATION', 'WON', 'LOST'];

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertPassword, setConvertPassword] = useState('ClientPassword2025!');
  const [convertNotes, setConvertNotes] = useState('Converted for mortgage verification');

  // Fetch Lead Details
  const { data: lead, isLoading, isError } = useQuery<Lead>({
    queryKey: ['lead', id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Fetch Tasks for this lead
  const { data: tasks = [] } = useQuery<TaskItem[]>({
    queryKey: ['tasks', { leadId: id }],
    queryFn: async () => {
      const res = await api.get('/tasks', { params: { leadId: id } });
      return res.data.data;
    },
    enabled: !!id,
  });

  // Stage change mutation
  const updateStageMutation = useMutation({
    mutationFn: async (newStage: string) => {
      const res = await api.patch(`/leads/${id}/stage`, { stage: newStage });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Convert Lead to Client Mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/clients/convert/${id}`, {
        password: convertPassword,
        notes: convertNotes,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsConvertModalOpen(false);
      navigate(`/clients/${data.client._id}`);
    },
  });

  // Toggle task status
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'PENDING' | 'COMPLETED' }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
        Lead not found or access denied.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pipeline')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{lead.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={lead.stage} type="lead" />
              <span className="text-xs text-slate-400">&bull; Source: {lead.source}</span>
            </div>
          </div>
        </div>

        <div>
          {lead.clientId ? (
            <Link
              to={`/clients/${typeof lead.clientId === 'object' ? lead.clientId._id : lead.clientId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>View Client Case &rarr;</span>
            </Link>
          ) : (
            <button
              onClick={() => setIsConvertModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Convert to Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Duplicate Person Warning Banner */}
      {lead.metadata?.duplicatePersonDetected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-xs text-amber-900">
              Duplicate Person Detected in Brokerage
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              An existing lead was matched with identical normalized email ({lead.email}) or phone ({lead.phone}).
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Contact info & Stage Controls */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Applicant Profile</h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="font-mono">{lead.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-mono">{lead.phone}</span>
            </div>
            {lead.externalId && (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-semibold">External ID:</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{lead.externalId}</span>
              </div>
            )}
            {lead.metadata?.loanAmount && (
              <div className="pt-2 border-t">
                <div className="text-slate-400">Mortgage Loan Inquiry</div>
                <div className="text-lg font-bold text-slate-900">
                  €{Number(lead.metadata.loanAmount).toLocaleString('de-DE')}
                </div>
                {lead.metadata.city && <div className="text-slate-500">{lead.metadata.city}</div>}
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Pipeline Stage Transition</label>
            <select
              value={lead.stage}
              onChange={(e) => updateStageMutation.mutate(e.target.value)}
              className="w-full text-xs py-2 px-3 border rounded-lg focus:ring-1 focus:ring-primary-500 font-semibold"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Changing stage triggers stage-linked tasks and notification emails automatically.
            </p>
          </div>
        </div>

        {/* Right column: Tasks linked to this lead */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-bold text-slate-900">Stage Automation Tasks ({tasks.length})</h2>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No tasks currently generated for this lead. Advance pipeline stage to trigger automations.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between ${
                    task.status === 'COMPLETED'
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : task.isOverdue
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.isOverdue && task.status === 'PENDING' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {task.description && <p className="text-slate-500 text-[11px]">{task.description}</p>}
                    <div className="text-slate-400 text-[10px]">
                      Due: {new Date(task.dueAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      toggleTaskMutation.mutate({
                        taskId: task._id,
                        status: task.status === 'PENDING' ? 'COMPLETED' : 'PENDING',
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      task.status === 'COMPLETED'
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {task.status === 'COMPLETED' ? 'Reopen' : 'Mark Done'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Convert Lead to Client Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Lead to Client"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Converting <strong>{lead.name}</strong> will create a Client Case and provision a CLIENT user account allowing them to log in, upload mortgage documents, and view background OCR verification.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Client Portal Login Password
            </label>
            <input
              type="text"
              value={convertPassword}
              onChange={(e) => setConvertPassword(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Case Notes</label>
            <textarea
              value={convertNotes}
              onChange={(e) => setConvertNotes(e.target.value)}
              rows={2}
              className="w-full text-xs px-3 py-2 border rounded-md"
            />
          </div>

          <button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-md shadow-sm transition"
          >
            {convertMutation.isPending ? 'Converting...' : 'Confirm Conversion & Create Account'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
