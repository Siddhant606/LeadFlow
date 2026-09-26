import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ClientRecord, DocumentItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export const ClientPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch logged in client's own profile
  const { data: client, isLoading: isClientLoading } = useQuery<ClientRecord>({
    queryKey: ['client-me'],
    queryFn: async () => {
      const res = await api.get('/clients/me');
      return res.data.data;
    },
  });

  // Fetch client's own documents
  const { data: documents = [], isLoading: isDocsLoading } = useQuery<DocumentItem[]>({
    queryKey: ['client-documents'],
    queryFn: async () => {
      const res = await api.get('/documents/client');
      return res.data.data;
    },
  });

  // Upload document
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFile(null);
      const fileInput = document.getElementById('portal-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (isClientLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Client Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              German Mortgage Client Portal
            </span>
            <StatusBadge status={client?.caseStatus || 'ACTIVE'} type="case" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {client?.userId?.name || 'Applicant'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload your mortgage verification documents. Our automated OCR background worker verifies documents in real-time.
          </p>
        </div>

        {client?.leadId?.metadata?.loanAmount && (
          <div className="bg-slate-50 p-4 rounded-xl border text-right">
            <div className="text-[11px] text-slate-500">Mortgage Loan Inquiry</div>
            <div className="text-xl font-bold text-slate-900">
              €{Number(client.leadId.metadata.loanAmount).toLocaleString('de-DE')}
            </div>
          </div>
        )}
      </div>

      {/* Document Upload Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Submit Verification Documents</h2>
        <p className="text-xs text-slate-500 mb-4">
          Please upload recent 3 months of German salary statements (Gehaltsabrechnungen), SCHUFA score certificate, or property purchase drafts.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-500 transition-colors bg-slate-50/50">
            <Upload className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-700">
              {selectedFile ? selectedFile.name : 'Select document file'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              PDF, JPEG, PNG or WebP up to 15MB
            </div>

            <input
              id="portal-file-input"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <span>Uploading to secure storage...</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Start OCR Verification</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Uploaded Documents Tracker */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Your Submitted Documents ({documents.length})</h2>

        {isDocsLoading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No documents uploaded yet. Submit your first document above.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <div>
                      <div className="font-semibold text-slate-900">{doc.originalName}</div>
                      <div className="text-[11px] text-slate-400">
                        {(doc.size / 1024).toFixed(0)} KB &bull;{' '}
                        {new Date(doc.createdAt).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={doc.status} type="document" />
                    <a
                      href={`/api/documents/${doc._id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-700 transition"
                      title="Download copy"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Real-time status cards */}
                {doc.status === 'PROCESSING' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2 text-[11px]">
                    <Clock className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span>
                      Verifying document signatures and tax IDs with background OCR worker... (Live update via Socket.IO)
                    </span>
                  </div>
                )}

                {doc.status === 'PASSED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Document Verified & Accepted</span>
                    </div>
                    {doc.verificationDetails?.verifiedFields && (
                      <div className="text-[10px] text-emerald-800">
                        Verified: {doc.verificationDetails.verifiedFields.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {doc.status === 'FAILED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Document Verification Rejected</span>
                    </div>
                    <div className="text-[10px] text-rose-700">{doc.failureReason}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
