"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getLiveMonitor } from '../lib/api';
import {
  Activity, Phone, Clock, TrendingUp, Users,
  PhoneCall, Wifi, WifiOff, PhoneMissed, RefreshCw, Eye
} from 'lucide-react';

const STATUS_DOT: Record<string, { bg: string; glow: string; label: string }> = {
  online:  { bg: '#10b981', glow: '0 0 8px rgba(16,185,129,0.6)', label: 'Online' },
  away:    { bg: '#f59e0b', glow: '0 0 8px rgba(245,158,11,0.5)', label: 'Away' },
  offline: { bg: '#334155', glow: 'none', label: 'Offline' },
};

function fmtSecs(s: number): string {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function LiveCallTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono text-xs" style={{ color: '#fbbf24' }}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export const MonitorView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const result = await getLiveMonitor();
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load monitor data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    intervalRef.current = setInterval(() => load(false), 4000); // poll silently
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const summary = data?.summary;
  const agents: any[] = data?.agents || [];

  const summaryCards = summary ? [
    { label: 'Total Agents', value: summary.total_agents, icon: Users, color: 'violet' },
    { label: 'Online', value: summary.online, icon: Wifi, color: 'emerald' },
    { label: 'On Call', value: summary.busy, icon: PhoneCall, color: 'amber' },
    { label: 'Offline', value: summary.offline, icon: WifiOff, color: 'zinc' },
    { label: 'Calls Today', value: summary.calls_today, icon: Phone, color: 'sky' },
    { label: 'Talk Time', value: fmtSecs(summary.talk_seconds_today), icon: Clock, color: 'rose' },
  ] : [];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Live Agent Monitor</h1>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 2s infinite' }} />
              <span className="text-xs font-semibold" style={{ color: '#34d399' }}>LIVE</span>
            </div>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
            Refreshes every 4 seconds · Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-1.5"
          style={{ padding: '6px 12px' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="card p-4" style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#fb7185', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4"><div className="shimmer rounded h-12 w-full" /></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {summaryCards.map(c => (
            <div key={c.label} className={`stat-card stat-${c.color} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>{c.label}</p>
                <div className={`stat-icon stat-${c.color}`} style={{ width: 26, height: 26 }}>
                  <c.icon size={12} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Eye size={14} style={{ color: '#475569' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
              Agent Activity ({agents.length})
            </span>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Status</th>
              <th>Active Call</th>
              <th>Calls Today</th>
              <th>Answered</th>
              <th>Missed</th>
              <th>Talk Time</th>
              <th>Avg Handle</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="shimmer rounded h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#334155' }}>
                  <Users size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                  <p className="text-sm">No agents found</p>
                </td>
              </tr>
            ) : agents.map(agent => {
              const dot = STATUS_DOT[agent.availability_status] || STATUS_DOT.offline;
              const isOnCall = agent.active_call?.status === 'connected';
              const isRinging = agent.active_call?.status === 'ringing';
              return (
                <tr key={agent.id}>
                  {/* Agent */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="avatar avatar-sm shrink-0"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontSize: '0.65rem' }}
                      >
                        {agent.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{agent.name}</p>
                        <p className="text-[10px]" style={{ color: '#475569' }}>{agent.role.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: dot.bg, boxShadow: dot.glow }}
                      />
                      <span className="text-xs font-semibold" style={{ color: dot.bg }}>
                        {dot.label}
                      </span>
                    </div>
                  </td>

                  {/* Active Call */}
                  <td>
                    {isOnCall ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <PhoneCall size={11} style={{ color: '#34d399' }} />
                          <span className="text-xs" style={{ color: '#34d399' }}>On Call</span>
                        </div>
                        {agent.active_call.started_at && (
                          <LiveCallTimer startedAt={agent.active_call.started_at} />
                        )}
                      </div>
                    ) : isRinging ? (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full" style={{ background: '#f59e0b', animation: 'pulse 1s infinite' }} />
                        <span className="text-xs" style={{ color: '#fbbf24' }}>Ringing…</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#334155' }}>—</span>
                    )}
                  </td>

                  {/* Stats */}
                  <td>
                    <span className="font-mono text-xs text-slate-300">{agent.calls_today}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs" style={{ color: '#34d399' }}>{agent.calls_answered}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs" style={{ color: agent.calls_missed > 0 ? '#fb7185' : '#334155' }}>
                      {agent.calls_missed}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-slate-400">{fmtSecs(agent.talk_seconds_today)}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-slate-400">{fmtSecs(agent.avg_handle_seconds)}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-track" style={{ width: 48 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${agent.completion_rate}%`,
                            background: agent.completion_rate >= 80
                              ? 'linear-gradient(90deg, #10b981, #059669)'
                              : agent.completion_rate >= 50
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #f43f5e, #e11d48)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono" style={{
                        color: agent.completion_rate >= 80 ? '#34d399' : agent.completion_rate >= 50 ? '#fbbf24' : '#fb7185'
                      }}>
                        {agent.completion_rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Skills legend */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(agents.flatMap(a => a.skills || []))).slice(0, 8).map((skill: any) => (
            <span key={skill} className="badge badge-zinc" style={{ fontSize: '0.65rem' }}>{skill}</span>
          ))}
        </div>
      )}
    </div>
  );
};
