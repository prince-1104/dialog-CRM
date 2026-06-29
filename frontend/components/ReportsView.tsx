"use client";
import React, { useEffect, useState } from 'react';
import { getDashboardStats, getAgentReport } from '../lib/api';
import { BarChart3, Users, Phone, Clock, Trophy, TrendingUp } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getAgentReport()])
      .then(([s, a]) => { setStats(s); setAgents(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const statusDot = (status: string) => {
    if (status === 'online') return 'bg-emerald-500';
    if (status === 'away') return 'bg-amber-500';
    return 'bg-zinc-600';
  };

  type StatColor = 'violet' | 'emerald' | 'sky' | 'amber';
  const kpiCards: { label: string; value: string | number; icon: any; color: StatColor }[] = stats ? [
    { label: 'Total Calls', value: stats.calls?.total || 0, icon: Phone, color: 'violet' },
    { label: 'Completed', value: stats.calls?.completed || 0, icon: BarChart3, color: 'emerald' },
    { label: 'Avg Handle Time', value: fmt(stats.calls?.avg_handling_time || 0), icon: Clock, color: 'sky' },
    { label: 'Agents Online', value: `${stats.agents?.online || 0}/${stats.agents?.total || 0}`, icon: Users, color: 'amber' },
  ] : [];

  // Sort agents by total_calls desc for leaderboard
  const sortedAgents = [...agents].sort((a, b) => (b.total_calls || 0) - (a.total_calls || 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Performance metrics across agents and campaigns</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3"><div className="shimmer rounded h-4 w-24" /><div className="shimmer rounded h-8 w-16" /></div>
            ))
          : kpiCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className={`stat-card stat-${c.color} p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{c.label}</p>
                    <div className={`stat-icon stat-${c.color}`} style={{ width: 34, height: 34 }}><Icon size={14} /></div>
                  </div>
                  <p className="text-3xl font-bold text-white">{c.value}</p>
                </div>
              );
            })}
      </div>

      {/* Agent Leaderboard */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="stat-icon stat-amber" style={{ width: 30, height: 30 }}><Trophy size={13} /></div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Agent Leaderboard</h3>
            <p className="text-[10px]" style={{ color: '#475569' }}>Ranked by total calls handled</p>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Agent</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Calls</th>
              <th style={{ textAlign: 'right' }}>Completed</th>
              <th style={{ textAlign: 'right' }}>Total Talk</th>
              <th style={{ textAlign: 'right' }}>Avg/Call</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="shimmer rounded h-4 w-full max-w-[80px]" /></td>
                  ))}
                </tr>
              ))
            ) : sortedAgents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#334155' }}>
                  <Users size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p className="text-sm">No agent data yet</p>
                </td>
              </tr>
            ) : (
              sortedAgents.map((a, idx) => {
                const pct = a.total_calls > 0 ? Math.round((a.completed_calls / a.total_calls) * 100) : 0;
                return (
                  <tr key={a.id}>
                    <td>
                      <span className="font-bold text-xs" style={{ color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#334155' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontSize: '0.65rem' }}>
                          {a.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-semibold text-slate-200 text-xs">{a.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusDot(a.status)}`} />
                        <span className="text-xs capitalize" style={{ color: '#64748b' }}>{a.status || 'offline'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#f1f5f9' }}>{a.total_calls || 0}</td>
                    <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 600 }}>{a.completed_calls || 0}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>{fmt(a.total_duration || 0)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem' }}>{fmt(a.avg_call_time || 0)}</td>
                    <td style={{ width: 120 }}>
                      <div className="flex items-center gap-2">
                        <div className="progress-track flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[10px] font-mono" style={{ color: '#475569', width: 30, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
