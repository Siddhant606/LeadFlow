import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Kanban,
  Users,
  CheckSquare,
  FileText,
  Mail,
  Sliders,
  FolderOpen,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'BROKERAGE_ADMIN' || user?.role === 'PLATFORM_ADMIN';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Navigation Sections */}
        {isClient ? (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
              Mortgage Case
            </div>
            <nav className="space-y-1">
              <NavLink to="/portal" className={linkClass}>
                <FolderOpen className="w-4 h-4" />
                <span>My Client Portal</span>
              </NavLink>
            </nav>
          </div>
        ) : (
          <>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                Advisor Workflow
              </div>
              <nav className="space-y-1">
                <NavLink to="/" end className={linkClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/pipeline" className={linkClass}>
                  <Kanban className="w-4 h-4" />
                  <span>Lead Pipeline</span>
                </NavLink>
                <NavLink to="/clients" className={linkClass}>
                  <Users className="w-4 h-4" />
                  <span>Clients</span>
                </NavLink>
                <NavLink to="/tasks" className={linkClass}>
                  <CheckSquare className="w-4 h-4" />
                  <span>Tasks</span>
                </NavLink>
                <NavLink to="/documents" className={linkClass}>
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </NavLink>
              </nav>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                Automations & Config
              </div>
              <nav className="space-y-1">
                <NavLink to="/settings/emails" className={linkClass}>
                  <Mail className="w-4 h-4" />
                  <span>Email Templates</span>
                </NavLink>
                {isAdmin && (
                  <NavLink to="/settings/pipeline" className={linkClass}>
                    <Sliders className="w-4 h-4" />
                    <span>Pipeline Settings</span>
                  </NavLink>
                )}
              </nav>
            </div>
          </>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
        LeadFlow SaaS &bull; Strict Tenant Scope
      </div>
    </aside>
  );
};
