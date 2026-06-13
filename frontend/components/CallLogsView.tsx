"use client";
import React, { useEffect, useState } from 'react';
import { listCallLogs } from '../lib/api';
import { Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const CallLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => { load(); }, [filter]);
  const load = async () => {
    try {
      const params: any = {};
      if (filter) params.direction = filter;
      setLogs(await listCallLogs(params));
    } catch (e) { console.error(e); }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    initiated: 'bg-blue-500/10 text-blue-400',
    connected: 'bg-purple-500/10 text-purple-400',
    failed: 'bg-red-500/10 text-red-400',
    missed: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Call Logs (CDR)</h1>
        <div className="flex gap-2">
          {['', 'inbound', 'outbound'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${filter === f ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Direction</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">From</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">To</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {l.direction === 'inbound' ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-blue-400" />}
                    <span className="text-xs text-zinc-400 capitalize">{l.direction}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{l.phone_from || '-'}</td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{l.phone_to || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] rounded capitalize ${statusColors[l.status] || 'bg-zinc-500/10 text-zinc-400'}`}>{l.status}</span></td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{formatDuration(l.duration_seconds)}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="text-center text-zinc-500 py-12">No call logs yet.</div>}
      </div>
    </div>
  );
};
