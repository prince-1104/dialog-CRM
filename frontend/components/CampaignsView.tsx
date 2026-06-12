"use client";

import React, { useState, useEffect } from 'react';
import { mockCampaigns, mockAgents, Campaign, getCampaigns, createCampaign } from '../lib/api';
import { 
  PhoneCall, 
  Play, 
  Pause, 
  CheckCircle2, 
  Plus, 
  Users, 
  TrendingUp,
  Clock,
  X
} from 'lucide-react';

export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(mockAgents[0].id);
  const [totalLeadsCount, setTotalLeadsCount] = useState('100');

  // Fetch campaigns on mount
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const data = await getCampaigns();
        setCampaigns(data);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCampaigns();
  }, []);

  const toggleCampaignStatus = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus: Campaign['status'] = 
          c.status === 'running' || c.status === 'active' ? 'paused' : 'running';
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName) return;

    try {
      // Create campaign with our 5 seeded contact phone numbers
      const targetPhones = [
        "+15550192834",
        "+15550149982",
        "+442079460958",
        "+15550184729",
        "+8223123456"
      ];
      
      const created = await createCampaign({
        name: campaignName,
        description: 'Outreach campaign for leads',
        contactPhones: targetPhones
      });

      setCampaigns([created, ...campaigns]);
      setCampaignName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Failed to create campaign.');
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Campaigns...</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-550/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-active"></span>
            ACTIVE
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-550/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            PAUSED
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/40 text-purple-400 border border-purple-550/20">
            <CheckCircle2 className="h-3 w-3 text-purple-400" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] text-left flex flex-col space-y-5 overflow-hidden">
      {/* Campaign KPI overview card banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Leads Processed</span>
            <h4 className="text-xl font-black text-zinc-200 mt-1">282 / 415</h4>
            <div className="w-48 bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden border border-zinc-850">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
          <Users className="h-8 w-8 text-purple-500/20" />
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Avg Connect Rate</span>
            <h4 className="text-xl font-black text-zinc-200 mt-1">71.2%</h4>
            <span className="text-[9px] text-zinc-500 block mt-2">Optimal answer rate via AI caller ID</span>
          </div>
          <TrendingUp className="h-8 w-8 text-indigo-500/20" />
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Avg Call Duration</span>
            <h4 className="text-xl font-black text-zinc-200 mt-1">1m 48s</h4>
            <span className="text-[9px] text-zinc-500 block mt-2">Highly optimized, concise dialogues</span>
          </div>
          <Clock className="h-8 w-8 text-pink-500/20" />
        </div>
      </div>

      {/* Main Campaign table container */}
      <div className="flex-1 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
        {/* Table actions bar */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-zinc-200">Calling Campaigns</h3>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 font-mono font-bold">
              {campaigns.length} campaigns
            </span>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-950/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Campaign</span>
          </button>
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {campaigns.map((camp) => {
            const connectPercentage = camp.calledCount > 0 
              ? Math.round((camp.connectedCount / camp.calledCount) * 100) 
              : 0;
            const progressPercent = Math.round((camp.calledCount / camp.totalLeads) * 100);

            return (
              <div 
                key={camp.id} 
                className="p-5 bg-zinc-900/35 hover:bg-zinc-900/70 border border-zinc-850 hover:border-zinc-800 rounded-2xl transition-all space-y-4 text-left"
              >
                {/* Campaign Header title */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-zinc-200">{camp.name}</h4>
                    <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                      Orchestrator: <strong>{camp.agentName}</strong>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(camp.status)}
                    
                    {camp.status !== 'completed' && camp.status !== 'draft' && (
                      <button 
                        onClick={() => toggleCampaignStatus(camp.id)}
                        className={`p-2 border rounded-xl transition-all ${
                          camp.status === 'running' 
                            ? 'bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-600 hover:text-white' 
                            : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {camp.status === 'running' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid details & progress loader */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-zinc-900/80">
                  {/* Progress segment */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase">
                      <span>Leads Dialed</span>
                      <span className="text-zinc-400">{camp.calledCount} / {camp.totalLeads} ({progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                      <div className="bg-purple-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Connected stats */}
                  <div className="flex flex-col text-xs pl-0 md:pl-6">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-0.5">Connection Rate</span>
                    <span className="text-zinc-200 font-bold">{camp.connectedCount} Connected</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">{connectPercentage}% answer success</span>
                  </div>

                  {/* Booking / Conversions */}
                  <div className="flex flex-col text-xs pl-0 md:pl-6">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-0.5">Conversions</span>
                    <span className="text-emerald-400 font-bold">{camp.conversionCount} Successes</span>
                    <span className="text-[10px] text-zinc-550 mt-0.5">Qualified lead status</span>
                  </div>

                  {/* Date Created */}
                  <div className="flex flex-col text-xs pl-0 md:pl-6">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-0.5">Created Date</span>
                    <span className="text-zinc-400 font-semibold">{camp.createdAt}</span>
                    <span className="text-[10px] text-zinc-550 mt-0.5">Outbound dialing route</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-purple-400 animate-pulse" />
              Launch Voice Campaign
            </h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Growth Leads Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Assigned AI Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none focus:border-purple-500/50"
                >
                  {mockAgents.map(ag => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.voice})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Max Leads Target</label>
                <input
                  type="number"
                  required
                  value={totalLeadsCount}
                  onChange={(e) => setTotalLeadsCount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-md shadow-purple-950/20"
                >
                  Deploy Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
