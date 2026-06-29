"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';

// Layout
import { TenantSidebar } from '../components/TenantSidebar';
import { SuperAdminSidebar } from '../components/SuperAdminSidebar';
import { CallBar } from '../components/CallBar';

// Tenant views
import { DashboardView } from '../components/DashboardView';
import { CampaignsView } from '../components/CampaignsView';
import { AgentCampaignView } from '../components/AgentCampaignView';
import { CustomersView } from '../components/CustomersView';
import { TeamView } from '../components/TeamView';
import { ScriptsView } from '../components/ScriptsView';
import { CallLogsView } from '../components/CallLogsView';
import { ReportsView } from '../components/ReportsView';
import { SettingsView } from '../components/SettingsView';
import { DialerView } from '../components/DialerView';
import { MonitorView } from '../components/MonitorView';

// Super Admin views
import { AdminDashboardView } from '../components/AdminDashboardView';
import { TenantsView } from '../components/TenantsView';

export type TenantTab = 'dashboard' | 'campaigns' | 'customers' | 'team' | 'scripts' | 'call-logs' | 'reports' | 'settings' | 'dialer' | 'monitor';
export type AdminTab = 'admin-dashboard' | 'tenants';

const TAB_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'campaigns': 'Campaigns',
  'dialer': 'Dialer',
  'customers': 'CRM Customers',
  'team': 'Team & Agents',
  'scripts': 'Call Scripts',
  'call-logs': 'Call Logs',
  'reports': 'Reports',
  'settings': 'Settings',
  'monitor': 'Live Monitor',
  'admin-dashboard': 'Platform Overview',
  'tenants': 'Tenants',
};

function AppHeader({ label, badge, badgeColor }: { label: string; badge?: string; badgeColor?: string }) {
  return (
    <header
      className="glass flex items-center justify-between px-6"
      style={{
        height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-slate-100" style={{ fontSize: '0.9375rem' }}>{label}</h2>
        {badge && (
          <span
            className="badge"
            style={{
              fontSize: '0.6rem',
              fontFamily: 'monospace',
              background: badgeColor === 'amber' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
              color: badgeColor === 'amber' ? '#fbbf24' : '#34d399',
              borderColor: badgeColor === 'amber' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)',
              borderRadius: 6,
              padding: '3px 8px',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: '#475569' }}>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
        <span>API Connected</span>
      </div>
    </header>
  );
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, user, isSuperAdmin, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TenantTab | AdminTab>(
    isSuperAdmin ? 'admin-dashboard' : 'dashboard'
  );

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'dashboard') setActiveTab('admin-dashboard');
  }, [isSuperAdmin]);

  if (isLoading) {
    return (
      <div
        style={{ background: '#080c14' }}
        className="h-screen w-screen flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div
            style={{
              width: 44, height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            className="glow-purple animate-pulse"
          >
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium" style={{ color: '#475569' }}>Initializing workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ── SUPER ADMIN PORTAL ──────────────────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#080c14', color: '#f1f5f9' }}>
        <SuperAdminSidebar
          activeTab={activeTab as AdminTab}
          setActiveTab={(t) => setActiveTab(t)}
          onLogout={logout}
          userName={user?.full_name || 'Super Admin'}
        />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <AppHeader
            label={TAB_LABELS[activeTab as string] || String(activeTab)}
            badge="PROVIDER"
            badgeColor="amber"
          />
          <main className="flex-1 overflow-y-auto p-6" style={{ background: 'rgba(8,12,20,0.5)' }}>
            <div className="fade-in">
              {activeTab === 'admin-dashboard' && <AdminDashboardView />}
              {activeTab === 'tenants' && <TenantsView />}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── TENANT PORTAL ───────────────────────────────────────────────────────
  const roleLabel = user?.role?.replace(/_/g, ' ').toUpperCase() || '';

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#080c14', color: '#f1f5f9' }}>
      <TenantSidebar
        activeTab={activeTab as TenantTab}
        setActiveTab={(t) => setActiveTab(t)}
        onLogout={logout}
        userName={user?.full_name || ''}
        userRole={user?.role || ''}
        userStatus={user?.availability_status || 'offline'}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <AppHeader
          label={TAB_LABELS[activeTab as string] || String(activeTab)}
          badge={roleLabel}
          badgeColor="emerald"
        />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'rgba(8,12,20,0.5)' }}>
          <div className="fade-in">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'campaigns' && (user?.role === 'agent' ? <AgentCampaignView /> : <CampaignsView />)}
            {activeTab === 'customers' && <CustomersView />}
            {activeTab === 'team' && <TeamView />}
            {activeTab === 'monitor' && <MonitorView />}
            {activeTab === 'scripts' && <ScriptsView />}
            {activeTab === 'call-logs' && <CallLogsView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'dialer' && <DialerView />}
          </div>
        </main>
      </div>
      <CallBar />
    </div>
  );
}
