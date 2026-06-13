"use client";
import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { BarChart3, Phone, Users, Megaphone, Clock, TrendingUp } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const statCards = stats ? [
    { label: 'Total Campaigns', value: stats.campaigns?.total || 0, subtext: `${stats.campaigns?.active || 0} active`, icon: Megaphone, color: 'purple' },
    { label: 'Total Calls', value: stats.calls?.total || 0, subtext: `${stats.calls?.completed || 0} completed`, icon: Phone, color: 'emerald' },
    { label: 'CRM Customers', value: stats.customers?.total || 0, subtext: 'In database', icon: Users, color: 'blue' },
    { label: 'Active Agents', value: `${stats.agents?.online || 0} / ${stats.agents?.total || 0}`, subtext: 'Online now', icon: TrendingUp, color: 'amber' },
    { label: 'Avg Handling Time', value: formatDuration(stats.calls?.avg_handling_time || 0), subtext: 'Per call', icon: Clock, color: 'pink' },
    { label: 'Total Talk Time', value: formatDuration(stats.calls?.total_duration_seconds || 0), subtext: 'All agents', icon: BarChart3, color: 'indigo' },
  ] : [];

  const colorMap: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Welcome back, {user?.full_name}</h1>
        <p className="text-sm text-zinc-500 mt-1">{tenant?.name} - {tenant?.plan?.toUpperCase()} Plan</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const colors = colorMap[card.color] || colorMap.purple;
          return (
            <div key={i} className={`bg-gradient-to-br ${colors} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{card.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{card.subtext}</p>
                </div>
                <div className={`p-2 rounded-xl bg-zinc-950/40`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Workspace Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Workspace</span><span className="text-zinc-200">{tenant?.name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Slug</span><span className="text-zinc-200 font-mono">{tenant?.slug}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Plan</span><span className="text-zinc-200 capitalize">{tenant?.plan}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Max Agents</span><span className="text-zinc-200">{tenant?.max_agents}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Max Campaigns</span><span className="text-zinc-200">{tenant?.max_campaigns}</span></div>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Your Profile</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Name</span><span className="text-zinc-200">{user?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Email</span><span className="text-zinc-200">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Role</span><span className="text-zinc-200 capitalize">{user?.role?.replace('_', ' ')}</span></div>
            {user?.phone && <div className="flex justify-between"><span className="text-zinc-500">Phone</span><span className="text-zinc-200">{user.phone}</span></div>}
            {(user?.skills?.length || 0) > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-zinc-500">Skills</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {user?.skills?.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-300 rounded border border-purple-500/20">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
