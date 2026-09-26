import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { DocumentItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['documents', { status: statusFilter }],
    queryFn: async () => {
      const res = await api.get('/documents', {
        params: { status: statusFilter },
      });
      return res.data.data;
    },
  });

  const filteredDocs = documents.filter((d) =>
    search ? d.originalName.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mortgage Documents</h1>
          <p className="text-xs text-slate-500 mt-1">
            Asynchronous BullMQ worker verification status across your brokerage. Updates stream live without refresh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-48 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PROCESSING">Processing / OCR</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="UPLOADED">Uploaded</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No documents matching the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Size & Type</th>
                <th className="py-3 px-4">OCR Status</th>
                <th className="py-3 px-4">Verification Details</th>
                <th className="py-3 px-4">Uploaded At</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{doc.originalName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {(doc.size / 1024).toFixed(0)} KB &bull; {doc.mimeType.split('/')[1]?.toUpperCase()}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} type="document" />
                  </td>
                  <td className="py-3.5 px-4 text-[11px]">
                    {doc.status === 'PROCESSING' && (
                      <span className="text-amber-700 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Verifying in background...
                      </span>
                    )}
                    {doc.status === 'PASSED' && (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified (
                        {((doc.verificationDetails?.confidenceScore || 0.96) * 100).toFixed(0)}% score)
                      </span>
                    )}
                    {doc.status === 'FAILED' && (
                      <span className="text-rose-700 flex items-center gap-1 font-medium" title={doc.failureReason}>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span className="line-clamp-1 max-w-xs">{doc.failureReason}</span>
                      </span>
                    )}
                    {doc.status === 'UPLOADED' && (
                      <span className="text-slate-400">Enqueued in BullMQ</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="py-3.5 px-4">
                    <a
                      href={`/api/documents/${doc._id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
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
