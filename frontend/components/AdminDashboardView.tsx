"use client";
import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../lib/api';
import { Building2, Users, TrendingUp, Activity, Shield, Globe } from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  type StatColor = 'amber' | 'emerald' | 'sky' | 'violet';
  const cards: { label: string; value: number; icon: any; color: StatColor; desc: string }[] = [
    { label: 'Total Tenants', value: stats?.total_tenants || 0, icon: Building2, color: 'amber', desc: 'Registered organizations' },
    { label: 'Active Tenants', value: stats?.active_tenants || 0, icon: TrendingUp, color: 'emerald', desc: 'Currently operational' },
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'sky', desc: 'Across all tenants' },
  ];

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(217,119,6,0.12) 0%, rgba(180,83,9,0.05) 50%, transparent 100%)',
          border: '1px solid rgba(217,119,6,0.2)',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} style={{ color: '#d97706' }} />
              <span className="text-sm font-semibold" style={{ color: '#d97706' }}>NMC Provider Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Platform Overview</h1>
            <p className="text-sm" style={{ color: '#57534e' }}>
              Real-time metrics across all tenants and users
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Platform Healthy</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6 space-y-3">
                <div className="shimmer rounded-lg h-4 w-28" />
                <div className="shimmer rounded-lg h-10 w-20" />
                <div className="shimmer rounded-lg h-3 w-36" />
              </div>
            ))
          : cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className={`stat-card stat-${card.color} p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>{card.label}</p>
                      <p className="text-xs" style={{ color: '#334155' }}>{card.desc}</p>
                    </div>
                    <div className={`stat-icon stat-${card.color}`} style={{ width: 40, height: 40 }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white">{card.value}</p>
                </div>
              );
            })
        }
      </div>

      {/* Platform info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="stat-icon stat-amber" style={{ width: 32, height: 32 }}><Globe size={14} /></div>
            <h3 className="text-sm font-semibold text-slate-200">Platform Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'API Gateway', status: 'Operational', ok: true },
              { label: 'Database', status: 'Operational', ok: true },
              { label: 'Redis Cache', status: 'Operational', ok: true },
              { label: 'Webhook Relay', status: 'Operational', ok: true },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
                <span className={`badge ${ok ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="stat-icon stat-violet" style={{ width: 32, height: 32 }}><Activity size={14} /></div>
            <h3 className="text-sm font-semibold text-slate-200">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Create New Tenant', desc: 'Onboard a new organization' },
              { label: 'View All Users', desc: 'Browse users across tenants' },
              { label: 'Platform Logs', desc: 'System activity & audit trail' },
            ].map(({ label, desc }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.06)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
              >
                <div>
                  <p className="text-xs font-semibold text-slate-300">{label}</p>
                  <p className="text-[10px]" style={{ color: '#475569' }}>{desc}</p>
                </div>
                <TrendingUp size={14} style={{ color: '#475569' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
