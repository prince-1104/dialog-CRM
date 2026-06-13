import React from 'react';
import { AdminTab } from '../app/page';
import { LayoutGrid, Building2, LogOut, Shield } from 'lucide-react';

interface Props {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogout: () => void;
  userName: string;
}

export const SuperAdminSidebar: React.FC<Props> = ({ activeTab, setActiveTab, onLogout, userName }) => {
  const items: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'admin-dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
  ];

  return (
    <aside className="w-60 border-r border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex flex-col h-screen select-none">
      {/* Brand */}
      <div className="p-5 border-b border-zinc-900 flex items-center gap-3">
        <div className="p-2 bg-amber-600/25 border border-amber-500/30 rounded-xl flex items-center justify-center">
          <Shield className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            NMC Admin
          </h1>
          <span className="text-[9px] text-zinc-600 font-mono tracking-wider uppercase">Provider Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase px-3 mb-2 font-bold">Management</div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-amber-600/15 border border-amber-500/20 text-amber-200'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900">
        <div className="flex items-center justify-between p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
              {userName[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-300">{userName}</span>
              <span className="text-[10px] text-amber-400">Super Admin</span>
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
