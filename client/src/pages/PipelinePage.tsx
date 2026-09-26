import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Lead } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Building,
  UserCheck,
  AlertTriangle,
  MoveRight,
  Filter,
} from 'lucide-react';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'APPLICATION', 'WON', 'LOST'];

export const PipelinePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('MANUAL');
  const [newLeadLoanAmount, setNewLeadLoanAmount] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('');

  // Fetch Leads
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads', { search }],
    queryFn: async () => {
      const res = await api.get('/leads', { params: { search } });
      return res.data.data;
    },
  });

  // Stage Transition Mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      const res = await api.patch(`/leads/${leadId}/stage`, { stage });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Create Manual Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leads', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsNewLeadModalOpen(false);
      // Reset form
      setNewLeadName('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadLoanAmount('');
      setNewLeadCity('');
    },
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate({
      name: newLeadName,
      email: newLeadEmail,
      phone: newLeadPhone,
      source: newLeadSource,
      metadata: {
        loanAmount: newLeadLoanAmount ? Number(newLeadLoanAmount) : undefined,
        city: newLeadCity || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kanban advisor workflow. Dragging or advancing a stage automatically triggers configured German mortgage tasks & emails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant name, email, phone..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);

            return (
              <div
                key={stage}
                className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-col min-w-[240px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{stage}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-16rem)] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400 italic">
                      No leads in {stage}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead._id}
                        className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group"
                      >
                        {/* Duplicate Person Warning Banner */}
                        {lead.metadata?.duplicatePersonDetected && (
                          <div className="mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Existing Person Matched</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <Link
                            to={`/leads/${lead._id}`}
                            className="font-semibold text-xs text-slate-900 hover:text-primary-600 line-clamp-1"
                          >
                            {lead.name}
                          </Link>
                          {lead.clientId && (
                            <span
                              title="Converted to active Client"
                              className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              Client
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono mt-1 space-y-0.5">
                          <div className="truncate">{lead.email}</div>
                          <div>{lead.phone}</div>
                        </div>

                        {lead.metadata?.loanAmount && (
                          <div className="mt-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>€{Number(lead.metadata.loanAmount).toLocaleString('de-DE')}</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              {lead.metadata.city || lead.source}
                            </span>
                          </div>
                        )}

                        {/* Quick Stage Move Dropdown */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Move to:</span>
                          <select
                            value={lead.stage}
                            onChange={(e) =>
                              updateStageMutation.mutate({
                                leadId: lead._id,
                                stage: e.target.value,
                              })
                            }
                            className="text-[11px] py-1 px-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700 focus:ring-1 focus:ring-primary-500"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Lead Creation Modal */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Create New Mortgage Lead"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              placeholder="e.g. Sebastian Weber"
              className="w-full text-xs px-3 py-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={newLeadEmail}
                onChange={(e) => setNewLeadEmail(e.target.value)}
                placeholder="sebastian@gmx.de"
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                required
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                placeholder="0171 1234567"
                className="w-full text-xs px-3 py-2 border rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Amount (€)</label>
              <input
                type="number"
                value={newLeadLoanAmount}
                onChange={(e) => setNewLeadLoanAmount(e.target.value)}
                placeholder="450000"
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={newLeadCity}
                onChange={(e) => setNewLeadCity(e.target.value)}
                placeholder="Berlin"
                className="w-full text-xs px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createLeadMutation.isPending}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs rounded-md transition shadow-sm"
          >
            {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
