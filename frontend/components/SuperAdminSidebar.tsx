"use client";
import React from 'react';
import { AdminTab } from '../app/page';
import { LayoutDashboard, Building2, LogOut, Shield } from 'lucide-react';

interface Props {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogout: () => void;
  userName: string;
}

const ITEMS: { id: AdminTab; label: string; icon: any; desc: string }[] = [
  { id: 'admin-dashboard', label: 'Overview', icon: LayoutDashboard, desc: 'Platform metrics' },
  { id: 'tenants', label: 'Tenants', icon: Building2, desc: 'Manage organizations' },
];

export const SuperAdminSidebar: React.FC<Props> = ({ activeTab, setActiveTab, onLogout, userName }) => {
  return (
    <aside
      className="flex flex-col h-screen select-none"
      style={{
        width: 240,
        background: 'linear-gradient(180deg, #0f0a00 0%, #080c14 100%)',
        borderRight: '1px solid rgba(245,158,11,0.1)',
        flexShrink: 0,
      }}
    >
      {/* ── Brand ── */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.08)' }}>
        <div
          className="glow-amber"
          style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm text-white tracking-tight">NMC Admin</div>
          <div className="text-[10px] font-medium" style={{ color: '#78350f' }}>Provider Portal</div>
        </div>
      </div>

      {/* ── Provider badge ── */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">Super Admin Session</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <div
          className="px-3 mb-2 font-bold uppercase tracking-widest"
          style={{ fontSize: '0.65rem', color: '#78350f', letterSpacing: '0.1em' }}
        >
          Management
        </div>
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{
                background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(245,158,11,0.25)' : 'transparent'}`,
                color: isActive ? '#fbbf24' : '#78716c',
                fontSize: '0.8375rem',
                fontWeight: 500,
              }}
            >
              <Icon size={16} style={{ color: isActive ? '#fbbf24' : '#57534e', flexShrink: 0 }} />
              <div>
                <div>{item.label}</div>
                <div style={{ fontSize: '0.65rem', color: '#57534e', fontWeight: 400 }}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(245,158,11,0.08)' }}>
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.04)' }}
        >
          <div
            className="avatar avatar-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white' }}
          >
            {userName[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{userName}</div>
            <div className="text-[10px]" style={{ color: '#d97706' }}>Super Admin</div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#57534e' }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
