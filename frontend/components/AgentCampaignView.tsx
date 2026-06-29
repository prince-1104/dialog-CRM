"use client";
import React, { useEffect, useState } from 'react';
import { listMyCampaigns, listCampaignCustomers, dialContact, formatError } from '../lib/api';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/auth';
import { Megaphone, Phone, Users, Check, AlertCircle, RefreshCw, X, Play, Clock, Sparkles } from 'lucide-react';

export const AgentCampaignView: React.FC = () => {
  const { user } = useAuthStore();
  const { startRealCall, activeCall } = useStore();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignCustomers, setCampaignCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [dialingId, setDialingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await listMyCampaigns();
      setCampaigns(data);
    } catch (e) {
      console.error("Failed to load agent campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCampaign = async (campaign: any) => {
    setSelectedCampaign(campaign);
    try {
      setCustomersLoading(true);
      const customers = await listCampaignCustomers(campaign.id);
      setCampaignCustomers(customers);
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: `Failed to load contacts: ${formatError(e)}` });
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleDial = async (customer: any) => {
    if (!selectedCampaign) return;
    if (activeCall) {
      alert("Please end the active call before making a new one.");
      return;
    }
    
    try {
      setDialingId(customer.customer_id);
      setStatusMsg({ type: 'ok', text: `Dialing ${customer.customer_name || customer.customer_phone}...` });
      
      const callLog = await dialContact(selectedCampaign.id, customer.customer_id);
      
      // Update UI customer list status
      setCampaignCustomers(prev => 
        prev.map(c => c.customer_id === customer.customer_id ? { ...c, status: 'called_answered' } : c)
      );

      // Start the call session UI (CallBar will pop up)
      startRealCall(
        callLog.id, 
        customer.customer_id, 
        customer.customer_name || 'Unknown', 
        customer.customer_phone || '', 
        user?.full_name || 'Agent'
      );
      
      setStatusMsg({ type: 'ok', text: 'Call connected successfully' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: formatError(e) });
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setDialingId(null);
    }
  };

  const campaignStatusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const contactStatusColors: Record<string, string> = {
    pending: 'bg-zinc-950 border border-zinc-800 text-zinc-400',
    called_answered: 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400',
    called_no_answer: 'bg-amber-950/40 border border-amber-800/40 text-amber-400',
    called_busy: 'bg-red-950/40 border border-red-800/40 text-red-400',
    converted: 'bg-purple-950/40 border border-purple-800/40 text-purple-400',
    failed: 'bg-rose-950/40 border border-rose-800/40 text-rose-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">My Campaigns</h1>
          <p className="text-xs text-zinc-400">View and manually dial contacts for your assigned campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${statusMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {statusMsg.type === 'ok' ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {statusMsg.text}
            </span>
          )}
          <button 
            onClick={loadCampaigns} 
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Grid Layout: Campaigns on left, Contacts on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Assigned Campaigns List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Campaigns Directory</h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-zinc-900/20 border border-zinc-850 rounded-2xl">
              <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mb-3" />
              <p className="text-xs text-zinc-500 font-medium">Loading your campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/20 border border-zinc-850 rounded-2xl">
              <Megaphone className="h-8 w-8 text-zinc-650 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No Campaigns Assigned</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-[240px] mx-auto">You aren't assigned to any outbound campaign tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const isSelected = selectedCampaign?.id === c.id;
                return (
                  <div 
                    key={c.id} 
                    onClick={() => handleSelectCampaign(c)}
                    className={`bg-zinc-900/40 border rounded-2xl p-4.5 cursor-pointer hover:border-zinc-750 transition-all text-left ${isSelected ? 'border-purple-500/40 shadow bg-purple-950/5' : 'border-zinc-800'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${c.type === 'inbound' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
                          <Megaphone className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-200">{c.name}</h3>
                          <p className="text-[10px] text-zinc-500 capitalize">{c.type} · {c.routing_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded border ${campaignStatusColors[c.status] || ''}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-950/40 border border-zinc-850 rounded-xl p-2 text-center">
                      <div>
                        <span className="block text-[10px] text-zinc-500">Contacts</span>
                        <span className="text-xs font-mono font-bold text-zinc-300">{c.total_contacts}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Called</span>
                        <span className="text-xs font-mono font-bold text-zinc-300">{c.total_calls}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Converted</span>
                        <span className="text-xs font-mono font-bold text-zinc-300">{c.total_converted}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Campaign Contacts list */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCampaign ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contacts for {selectedCampaign.name}</h2>
                  <p className="text-[10px] text-zinc-500 font-medium">Select a contact and click call to manually dial</p>
                </div>
                {selectedCampaign.dialog_synced && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> DIALOG SYNCED
                  </span>
                )}
              </div>

              {customersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/35 border border-zinc-800 rounded-2xl">
                  <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mb-3" />
                  <p className="text-xs text-zinc-500 font-medium">Loading campaign contacts...</p>
                </div>
              ) : campaignCustomers.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/35 border border-zinc-800 rounded-2xl">
                  <Users className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">No contacts assigned</p>
                  <p className="text-xs text-zinc-500 mt-1">This campaign currently does not contain any contact leads.</p>
                </div>
              ) : (
                <div className="bg-zinc-900/35 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-850">
                  {campaignCustomers.map((cc) => {
                    const isDialing = dialingId === cc.customer_id;
                    const statusText = cc.status.replace('called_', '');
                    
                    return (
                      <div key={cc.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700/80 flex items-center justify-center font-bold text-zinc-200 text-xs shadow-inner">
                            {cc.customer_name ? cc.customer_name[0] : '#'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-200">{cc.customer_name || 'Unknown User'}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-zinc-500 font-mono">{cc.customer_phone}</span>
                              {cc.customer_company && (
                                <>
                                  <span className="text-zinc-650 text-[10px]">·</span>
                                  <span className="text-[10px] text-zinc-500 font-medium">{cc.customer_company}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full tracking-wider ${contactStatusColors[cc.status] || 'bg-zinc-950 text-zinc-400'}`}>
                            {statusText}
                          </span>
                          <button
                            onClick={() => handleDial(cc)}
                            disabled={isDialing || !!activeCall}
                            className={`p-2 rounded-xl border transition-all ${
                              cc.status === 'converted' 
                                ? 'bg-purple-950/20 border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white hover:border-transparent'
                                : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-transparent'
                            } disabled:opacity-30 disabled:pointer-events-none`}
                            title="Dial Outbound"
                          >
                            {isDialing ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Phone className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/20 border border-zinc-850 rounded-2xl border-dashed">
              <Megaphone className="h-8 w-8 text-zinc-750 mb-3" />
              <p className="text-xs font-semibold text-zinc-500">Select a campaign from the directory to start dialing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
