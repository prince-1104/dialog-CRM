"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth';
import { loginTenantUser, loginSuperAdmin } from '../../lib/api';
import { Zap, Shield, AlertCircle, ArrowRight } from 'lucide-react';

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
        if (!tenantSlug) { setError('Please enter your workspace slug.'); setLoading(false); return; }
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

  const isAdmin = mode === 'admin';

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#080c14' }}
    >
      {/* Background glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center mb-4 glow-purple"
            style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
          >
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">NMC Contact Center</h1>
          <p className="text-sm" style={{ color: '#475569' }}>Sign in to your workspace</p>
        </div>

        {/* Mode Toggle */}
        <div
          className="flex p-1 rounded-xl mb-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            type="button"
            onClick={() => { setMode('tenant'); setError(''); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: !isAdmin ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: !isAdmin ? '#c4b5fd' : '#475569',
              border: `1px solid ${!isAdmin ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
            }}
          >
            <Zap size={13} /> Workspace
          </button>
          <button
            type="button"
            onClick={() => { setMode('admin'); setError(''); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: isAdmin ? 'rgba(217,119,6,0.15)' : 'transparent',
              color: isAdmin ? '#fbbf24' : '#475569',
              border: `1px solid ${isAdmin ? 'rgba(217,119,6,0.3)' : 'transparent'}`,
            }}
          >
            <Shield size={13} /> Super Admin
          </button>
        </div>

        {/* Form Card */}
        <form onSubmit={handleLogin}>
          <div
            className="rounded-2xl p-6 space-y-4 mb-4"
            style={{
              background: 'rgba(13,17,32,0.8)',
              border: `1px solid ${isAdmin ? 'rgba(217,119,6,0.12)' : 'rgba(139,92,246,0.12)'}`,
              backdropFilter: 'blur(16px)',
            }}
          >
            {mode === 'tenant' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>Workspace Slug</label>
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={e => setTenantSlug(e.target.value)}
                  placeholder="e.g. nmc-demo"
                  className="input-field"
                  required
                  style={{ fontSize: '0.9rem', padding: '0.75rem 0.875rem' }}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-field"
                required
                style={{ fontSize: '0.9rem', padding: '0.75rem 0.875rem' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-field"
                required
                style={{ fontSize: '0.9rem', padding: '0.75rem 0.875rem' }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 text-sm"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
            style={{
              background: isAdmin
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: isAdmin
                ? '0 4px 20px rgba(217,119,6,0.3)'
                : '0 4px 20px rgba(124,58,237,0.35)',
              transform: loading ? 'none' : undefined,
            }}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
            ) : (
              <>{isAdmin ? <Shield size={15} /> : <Zap size={15} />}
              {isAdmin ? 'Sign in as Super Admin' : 'Sign in to Workspace'}
              <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#334155' }}>
          NMC Contact Center Platform v2.0 • Multi-tenant SaaS
        </p>
      </div>
    </div>
  );
}
