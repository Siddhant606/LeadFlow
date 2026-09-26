import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ClientRecord, DocumentItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Building,
} from 'lucide-react';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch client details
  const { data: client, isLoading, isError } = useQuery<ClientRecord>({
    queryKey: ['client', id],
    queryFn: async () => {
      const res = await api.get(`/clients/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Fetch client documents
  const { data: documents = [] } = useQuery<DocumentItem[]>({
    queryKey: ['client-documents', id],
    queryFn: async () => {
      const res = await api.get(`/documents/client/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Update case status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (caseStatus: string) => {
      const res = await api.patch(`/clients/${id}/status`, { caseStatus });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Upload document
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('clientId', id!);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFile(null);
      // Reset input element
      const fileInput = document.getElementById('client-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      queryClient.invalidateQueries({ queryKey: ['client-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message || 'Document upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
        Client record not found or access denied.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clients')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {client.userId?.name || client.leadId?.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={client.caseStatus} type="case" />
              <span className="text-xs text-slate-400 font-mono">ID: {client._id}</span>
            </div>
          </div>
        </div>

        {client.leadId?._id && (
          <Link
            to={`/leads/${client.leadId._id}`}
            className="text-xs text-primary-600 hover:underline font-medium"
          >
            View Linked Lead Details &rarr;
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Information & Status Control */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Mortgage Case Overview</h2>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-400 font-medium">Email</div>
              <div className="font-mono text-slate-800">{client.userId?.email}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Phone</div>
              <div className="font-mono text-slate-800">{client.leadId?.phone || 'N/A'}</div>
            </div>
            {client.notes && (
              <div>
                <div className="text-slate-400 font-medium">Advisor Notes</div>
                <div className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 mt-1">
                  {client.notes}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Update Case Status</label>
            <select
              value={client.caseStatus}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              className="w-full text-xs py-2 px-3 border rounded-lg focus:ring-1 focus:ring-primary-500 font-semibold"
            >
              <option value="PENDING_DOCUMENTS">PENDING_DOCUMENTS</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ACTIVE">ACTIVE</option>
            </select>
          </div>
        </div>

        {/* Right Column: Documents & Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Upload Client Document</h2>
            <p className="text-xs text-slate-500 mb-4">
              Accepted: PDF, JPEG, PNG, WebP (Max 15MB). Background BullMQ OCR verification processes asynchronously.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  id="client-file-input"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>

              {uploadError && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                  {uploadError}
                </div>
              )}
            </form>
          </div>

          {/* Document List */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-slate-900">
                Uploaded Documents ({documents.length})
              </h2>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No documents uploaded for this client yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-900">{doc.originalName}</span>
                        <span className="text-[11px] text-slate-400">
                          ({(doc.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={doc.status} type="document" />
                        <a
                          href={`/api/documents/${doc._id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Download document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Verification Details / Failure Messages */}
                    {doc.status === 'PROCESSING' && (
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 text-[11px]">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Background OCR & verification running in BullMQ worker...</span>
                      </div>
                    )}

                    {doc.status === 'PASSED' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verification Passed (Confidence: {((doc.verificationDetails?.confidenceScore || 0.95) * 100).toFixed(0)}%)</span>
                        </div>
                        {doc.verificationDetails?.verifiedFields && (
                          <div className="text-[10px] text-emerald-700">
                            Verified Fields: {doc.verificationDetails.verifiedFields.join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {doc.status === 'FAILED' && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Verification Rejected</span>
                        </div>
                        <div className="text-[10px] text-rose-700">{doc.failureReason}</div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
                      <span>Uploaded by: {doc.uploadedBy?.name || 'Client'}</span>
                      <span>{new Date(doc.createdAt).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
