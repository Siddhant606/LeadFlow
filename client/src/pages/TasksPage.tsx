import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { TaskItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { CheckSquare, AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('ALL');

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data.data;
    },
  });

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

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'PENDING') return t.status === 'PENDING';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    if (filter === 'OVERDUE') return t.status === 'PENDING' && t.isOverdue;
    return true;
  });

  const overdueCount = tasks.filter((t) => t.status === 'PENDING' && t.isOverdue).length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advisor Tasks</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated tasks generated on pipeline stage transitions. Overdue mortgage deadlines are flagged in red.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filter === 'PENDING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('OVERDUE')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filter === 'OVERDUE'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            Overdue ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filter === 'COMPLETED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No tasks matching the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => (
              <div
                key={task._id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  task.status === 'COMPLETED'
                    ? 'bg-slate-50/50 opacity-60'
                    : task.isOverdue
                    ? 'bg-rose-50/50 border-l-4 border-l-rose-500'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.isOverdue && task.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                    <StatusBadge status={task.status} type="task" />
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
                    <span>
                      Due: <strong>{new Date(task.dueAt).toLocaleDateString('de-DE')}</strong>
                    </span>
                    {task.leadId && (
                      <span>
                        Applicant:{' '}
                        <Link
                          to={`/leads/${task.leadId._id}`}
                          className="text-primary-600 hover:underline font-semibold"
                        >
                          {task.leadId.name} ({task.leadId.stage})
                        </Link>
                      </span>
                    )}
                    {task.assignedTo && <span>Advisor: {task.assignedTo.name}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      toggleTaskMutation.mutate({
                        taskId: task._id,
                        status: task.status === 'PENDING' ? 'COMPLETED' : 'PENDING',
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      task.status === 'COMPLETED'
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    }`}
                  >
                    {task.status === 'COMPLETED' ? 'Reopen Task' : 'Mark Completed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
