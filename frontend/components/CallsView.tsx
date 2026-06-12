"use client";

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { mockCalls, CallLog, getCalls } from '../lib/api';
import { 
  Search, 
  Clock, 
  MessageSquare, 
  X,
  FileText,
  Smile,
  Meh,
  Frown,
  Mic,
  Calendar
} from 'lucide-react';

export const CallsView: React.FC = () => {
  const { selectedCallId, setSelectedCallId } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [callsList, setCallsList] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load call history on mount
  useEffect(() => {
    const loadCalls = async () => {
      try {
        setLoading(true);
        const data = await getCalls();
        setCallsList(data);
      } catch (err) {
        console.error('Failed to load calls:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCalls();
  }, []);

  const filteredCalls = callsList.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phoneNumber.includes(searchTerm);
    const matchesSentiment = sentimentFilter === 'all' ? true : c.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  const activeCallLog = callsList.find(c => c.id === selectedCallId);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
            <Smile className="h-3.5 w-3.5 text-emerald-400" />
            POSITIVE
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-550/20">
            <Meh className="h-3.5 w-3.5 text-amber-450" />
            NEUTRAL
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-500/20">
            <Frown className="h-3.5 w-3.5 text-rose-450" />
            NEGATIVE
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Call History...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-6rem)] text-left flex gap-6 overflow-hidden">
      {/* List section */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/30 border border-zinc-900 rounded-2xl overflow-hidden">
        {/* Table actions bar */}
        <div className="p-4 border-b border-zinc-900 flex flex-wrap items-center justify-between gap-4 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-zinc-200">Call Logs Index</h3>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 font-mono font-bold">
              {filteredCalls.length} logs
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sentiment filter */}
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-350 outline-none focus:border-purple-500/50"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive Sentiment</option>
              <option value="neutral">Neutral Sentiment</option>
              <option value="negative">Negative Sentiment</option>
            </select>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search contact, phone, agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 outline-none w-48 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Call Logs Table */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900 text-[10px] font-mono tracking-wider text-zinc-500 uppercase bg-zinc-950/15">
                <th className="py-3 px-4 font-semibold">Contact Partner</th>
                <th className="py-3 px-4 font-semibold">Initiated</th>
                <th className="py-3 px-4 font-semibold">Call Details</th>
                <th className="py-3 px-4 font-semibold">Sentiment</th>
                <th className="py-3 px-4 font-semibold">Agent</th>
                <th className="py-3 px-4 font-semibold text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {filteredCalls.map((log) => (
                <tr 
                  key={log.id}
                  onClick={() => setSelectedCallId(log.id)}
                  className={`text-xs hover:bg-zinc-900/20 cursor-pointer transition-colors ${
                    selectedCallId === log.id ? 'bg-purple-950/5 border-l-2 border-l-purple-500' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-zinc-200">
                    <div>
                      {log.contactName}
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{log.phoneNumber}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-zinc-650" />
                      {log.createdAt}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-650" />
                      {formatDuration(log.duration)}
                    </div>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                      {log.direction} call
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {getSentimentBadge(log.sentiment)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                    {log.agentName}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-400">
                    ${log.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Transcription Detail panel */}
      {activeCallLog && (
        <div className="w-96 h-full bg-zinc-950/60 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 text-purple-400" />
              Call Transcript Box
            </span>
            <button 
              onClick={() => setSelectedCallId(null)}
              className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Drawer Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {/* Header info */}
            <div className="p-4 bg-zinc-900/35 border border-zinc-850 rounded-2xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase">Contact</h4>
                <p className="text-sm font-extrabold text-zinc-250 mt-0.5">{activeCallLog.contactName}</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{activeCallLog.phoneNumber}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-zinc-900/80">
                <div>
                  <span className="text-zinc-550 font-medium block">Duration</span>
                  <span className="text-zinc-300 font-bold font-mono">{formatDuration(activeCallLog.duration)}</span>
                </div>
                <div>
                  <span className="text-zinc-550 font-medium block">Billing Cost</span>
                  <span className="text-purple-400 font-bold font-mono">${activeCallLog.cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-550 font-medium block">Sentiment</span>
                  <span className="text-zinc-300 font-bold font-mono capitalize">{activeCallLog.sentiment}</span>
                </div>
              </div>
            </div>

            {/* AI Call summary */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold font-mono text-zinc-500 uppercase">
                <FileText className="h-3.5 w-3.5" />
                <span>AI Core Summary</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/20 p-3 rounded-xl border border-zinc-850/60">
                {activeCallLog.summary}
              </p>
            </div>

            {/* Script logs */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold font-mono text-zinc-500 uppercase">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Transcript dialogs</span>
              </div>
              
              <div className="space-y-3">
                {activeCallLog.transcription.map((t, idx) => {
                  const isAgent = t.role === 'agent';
                  return (
                    <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">
                          {isAgent ? activeCallLog.agentName : 'Customer'}
                        </span>
                        <span className="text-[8px] text-zinc-650 font-mono">{t.time}</span>
                      </div>
                      <p className={`text-xs px-3 py-1.5 rounded-2xl max-w-[85%] text-left ${
                        isAgent 
                          ? 'bg-purple-600/10 border border-purple-500/25 text-purple-250 rounded-tl-none' 
                          : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-350 rounded-tr-none'
                      }`}>
                        {t.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
