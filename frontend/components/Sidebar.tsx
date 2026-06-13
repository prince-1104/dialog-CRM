import React from 'react';
import { useStore, TabType } from '../store/useStore';
import { 
  LayoutGrid, 
  Users, 
  SquareStack, 
  Bot, 
  PhoneCall, 
  History, 
  Settings, 
  Mic,
  ChevronDown,
  Sparkles,
  LogOut
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    activeWorkspaceName, 
    userPlan 
  } = useStore();

  const menuItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutGrid },
    { id: 'contacts' as TabType, label: 'Contacts Directory', icon: Users },
    { id: 'pipelines' as TabType, label: 'Deals Pipeline', icon: SquareStack },
    { id: 'agents' as TabType, label: 'Team & Agents', icon: Bot, badge: 'Smart' },
    { id: 'campaigns' as TabType, label: 'Voice Campaigns', icon: PhoneCall },
    { id: 'calls' as TabType, label: 'Call Transcripts', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
        <div className="p-2 bg-purple-600/25 border border-purple-500/30 rounded-xl flex items-center justify-center glow-purple">
          <Mic className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Dialog CRM
          </h1>
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Voice AI Orchestrator</span>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 transition-all cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {activeWorkspaceName[0]}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-200 truncate w-28">{activeWorkspaceName}</span>
              <span className="text-[9px] text-zinc-500 font-medium flex items-center gap-1">
                <Sparkles className="h-2 w-2 text-purple-400" />
                Plan: {userPlan}
              </span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase px-3 mb-2 font-bold">Main Navigation</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? 'bg-purple-600/15 border border-purple-500/20 text-purple-200' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-950/80 text-purple-300 rounded border border-purple-800/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Profile */}
      <div className="p-4 border-t border-zinc-900">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" 
                alt="Avatar" 
                className="h-8.5 w-8.5 rounded-full border border-purple-500/40 object-cover"
              />
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-zinc-950 pulse-active"></div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-300">Olivia Vance</span>
              <span className="text-[10px] text-zinc-500">Sales Admin</span>
            </div>
          </div>
          <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
