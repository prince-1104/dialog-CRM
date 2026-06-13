import React from 'react';
import { TenantTab } from '../app/page';
import {
  LayoutGrid, Megaphone, Users, UserCog, FileText,
  Phone, BarChart3, Settings, LogOut
} from 'lucide-react';

interface Props {
  activeTab: TenantTab;
  setActiveTab: (tab: TenantTab) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
}

const MENU_ITEMS: { id: TenantTab; label: string; icon: any; minRole?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'customers', label: 'CRM Customers', icon: Users },
  { id: 'team', label: 'Team & Agents', icon: UserCog, minRole: 'manager' },
  { id: 'scripts', label: 'Call Scripts', icon: FileText, minRole: 'manager' },
  { id: 'call-logs', label: 'Call Logs', icon: Phone },
  { id: 'reports', label: 'Reports', icon: BarChart3, minRole: 'manager' },
  { id: 'settings', label: 'Settings', icon: Settings, minRole: 'tenant_admin' },
];

const ROLE_LEVELS: Record<string, number> = {
  agent: 1, team_lead: 2, manager: 3, tenant_admin: 4,
};

export const TenantSidebar: React.FC<Props> = ({ activeTab, setActiveTab, onLogout, userName, userRole }) => {
  const userLevel = ROLE_LEVELS[userRole] || 1;

  const visibleItems = MENU_ITEMS.filter(item => {
    if (!item.minRole) return true;
    return userLevel >= (ROLE_LEVELS[item.minRole] || 0);
  });

  return (
    <aside className="w-60 border-r border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex flex-col h-screen select-none">
      {/* Brand */}
      <div className="p-5 border-b border-zinc-900 flex items-center gap-3">
        <div className="p-2 bg-purple-600/25 border border-purple-500/30 rounded-xl flex items-center justify-center">
          <Phone className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            NMC Dialer
          </h1>
          <span className="text-[9px] text-zinc-600 font-mono tracking-wider uppercase">Contact Center</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase px-3 mb-2 font-bold">Navigation</div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-purple-600/15 border border-purple-500/20 text-purple-200'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {userName[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-300 truncate w-28">{userName}</span>
              <span className="text-[10px] text-zinc-500 capitalize">{userRole.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onLogout} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
