"use client";
import React, { useState, useRef, useEffect } from 'react';
import { TenantTab } from '../app/page';
import { useAuthStore } from '../store/auth';
import {
  LayoutDashboard, Megaphone, Users, UserCog, FileText,
  Phone, BarChart3, Settings, LogOut, PhoneCall, Zap, Monitor,
  X, Building2, Hash, Package, Shield, Mail, PhoneIcon, Layers
} from 'lucide-react';

interface Props {
  activeTab: TenantTab;
  setActiveTab: (tab: TenantTab) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  userStatus?: string;
}

const MENU_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard' as TenantTab, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'campaigns' as TenantTab, label: 'Campaigns', icon: Megaphone },
      { id: 'dialer' as TenantTab, label: 'Dialer', icon: PhoneCall },
      { id: 'customers' as TenantTab, label: 'CRM Customers', icon: Users },
    ],
  },
  {
    label: 'Management',
    minRole: 'manager',
    items: [
      { id: 'monitor' as TenantTab, label: 'Live Monitor', icon: Monitor, minRole: 'manager' },
      { id: 'team' as TenantTab, label: 'Team & Agents', icon: UserCog, minRole: 'manager' },
      { id: 'scripts' as TenantTab, label: 'Call Scripts', icon: FileText, minRole: 'manager' },
      { id: 'reports' as TenantTab, label: 'Reports', icon: BarChart3, minRole: 'manager' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'call-logs' as TenantTab, label: 'Call Logs', icon: Phone },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings' as TenantTab, label: 'Settings', icon: Settings, minRole: 'tenant_admin' },
    ],
  },
];

const ROLE_LEVELS: Record<string, number> = {
  agent: 1, team_lead: 2, manager: 3, tenant_admin: 4,
};

const PLAN_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: 'rgba(14,165,233,0.12)', text: '#7dd3fc', border: 'rgba(14,165,233,0.3)' },
  pro:     { bg: 'rgba(139,92,246,0.12)', text: '#c4b5fd', border: 'rgba(139,92,246,0.3)' },
  enterprise: { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
};

// ── Profile Popover ────────────────────────────────────────────────────────
interface PopoverProps {
  onClose: () => void;
  onLogout: () => void;
  userStatus?: string;
}

const ProfilePopover: React.FC<PopoverProps> = ({ onClose, onLogout, userStatus }) => {
  const { user, tenant } = useAuthStore();
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && ref.current.contains(e.target as Node)) return;
      
      // If clicking the toggle button, let the toggle button's own onClick handler handle it
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('[data-profile-toggle="true"]')) {
        return;
      }
      
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const plan = tenant?.plan || 'starter';
  const planCfg = PLAN_COLOR[plan] || PLAN_COLOR.starter;
  const statusDot = userStatus === 'online' ? '#10b981' : userStatus === 'away' ? '#f59e0b' : '#475569';

  const InfoRow = ({ icon: Icon, label, value, mono = false }: { icon: any; label: string; value?: string | number; mono?: boolean }) => (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={12} style={{ color: '#64748b' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>{label}</p>
        <p className={`text-xs font-semibold text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className="fade-in-up"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 8,
        right: 8,
        zIndex: 100,
        background: '#161f30',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>Your Profile</span>
          <button
            onClick={onClose}
            style={{ color: '#475569', padding: 2, borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            <X size={13} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div
            className="avatar avatar-md shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontSize: '0.85rem' }}
          >
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
            <p className="text-[10px] truncate" style={{ color: '#64748b' }}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="badge"
                style={{
                  fontSize: '0.6rem', padding: '1px 6px',
                  background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', borderColor: 'rgba(139,92,246,0.3)'
                }}
              >
                {user?.role?.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: statusDot }} />
                <span className="text-[10px] capitalize" style={{ color: statusDot }}>
                  {userStatus || 'offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile fields */}
      <div style={{ padding: '4px 16px 0' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest py-2" style={{ color: '#334155' }}>Account</p>
        {user?.phone && <InfoRow icon={PhoneIcon} label="Phone" value={user.phone} mono />}
        {(user?.skills?.length || 0) > 0 && (
          <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={12} style={{ color: '#64748b' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Skills</p>
              <div className="flex flex-wrap gap-1">
                {user?.skills?.map((s, i) => (
                  <span key={i} className="badge" style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.2)' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workspace fields */}
      <div style={{ padding: '0 16px' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest py-2" style={{ color: '#334155' }}>Workspace</p>
        <InfoRow icon={Building2} label="Name" value={tenant?.name} />
        <InfoRow icon={Hash} label="Slug" value={tenant?.slug} mono />
        <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={12} style={{ color: '#64748b' }} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>Plan</p>
            <span
              className="badge"
              style={{ fontSize: '0.6rem', padding: '2px 7px', marginTop: 2, background: planCfg.bg, color: planCfg.text, borderColor: planCfg.border }}
            >
              {plan.toUpperCase()}
            </span>
          </div>
        </div>
        <InfoRow icon={UserCog} label="Max Agents" value={tenant?.max_agents} />
        <InfoRow icon={Megaphone} label="Max Campaigns" value={tenant?.max_campaigns} />
      </div>

      {/* Sign out */}
      <div style={{ padding: '8px 12px 12px' }}>
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="btn-danger w-full justify-center"
          style={{ borderRadius: 10 }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
};


// ── Sidebar ────────────────────────────────────────────────────────────────
export const TenantSidebar: React.FC<Props> = ({ activeTab, setActiveTab, onLogout, userName, userRole, userStatus }) => {
  const userLevel = ROLE_LEVELS[userRole] || 1;
  const [showProfile, setShowProfile] = useState(false);

  const statusDot = userStatus === 'online' ? '#10b981' : userStatus === 'away' ? '#f59e0b' : '#334155';
  const statusGlow = userStatus === 'online' ? '0 0 6px rgba(16,185,129,0.7)' : 'none';

  return (
    <aside
      className="flex flex-col h-screen select-none"
      style={{
        width: 240,
        background: 'linear-gradient(180deg, #0d1120 0%, #080c14 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* ── Brand ── */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="glow-purple"
          style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm text-white tracking-tight">NMC Dialer</div>
          <div className="text-[10px] font-medium" style={{ color: '#475569' }}>Contact Center</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {MENU_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => {
            const minR = (item as any).minRole;
            if (!minR) return true;
            return userLevel >= (ROLE_LEVELS[minR] || 0);
          });
          if (visibleItems.length === 0) return null;
          if (group.minRole && userLevel < (ROLE_LEVELS[group.minRole] || 0)) return null;

          return (
            <div key={group.label}>
              <div
                className="px-3 mb-1.5 font-bold uppercase tracking-widest"
                style={{ fontSize: '0.65rem', color: '#334155', letterSpacing: '0.1em' }}
              >
                {group.label}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon
                        size={16}
                        style={{ color: isActive ? '#a78bfa' : '#475569', flexShrink: 0 }}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
        {/* ── Profile Popover ── */}
        {showProfile && (
          <ProfilePopover
            onClose={() => setShowProfile(false)}
            onLogout={onLogout}
            userStatus={userStatus}
          />
        )}

        <div className="flex items-center gap-2">

          {/* Clickable profile area */}
          <button
            onClick={() => setShowProfile(v => !v)}
            data-profile-toggle="true"
            className="flex items-center gap-2.5 flex-1 min-w-0 p-2.5 rounded-xl transition-all text-left"
            style={{
              background: showProfile ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showProfile ? 'rgba(139,92,246,0.25)' : 'transparent'}`,
            }}
            onMouseEnter={e => {
              if (!showProfile) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
              if (!showProfile) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            }}
            title="View profile & workspace"
          >
            {/* Avatar */}
            <div
              className="avatar avatar-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}
            >
              {userName[0]?.toUpperCase() || 'U'}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: statusDot, boxShadow: statusGlow }} />
                <div className="text-xs font-semibold text-slate-200 truncate">{userName}</div>
              </div>
              <div className="text-[10px] capitalize truncate" style={{ color: '#64748b' }}>
                {userRole.replace(/_/g, ' ')}
              </div>
            </div>
          </button>

          {/* Sign out (quick) */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl transition-colors shrink-0"
            style={{ color: '#475569', background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#fb7185';
              (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#475569';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
