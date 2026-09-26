import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  FileX,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
        Failed to load tenant dashboard metrics.
      </div>
    );
  }

  const stageKeys = ['NEW', 'CONTACTED', 'QUALIFIED', 'APPLICATION', 'WON', 'LOST'];
  const maxStageCount = Math.max(...Object.values(stats.leadsByStage || {}), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Brokerage Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline performance and task automation status for German mortgage applications.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalLeads}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.totalClients} converted to clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Pending & Overdue Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Tasks</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.pendingTasks}</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
              {stats.overdueTasks > 0 ? (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> {stats.overdueTasks} Overdue
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> No overdue tasks
                </span>
              )}
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              stats.overdueTasks > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Documents Processing */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Docs In OCR</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.documentsProcessing}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">BullMQ worker queue</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileSearch className="w-5 h-5" />
          </div>
        </div>

        {/* Documents Failed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Docs Rejected</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              <span className={stats.documentsFailed > 0 ? 'text-rose-600' : 'text-slate-900'}>
                {stats.documentsFailed}
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              {stats.documentsPassed} verified & passed
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              stats.documentsFailed > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
            }`}
          >
            <FileX className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-slate-900">Leads by Pipeline Stage</h2>
            </div>
            <Link
              to="/pipeline"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Open Kanban <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stageKeys.map((stage) => {
              const count = stats.leadsByStage[stage] || 0;
              const percentage = Math.round((count / (stats.totalLeads || 1)) * 100);
              const barWidth = Math.round((count / maxStageCount) * 100);

              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{stage}</span>
                    <span className="text-slate-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        stage === 'WON'
                          ? 'bg-emerald-500'
                          : stage === 'LOST'
                          ? 'bg-rose-400'
                          : stage === 'APPLICATION'
                          ? 'bg-indigo-500'
                          : 'bg-primary-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgent & Overdue Tasks */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Urgent Pending Tasks</h2>
            <Link to="/tasks" className="text-xs text-primary-600 hover:underline">
              View All
            </Link>
          </div>

          {stats.recentTasks?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No pending tasks for your team.</div>
          ) : (
            <div className="space-y-3">
              {stats.recentTasks.map((task: any) => (
                <div
                  key={task._id}
                  className={`p-3 rounded-lg border text-xs ${
                    task.isOverdue
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-semibold line-clamp-1">{task.title}</div>
                    {task.isOverdue && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shrink-0">
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>Due: {new Date(task.dueAt).toLocaleDateString('de-DE')}</span>
                    <span>{task.leadId?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900">Recent Mortgage Inquiries</h2>
          <Link to="/pipeline" className="text-xs text-primary-600 hover:underline">
            Manage in Pipeline
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Applicant Name</th>
                <th className="py-2.5 px-3">Email & Phone</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Advisor</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentLeads?.map((lead: any) => (
                <tr key={lead._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{lead.name}</span>
                      {lead.metadata?.duplicatePersonDetected && (
                        <span title="Existing person detected" className="text-amber-500">
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                    <div>{lead.email}</div>
                    <div className="text-slate-400">{lead.phone}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{lead.source}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={lead.stage} type="lead" />
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {lead.assignedAdvisorId?.name || (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <Link
                      to={`/leads/${lead._id}`}
                      className="text-primary-600 hover:text-primary-800 font-semibold"
                    >
                      View Details &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
