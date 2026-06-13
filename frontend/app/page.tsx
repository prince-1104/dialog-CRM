"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';

// Layout
import { TenantSidebar } from '../components/TenantSidebar';
import { SuperAdminSidebar } from '../components/SuperAdminSidebar';

// Tenant views
import { DashboardView } from '../components/DashboardView';
import { CampaignsView } from '../components/CampaignsView';
import { CustomersView } from '../components/CustomersView';
import { TeamView } from '../components/TeamView';
import { ScriptsView } from '../components/ScriptsView';
import { CallLogsView } from '../components/CallLogsView';
import { ReportsView } from '../components/ReportsView';
import { SettingsView } from '../components/SettingsView';

// Super Admin views
import { AdminDashboardView } from '../components/AdminDashboardView';
import { TenantsView } from '../components/TenantsView';

export type TenantTab = 'dashboard' | 'campaigns' | 'customers' | 'team' | 'scripts' | 'call-logs' | 'reports' | 'settings';
export type AdminTab = 'admin-dashboard' | 'tenants';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, user, isSuperAdmin, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TenantTab | AdminTab>(
    isSuperAdmin ? 'admin-dashboard' : 'dashboard'
  );

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'dashboard') {
      setActiveTab('admin-dashboard');
    }
  }, [isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ========================================================================
  // SUPER ADMIN PORTAL
  // ========================================================================
  if (isSuperAdmin) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
        <SuperAdminSidebar activeTab={activeTab as AdminTab} setActiveTab={(t) => setActiveTab(t)} onLogout={logout} userName={user?.full_name || 'Super Admin'} />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <header className="h-14 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-zinc-200">NMC Super Admin</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">PROVIDER</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-zinc-950/20">
            {activeTab === 'admin-dashboard' && <AdminDashboardView />}
            {activeTab === 'tenants' && <TenantsView />}
          </main>
        </div>
      </div>
    );
  }

  // ========================================================================
  // TENANT PORTAL (Admin / Manager / Team Lead / Agent)
  // ========================================================================
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <TenantSidebar
        activeTab={activeTab as TenantTab}
        setActiveTab={(t) => setActiveTab(t)}
        onLogout={logout}
        userName={user?.full_name || ''}
        userRole={user?.role || ''}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-200 capitalize">{(activeTab as string).replace('-', ' ')}</h2>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
              {user?.role?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            API Connected
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 scrollbar-thin">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'campaigns' && <CampaignsView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'scripts' && <ScriptsView />}
          {activeTab === 'call-logs' && <CallLogsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
