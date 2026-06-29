"use client";
import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { AgentDashboardView } from './AgentDashboardView';
import { BarChart3, Phone, Users, Megaphone, Clock, TrendingUp, ArrowUpRight, Activity, Zap } from 'lucide-react';

const GREET = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const SkeletonCard = () => (
  <div className="stat-card stat-violet p-5" style={{ minHeight: 110 }}>
    <div className="shimmer rounded-lg h-4 w-24 mb-3" />
    <div className="shimmer rounded-lg h-8 w-16 mb-2" />
    <div className="shimmer rounded-lg h-3 w-20" />
  </div>
);

export const DashboardView: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isAgent = user?.role === 'agent';

  // Agents get their own dedicated dashboard
  if (isAgent) return <AgentDashboardView />;

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  type StatColor = 'violet' | 'emerald' | 'sky' | 'amber' | 'rose' | 'indigo';

  const statCards: { label: string; value: string | number; subtext: string; icon: any; color: StatColor; trend?: string }[] = stats ? [
    { label: 'Total Campaigns', value: stats.campaigns?.total || 0, subtext: `${stats.campaigns?.active || 0} active`, icon: Megaphone, color: 'violet', trend: '+2 this week' },
    { label: 'Total Calls', value: stats.calls?.total || 0, subtext: `${stats.calls?.completed || 0} completed`, icon: Phone, color: 'emerald', trend: '+12% vs last week' },
    { label: 'CRM Customers', value: stats.customers?.total || 0, subtext: 'In database', icon: Users, color: 'sky' },
    { label: 'Agents Online', value: `${stats.agents?.online || 0} / ${stats.agents?.total || 0}`, subtext: 'Available now', icon: Activity, color: 'amber' },
    { label: 'Avg Handle Time', value: formatDuration(stats.calls?.avg_handling_time || 0), subtext: 'Per call', icon: Clock, color: 'rose' },
    { label: 'Total Talk Time', value: formatDuration(stats.calls?.total_duration_seconds || 0), subtext: 'All agents combined', icon: BarChart3, color: 'indigo' },
  ] : [];

  const planColorMap: Record<string, string> = {
    starter: '#0ea5e9',
    pro: '#8b5cf6',
    enterprise: '#f59e0b',
  };
  const planColor = planColorMap[tenant?.plan || ''] || '#8b5cf6';

  return (
    <div className="space-y-6">

      {/* ── Hero Welcome ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.08) 50%, rgba(8,12,20,0) 100%)',
          border: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        {/* Background glow orb */}
        <div
          style={{
            position: 'absolute', top: -40, right: -40,
            width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#8b5cf6' }}>
              {GREET()}, {user?.full_name?.split(' ')[0]} 👋
            </p>
            <h1 className="text-2xl font-bold text-white mb-1">
              {isAgent ? 'Your Agent Dashboard' : `${tenant?.name || 'Workspace'} Overview`}
            </h1>
            <p className="text-sm" style={{ color: '#64748b' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {tenant?.plan && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{
                  background: `${planColor}12`,
                  border: `1px solid ${planColor}30`,
                  color: planColor,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <Zap size={12} />
                {tenant.plan.toUpperCase()} Plan
              </div>
            )}
            <div
              className="px-3 py-1.5 rounded-xl"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards (manager/admin only) ── */}
      {!isAgent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className={`stat-card stat-${card.color} p-5`}>
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                        {card.label}
                      </p>
                      <div className={`stat-icon stat-${card.color}`} style={{ width: 36, height: 36 }}>
                        <Icon size={16} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs" style={{ color: '#475569' }}>{card.subtext}</p>
                      {card.trend && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                          <ArrowUpRight size={10} />{card.trend}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

    </div>
  );
};

