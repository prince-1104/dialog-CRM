"use client";
import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../lib/api';
import { Building2, Users, TrendingUp } from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Platform Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Tenants', value: stats?.total_tenants || 0, icon: Building2, color: 'amber' },
          { label: 'Active Tenants', value: stats?.active_tenants || 0, icon: TrendingUp, color: 'emerald' },
          { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'blue' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">{card.label}</p>
                  <p className="text-3xl font-bold text-zinc-100 mt-1">{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 text-${card.color}-400/40`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
