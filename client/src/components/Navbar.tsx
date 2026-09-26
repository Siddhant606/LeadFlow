import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { WebhookSimulatorModal } from './WebhookSimulatorModal';
import { LogOut, Radio, Zap, Shield, Building2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, brokerage, logout } = useAuth();
  const { isConnected } = useSocket();
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold shadow-sm">
                  LF
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-900 text-lg tracking-tight">LeadFlow</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                      DE SaaS
                    </span>
                  </div>
                  {brokerage && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                      <span>{brokerage.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* WebSocket Live Status */}
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: isConnected ? '#f0fdf4' : '#fefce8',
                  borderColor: isConnected ? '#bbf7d0' : '#fef08a',
                  color: isConnected ? '#166534' : '#854d0e',
                }}
                title={isConnected ? 'Live WebSocket connected to tenant room' : 'Reconnecting to Socket.IO'}
              >
                <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-600' : 'text-amber-500'}`} />
                <span>{isConnected ? 'Live Sync' : 'Connecting'}</span>
              </div>

              {/* External Webhook Simulator Button */}
              {user?.role !== 'CLIENT' && (
                <button
                  onClick={() => setIsWebhookModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate Webhook</span>
                </button>
              )}

              {/* User info & Role */}
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500">
                    <Shield className="w-3 h-3 text-primary-500" />
                    <span>{user?.role}</span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <WebhookSimulatorModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
      />
    </>
  );
};
