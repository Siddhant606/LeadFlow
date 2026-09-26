import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'lead' | 'document' | 'task' | 'case';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'lead' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'lead') {
    switch (status) {
      case 'NEW':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'CONTACTED':
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'QUALIFIED':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'APPLICATION':
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'WON':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'LOST':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'document') {
    switch (status) {
      case 'UPLOADED':
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
        break;
      case 'PROCESSING':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse';
        break;
      case 'PASSED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
        break;
      case 'FAILED':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
        break;
    }
  } else if (type === 'task') {
    switch (status) {
      case 'PENDING':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'COMPLETED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
    }
  } else if (type === 'case') {
    switch (status) {
      case 'PENDING_DOCUMENTS':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'UNDER_REVIEW':
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'APPROVED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'REJECTED':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'ACTIVE':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {status}
    </span>
  );
};
