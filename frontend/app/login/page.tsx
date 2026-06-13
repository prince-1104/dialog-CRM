"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth';
import { loginTenantUser, loginSuperAdmin } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { loginTenantUser: storeTenantLogin, loginSuperAdmin: storeSuperAdminLogin } = useAuthStore();

  const [mode, setMode] = useState<'tenant' | 'admin'>('tenant');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'tenant') {
        if (!tenantSlug) {
          setError('Please enter your workspace slug.');
          setLoading(false);
          return;
        }
        const data = await loginTenantUser(email, password, tenantSlug);
        storeTenantLogin(data.user, data.tenant, data.access_token, data.refresh_token);
        router.push('/');
      } else {
        const data = await loginSuperAdmin(email, password);
        storeSuperAdminLogin(data.user, data.access_token, data.refresh_token);
        router.push('/');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 mb-4 shadow-lg shadow-purple-500/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">NMC Contact Center</h1>
          <p className="text-sm text-zinc-500">Sign in to your workspace</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-zinc-900/50 p-1 rounded-xl mb-6 border border-zinc-800">
          <button
            onClick={() => { setMode('tenant'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'tenant'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            Workspace Login
          </button>
          <button
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === 'admin'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            Super Admin
          </button>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
            {mode === 'tenant' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workspace Slug</label>
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="e.g. nmc-demo"
                  className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
              mode === 'tenant'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Signing in...' : mode === 'tenant' ? 'Sign in to Workspace' : 'Sign in as Super Admin'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Demo Credentials</p>
          {mode === 'tenant' ? (
            <div className="space-y-1 text-xs text-zinc-500">
              <p>Workspace: <span className="text-zinc-300 font-mono">nmc-demo</span></p>
              <p>Admin: <span className="text-zinc-300 font-mono">admin@nmc-demo.com / Admin@123</span></p>
              <p>Manager: <span className="text-zinc-300 font-mono">manager@nmc-demo.com / Manager@123</span></p>
              <p>Agent: <span className="text-zinc-300 font-mono">agent@nmc-demo.com / Agent@123</span></p>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              <p>Email: <span className="text-zinc-300 font-mono">superadmin@nmc.com</span></p>
              <p>Password: <span className="text-zinc-300 font-mono">SuperAdmin@123</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
