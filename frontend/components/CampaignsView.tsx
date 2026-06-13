"use client";
import React, { useEffect, useState } from 'react';
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, listCampaignAgents, assignAgent, unassignAgent, listUsers, listScripts } from '../lib/api';
import { Plus, Megaphone, X, Users, Trash2, Play, Pause } from 'lucide-react';

export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignAgents, setCampaignAgents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'outbound', routing_type: 'round_robin', language: 'english', max_concurrent_calls: 2, phone_number: '', script_id: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [c, a, s] = await Promise.all([listCampaigns(), listUsers('agent'), listScripts()]);
      setCampaigns(c);
      setAgents(a);
      setScripts(s);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    try {
      const data: any = { ...form, max_concurrent_calls: Number(form.max_concurrent_calls) };
      if (!data.script_id) delete data.script_id;
      await createCampaign(data);
      setShowCreate(false);
      setForm({ name: '', type: 'outbound', routing_type: 'round_robin', language: 'english', max_concurrent_calls: 2, phone_number: '', script_id: '' });
      load();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Failed'); }
  };

  const toggleStatus = async (c: any) => {
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await updateCampaign(c.id, { status: newStatus });
    load();
  };

  const viewAgents = async (c: any) => {
    setSelectedCampaign(c);
    const a = await listCampaignAgents(c.id);
    setCampaignAgents(a);
  };

  const handleAssign = async (agentId: string) => {
    if (!selectedCampaign) return;
    await assignAgent(selectedCampaign.id, agentId);
    const a = await listCampaignAgents(selectedCampaign.id);
    setCampaignAgents(a);
  };

  const handleUnassign = async (agentId: string) => {
    if (!selectedCampaign) return;
    await unassignAgent(selectedCampaign.id, agentId);
    const a = await listCampaignAgents(selectedCampaign.id);
    setCampaignAgents(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Campaigns</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.type === 'inbound' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                  <Megaphone className={`h-5 w-5 ${c.type === 'inbound' ? 'text-emerald-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{c.name}</h3>
                  <p className="text-xs text-zinc-500 capitalize">{c.type} - {c.routing_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-[10px] font-medium rounded-lg ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : c.status === 'draft' ? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {c.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {[
                { label: 'Contacts', value: c.total_contacts },
                { label: 'Calls', value: c.total_calls },
                { label: 'Answered', value: c.total_answered },
                { label: 'Converted', value: c.total_converted },
              ].map((s, i) => (
                <div key={i} className="bg-zinc-950/40 rounded-lg px-2 py-1.5">
                  <p className="text-lg font-bold text-zinc-200">{s.value}</p>
                  <p className="text-[10px] text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => toggleStatus(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                {c.status === 'active' ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
              </button>
              <button onClick={() => viewAgents(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 transition-colors">
                <Users className="h-3 w-3" /> Agents
              </button>
              <button onClick={async () => { if (confirm('Delete?')) { await deleteCampaign(c.id); load(); }}} className="py-2 px-3 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && <div className="text-center text-zinc-500 py-12">No campaigns yet. Create your first campaign.</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Create Campaign</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Campaign Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200">
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Routing</label>
                <select value={form.routing_type} onChange={(e) => setForm({ ...form, routing_type: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200">
                  <option value="round_robin">Round Robin</option>
                  <option value="skill_based">Skill Based</option>
                  <option value="language_based">Language Based</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Phone Number (DID)</label>
                <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+91..." className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Call Script</label>
                <select value={form.script_id} onChange={(e) => setForm({ ...form, script_id: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200">
                  <option value="">No script</option>
                  {scripts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors">Create Campaign</button>
          </div>
        </div>
      )}

      {/* Agents Drawer */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
          <div className="w-96 bg-zinc-900 border-l border-zinc-700 h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">Assigned Agents</h2>
              <button onClick={() => setSelectedCampaign(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">{selectedCampaign.name}</p>

            {/* Assigned */}
            <div className="space-y-2 mb-6">
              {campaignAgents.map((ca: any) => (
                <div key={ca.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                  <div>
                    <p className="text-sm text-zinc-200">{ca.agent_name}</p>
                    <p className="text-xs text-zinc-500">{ca.agent_email}</p>
                  </div>
                  <button onClick={() => handleUnassign(ca.agent_id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              ))}
              {campaignAgents.length === 0 && <p className="text-xs text-zinc-500">No agents assigned</p>}
            </div>

            {/* Available agents to assign */}
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Available Agents</h3>
            <div className="space-y-2">
              {agents.filter((a: any) => !campaignAgents.some((ca: any) => ca.agent_id === a.id)).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                  <div>
                    <p className="text-sm text-zinc-200">{a.full_name}</p>
                    <p className="text-xs text-zinc-500">{a.email}</p>
                  </div>
                  <button onClick={() => handleAssign(a.id)} className="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">Assign</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
