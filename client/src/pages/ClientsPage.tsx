import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ClientRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { Users, Search, Filter } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');

  const { data: clients = [], isLoading } = useQuery<ClientRecord[]>({
    queryKey: ['clients', { search, caseStatus: caseStatusFilter }],
    queryFn: async () => {
      const res = await api.get('/clients', {
        params: { search, caseStatus: caseStatusFilter },
      });
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Cases</h1>
          <p className="text-xs text-slate-500 mt-1">
            Active converted mortgage clients. Each client has individual portal access and background-verified documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-52 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <select
            value={caseStatusFilter}
            onChange={(e) => setCaseStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 outline-none"
          >
            <option value="">All Case Statuses</option>
            <option value="PENDING_DOCUMENTS">Pending Documents</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            No converted clients found. Convert leads from the Lead Pipeline to view them here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Case Status</th>
                <th className="py-3 px-4">Original Lead Stage</th>
                <th className="py-3 px-4">Converted Date</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {client.userId?.name || client.leadId?.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                    <div>{client.userId?.email}</div>
                    <div className="text-slate-400">{client.leadId?.phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={client.caseStatus} type="case" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={client.leadId?.stage || 'QUALIFIED'} type="lead" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(client.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/clients/${client._id}`}
                      className="text-primary-600 hover:text-primary-800 font-semibold"
                    >
                      View Documents &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
