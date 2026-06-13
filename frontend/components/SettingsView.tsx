"use client";
import React, { useEffect, useState } from 'react';
import { listDispositions, createDisposition } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Settings as SettingsIcon, Plus, X } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [showAddDisp, setShowAddDisp] = useState(false);
  const [dispForm, setDispForm] = useState({ name: '', category: 'neutral', sort_order: 0 });

  useEffect(() => { loadDisps(); }, []);
  const loadDisps = async () => { try { setDispositions(await listDispositions()); } catch {} };

  const handleAddDisp = async () => {
    await createDisposition(dispForm);
    setShowAddDisp(false);
    setDispForm({ name: '', category: 'neutral', sort_order: 0 });
    loadDisps();
  };

  const categoryColors: Record<string, string> = {
    positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    negative: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    callback: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold text-zinc-100">Settings</h1>

      {/* Workspace Info */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Workspace</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Name</span><span className="text-zinc-200">{tenant?.name}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Slug</span><span className="text-zinc-200 font-mono">{tenant?.slug}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Plan</span><span className="text-zinc-200 capitalize">{tenant?.plan}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Status</span><span className="text-zinc-200 capitalize">{tenant?.status}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Max Agents</span><span className="text-zinc-200">{tenant?.max_agents}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Max Campaigns</span><span className="text-zinc-200">{tenant?.max_campaigns}</span></div>
        </div>
      </div>

      {/* Dispositions */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Call Dispositions</h3>
          <button onClick={() => setShowAddDisp(true)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"><Plus className="h-3 w-3" /> Add</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {dispositions.map((d) => (
            <div key={d.id} className={`px-3 py-2 rounded-xl border text-sm ${categoryColors[d.category] || categoryColors.neutral}`}>
              <span>{d.name}</span>
              {d.is_system && <span className="text-[8px] ml-1 opacity-50">SYSTEM</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Add Disposition Modal */}
      {showAddDisp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-100">Add Disposition</h2><button onClick={() => setShowAddDisp(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            <div><label className="block text-xs text-zinc-400 mb-1">Name</label><input value={dispForm.name} onChange={(e) => setDispForm({ ...dispForm, name: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" /></div>
            <div><label className="block text-xs text-zinc-400 mb-1">Category</label><select value={dispForm.category} onChange={(e) => setDispForm({ ...dispForm, category: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200"><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option><option value="callback">Callback</option></select></div>
            <button onClick={handleAddDisp} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">Add</button>
          </div>
        </div>
      )}
    </div>
  );
};
