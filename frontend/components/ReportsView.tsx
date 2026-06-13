"use client";
import React, { useEffect, useState } from 'react';
import { getDashboardStats, getAgentReport } from '../lib/api';
import { BarChart3, Users, Phone, Clock } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([getDashboardStats(), getAgentReport()])
      .then(([s, a]) => { setStats(s); setAgents(a); })
      .catch(console.error);
  }, []);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Reports & Analytics</h1>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Calls', value: stats.calls?.total || 0, icon: Phone, color: 'purple' },
            { label: 'Completed', value: stats.calls?.completed || 0, icon: BarChart3, color: 'emerald' },
            { label: 'Avg Handle Time', value: formatDuration(stats.calls?.avg_handling_time || 0), icon: Clock, color: 'blue' },
            { label: 'Agents Online', value: `${stats.agents?.online || 0}/${stats.agents?.total || 0}`, icon: Users, color: 'amber' },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">{c.label}</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">{c.value}</p>
                  </div>
                  <Icon className="h-6 w-6 text-zinc-600" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Performance */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200">Agent Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Agent</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Total Calls</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Completed</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Talk Time</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Avg Call</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a: any) => (
              <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                <td className="px-4 py-3 text-zinc-200 font-medium">{a.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${a.status === 'online' ? 'bg-emerald-500' : a.status === 'away' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                    <span className="text-xs text-zinc-400 capitalize">{a.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-400">{a.total_calls}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{a.completed_calls}</td>
                <td className="px-4 py-3 text-right text-zinc-400 font-mono text-xs">{formatDuration(a.total_duration)}</td>
                <td className="px-4 py-3 text-right text-zinc-400 font-mono text-xs">{formatDuration(a.avg_call_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {agents.length === 0 && <div className="text-center text-zinc-500 py-8">No agent data available.</div>}
      </div>
    </div>
  );
};
