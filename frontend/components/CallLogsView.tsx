"use client";
import React, { useEffect, useState } from 'react';
import { listCallLogs } from '../lib/api';
import { Phone, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-emerald',
  initiated: 'badge-sky',
  connected: 'badge-violet',
  failed: 'badge-rose',
  missed: 'badge-amber',
};

export const CallLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (dir = filter) => {
    try {
      setLoading(true);
      const params: any = {};
      if (dir) params.direction = dir;
      setLogs(await listCallLogs(params));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filter); }, [filter]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const FILTERS = [
    { value: '', label: 'All Calls' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Call Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{logs.length} call records</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filter === f.value ? 'rgba(139,92,246,0.2)' : 'transparent',
                  color: filter === f.value ? '#a78bfa' : '#475569',
                  border: filter === f.value ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn-secondary" style={{ padding: '7px 10px' }} onClick={() => load(filter)}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Direction</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Agent</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="shimmer rounded h-4 w-full max-w-[80px]" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#334155' }}>
                  <Phone size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p className="text-sm font-medium">No call records found</p>
                </td>
              </tr>
            ) : logs.map(l => (
              <tr key={l.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: l.direction === 'inbound' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                        border: `1px solid ${l.direction === 'inbound' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                      }}
                    >
                      {l.direction === 'inbound'
                        ? <ArrowDownLeft size={13} style={{ color: '#34d399' }} />
                        : <ArrowUpRight size={13} style={{ color: '#818cf8' }} />}
                    </div>
                    <span className="text-xs font-semibold capitalize" style={{ color: l.direction === 'inbound' ? '#34d399' : '#818cf8' }}>
                      {l.direction}
                    </span>
                  </div>
                </td>
                <td><span className="font-mono text-xs">{l.phone_from || '—'}</span></td>
                <td><span className="font-mono text-xs">{l.phone_to || '—'}</span></td>
                <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-zinc'}`}>{l.status}</span></td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: '#475569' }} />
                    <span className="font-mono text-xs">{formatDuration(l.duration_seconds || 0)}</span>
                  </div>
                </td>
                <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{l.agent_id ? '•••' : '—'}</td>
                <td style={{ color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
