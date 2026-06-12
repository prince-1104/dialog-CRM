import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Search, 
  Bell, 
  HelpCircle,
  PhoneIncoming,
  CheckCircle,
  Calendar
} from 'lucide-react';

export const Header: React.FC = () => {
  const { activeTab, receiveSimulatedCall } = useStore();
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // Capitalize view title
  const viewTitle = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  const mockTriggerCall = () => {
    // Generate simulated incoming call
    receiveSimulatedCall("Dr. Alistair Thorne", "+44 20 7946 0958", "Sarah AI");
  };

  return (
    <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-6 select-none z-10">
      {/* View Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-zinc-100 tracking-wide">{viewTitle}</h2>
        <div className="h-4 w-px bg-zinc-800"></div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 font-medium font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          REST API: Connected
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search leads, calls, transcripts..." 
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-900/40 border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 text-xs rounded-xl text-zinc-200 placeholder-zinc-500 outline-none transition-all"
          />
        </div>

        {/* Demo trigger call */}
        <button 
          onClick={mockTriggerCall}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all glow-emerald"
        >
          <PhoneIncoming className="h-3.5 w-3.5" />
          <span>Simulate Inbound</span>
        </button>

        {/* Support Help */}
        <button className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 rounded-xl transition-colors">
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button 
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 rounded-xl transition-colors relative"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-purple-500 border border-zinc-950"></span>
          </button>

          {/* Quick Notifications overlay */}
          {showNotificationPopup && (
            <div className="absolute right-0 mt-2 w-80 glass-panel p-4 rounded-2xl shadow-2xl z-50 text-left">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-zinc-200">Recent Alerts</span>
                <button className="text-[10px] text-purple-400 hover:underline">Mark all read</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs">
                  <div className="p-1 rounded bg-purple-500/10 text-purple-400 mt-0.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-zinc-300 font-medium">Proposal Outbound call processed</p>
                    <p className="text-[10px] text-zinc-500">John Peterson call matched Positive Sentiment</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <div className="p-1 rounded bg-zinc-800 text-zinc-400 mt-0.5">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-zinc-300 font-medium">Daily AI digest is ready</p>
                    <p className="text-[10px] text-zinc-500">Calculated 89% automation success today</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
