"use client";
import React, { useEffect, useState } from 'react';
import {
  listCampaigns, createCampaign, updateCampaign, deleteCampaign,
  listCampaignAgents, assignAgent, unassignAgent,
  listCampaignCustomers, assignCustomersToCampaign, removeCampaignCustomer,
  syncCampaignStatus, listUsers, listCustomers, listDialogScripts, formatError
} from '../lib/api';
import { Plus, Megaphone, X, Users, UserPlus, Trash2, Play, Pause, RefreshCw, Check, AlertCircle, Phone } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    expectedValue: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    expectedValue: '',
    onConfirm: () => {},
  });

  // Side drawers
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [drawerMode, setDrawerMode] = useState<'agents' | 'contacts'>('agents');

  // Agents
  const [campaignAgents, setCampaignAgents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Contacts
  const [campaignCustomers, setCampaignCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Scripts
  const [scripts, setScripts] = useState<any[]>([]);

  // Status
  const [syncing, setSyncing] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '', type: 'outbound', routing_type: 'round_robin', language: 'english',
    max_concurrent_calls: 2, phone_number: '', script_id: '',
    start_time: '09:00', end_time: '17:00',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [c, a, s, cust] = await Promise.all([
        listCampaigns(), listUsers('agent'), listDialogScripts(), listCustomers()
      ]);
      setCampaigns(c);
      setAgents(a);
      setScripts(s);
      setAllCustomers(cust);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    try {
      const data: any = { ...form, max_concurrent_calls: Number(form.max_concurrent_calls) };
      if (!data.script_id) delete data.script_id;
      await createCampaign(data);
      setShowCreate(false);
      setForm({ name: '', type: 'outbound', routing_type: 'round_robin', language: 'english', max_concurrent_calls: 2, phone_number: '', script_id: '', start_time: '09:00', end_time: '17:00' });
      load();
    } catch (e: any) { alert(formatError(e)); }
  };

  const toggleStatus = async (c: any) => {
    try {
      const newStatus = c.status === 'active' ? 'paused' : 'active';
      await updateCampaign(c.id, { status: newStatus });
      load();
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: formatError(e) });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleSyncStatus = async (campaignId: string) => {
    try {
      setSyncing(campaignId);
      await syncCampaignStatus(campaignId);
      await load();
      setStatusMsg({ type: 'ok', text: 'Stats synced from Dialog' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: formatError(e) });
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setSyncing(null);
    }
  };

  // ---- Agents drawer ----
  const openAgents = async (c: any) => {
    setSelectedCampaign(c);
    setDrawerMode('agents');
    const a = await listCampaignAgents(c.id);
    setCampaignAgents(a);
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedCampaign) return;
    await assignAgent(selectedCampaign.id, agentId);
    setCampaignAgents(await listCampaignAgents(selectedCampaign.id));
  };

  const handleUnassignAgent = async (agentId: string) => {
    if (!selectedCampaign) return;
    await unassignAgent(selectedCampaign.id, agentId);
    setCampaignAgents(await listCampaignAgents(selectedCampaign.id));
  };

  // ---- Contacts drawer ----
  const openContacts = async (c: any) => {
    setSelectedCampaign(c);
    setDrawerMode('contacts');
    setCampaignCustomers(await listCampaignCustomers(c.id));
    setCustomerSearch('');
  };

  const handleAssignCustomer = async (customerId: string) => {
    if (!selectedCampaign) return;
    try {
      await assignCustomersToCampaign(selectedCampaign.id, [customerId]);
      setCampaignCustomers(await listCampaignCustomers(selectedCampaign.id));
      load();
    } catch (e: any) { alert(formatError(e)); }
  };

  const handleRemoveCustomer = async (customerId: string) => {
    if (!selectedCampaign) return;
    await removeCampaignCustomer(selectedCampaign.id, customerId);
    setCampaignCustomers(await listCampaignCustomers(selectedCampaign.id));
    load();
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const contactStatusColors: Record<string, string> = {
    pending: 'text-zinc-400',
    called_answered: 'text-emerald-400',
    called_no_answer: 'text-amber-400',
    called_busy: 'text-red-400',
    converted: 'text-blue-400',
    failed: 'text-red-500',
  };

  const filteredCustomers = allCustomers.filter((c: any) =>
    !campaignCustomers.some((cc: any) => cc.customer_id === c.id) &&
    (customerSearch === '' ||
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch) ||
      c.company?.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Campaigns</h1>
        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${statusMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {statusMsg.type === 'ok' ? <Check className="h-3 w-3 inline mr-1" /> : <AlertCircle className="h-3 w-3 inline mr-1" />}
              {statusMsg.text}
            </span>
          )}
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>
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
                  <p className="text-xs text-zinc-500 capitalize">{c.type} · {c.routing_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.dialog_synced && (
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SYNCED
                  </span>
                )}
                <span className={`px-2 py-1 text-[10px] font-medium rounded-lg border ${statusColors[c.status] || ''}`}>
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
              <button onClick={() => openContacts(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/20 transition-colors">
                <Phone className="h-3 w-3" /> Contacts
              </button>
              <button onClick={() => openAgents(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 transition-colors">
                <Users className="h-3 w-3" /> Agents
              </button>
              {c.dialog_synced && (
                <button onClick={() => handleSyncStatus(c.id)} disabled={syncing === c.id} className="py-2 px-2.5 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-50" title="Refresh stats from Dialog">
                  <RefreshCw className={`h-3 w-3 ${syncing === c.id ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={() => {
                  setConfirmCfg({
                    isOpen: true,
                    title: 'Delete Campaign',
                    message: `Are you sure you want to permanently delete the campaign "${c.name}"? All associated contacts and progress will be lost.`,
                    expectedValue: c.name,
                    onConfirm: async () => {
                      setConfirmCfg(prev => ({ ...prev, isOpen: false }));
                      try {
                        await deleteCampaign(c.id);
                        load();
                      } catch (e: any) {
                        alert(formatError(e));
                      }
                    }
                  });
                }}
                className="py-2 px-2.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
              >
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
                <label className="block text-xs text-zinc-400 mb-1">Start Time</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">End Time</label>
                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
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

      {/* Side Drawer: Agents or Contacts */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
          <div className="w-[420px] bg-zinc-900 border-l border-zinc-700 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Drawer header with tabs */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-zinc-100">{selectedCampaign.name}</h2>
                <button onClick={() => setSelectedCampaign(null)}><X className="h-5 w-5 text-zinc-400" /></button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDrawerMode('contacts'); listCampaignCustomers(selectedCampaign.id).then(setCampaignCustomers); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${drawerMode === 'contacts' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  <Phone className="h-3 w-3 inline mr-1" /> Contacts ({campaignCustomers.length})
                </button>
                <button
                  onClick={() => { setDrawerMode('agents'); listCampaignAgents(selectedCampaign.id).then(setCampaignAgents); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${drawerMode === 'agents' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  <Users className="h-3 w-3 inline mr-1" /> Agents ({campaignAgents.length})
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Contacts Tab */}
              {drawerMode === 'contacts' && (
                <div className="space-y-4">
                  {/* Assigned contacts */}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-2">Assigned Contacts</h3>
                    <div className="space-y-2">
                      {campaignCustomers.map((cc: any) => (
                        <div key={cc.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 truncate">{cc.customer_name}</p>
                            <p className="text-xs text-zinc-500">{cc.customer_phone}</p>
                            {cc.customer_company && <p className="text-[10px] text-zinc-600">{cc.customer_company}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium capitalize ${contactStatusColors[cc.status] || 'text-zinc-500'}`}>
                              {cc.status.replace(/_/g, ' ')}
                            </span>
                            {!selectedCampaign.dialog_synced && (
                              <button onClick={() => handleRemoveCustomer(cc.customer_id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                      {campaignCustomers.length === 0 && <p className="text-xs text-zinc-500 text-center py-4">No contacts assigned yet</p>}
                    </div>
                  </div>

                  {/* Add contacts (only if not synced) */}
                  {!selectedCampaign.dialog_synced && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-400 mb-2">Add Contacts from CRM</h3>
                      <input
                        type="text" placeholder="Search by name, phone, company..."
                        value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-2"
                      />
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {filteredCustomers.slice(0, 20).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                              <p className="text-xs text-zinc-500">{c.phone}{c.company ? ` · ${c.company}` : ''}</p>
                            </div>
                            <button onClick={() => handleAssignCustomer(c.id)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 flex-shrink-0">
                              <UserPlus className="h-3 w-3 inline mr-0.5" /> Add
                            </button>
                          </div>
                        ))}
                        {filteredCustomers.length === 0 && <p className="text-xs text-zinc-500 text-center py-3">No matching customers</p>}
                        {filteredCustomers.length > 20 && <p className="text-xs text-zinc-500 text-center py-1">Showing first 20 — search to narrow down</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Agents Tab */}
              {drawerMode === 'agents' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-2">Assigned Agents</h3>
                    <div className="space-y-2">
                      {campaignAgents.map((ca: any) => (
                        <div key={ca.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                          <div>
                            <p className="text-sm text-zinc-200">{ca.agent_name}</p>
                            <p className="text-xs text-zinc-500">{ca.agent_email}</p>
                          </div>
                          <button onClick={() => handleUnassignAgent(ca.agent_id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                        </div>
                      ))}
                      {campaignAgents.length === 0 && <p className="text-xs text-zinc-500 text-center py-4">No agents assigned</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-2">Available Agents</h3>
                    <div className="space-y-2">
                      {agents.filter((a: any) => !campaignAgents.some((ca: any) => ca.agent_id === a.id)).map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                          <div>
                            <p className="text-sm text-zinc-200">{a.full_name}</p>
                            <p className="text-xs text-zinc-500">{a.email}</p>
                          </div>
                          <button onClick={() => handleAssignAgent(a.id)} className="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">Assign</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmCfg.isOpen}
        title={confirmCfg.title}
        message={confirmCfg.message}
        expectedValue={confirmCfg.expectedValue}
        isDestructive={true}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
