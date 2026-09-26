import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@hypotech.de');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user, brokerage } = res.data.data;
      login(token, user, brokerage);

      if (user.role === 'CLIENT') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            LF
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">LeadFlow</span>
        </div>
        <h2 className="text-center text-sm font-medium text-slate-600">
          Multi-Tenant Mortgage Brokerage SaaS Platform
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="advisor@hypotech.de"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
              <span>1-Click Demo Accounts</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-medium text-slate-400">Brokerage A (HypoTech Berlin):</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin@hypotech.de', 'BROKERAGE_ADMIN')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center truncate font-medium transition"
                  title="Admin (Berlin)"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('lukas.advisor@hypotech.de', 'ADVISOR')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center truncate font-medium transition"
                  title="Advisor (Berlin)"
                >
                  Advisor
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('hanna.schmidt@gmail.com', 'CLIENT')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center truncate font-medium transition"
                  title="Client (Hanna Schmidt)"
                >
                  Client
                </button>
              </div>

              <div className="text-[11px] font-medium text-slate-400 mt-2">
                Brokerage B (München Baufinanz - Multi-tenant isolation test):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin@muenchen-baufinanz.de', 'BROKERAGE_ADMIN')}
                  className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-center truncate font-medium transition"
                >
                  Munich Admin
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('stefan.advisor@muenchen-baufinanz.de', 'ADVISOR')}
                  className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-center truncate font-medium transition"
                >
                  Munich Advisor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
