"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  getAgentIncoming, acceptIncomingCall, rejectIncomingCall,
  setMyStatus, getMyStats, getAgentRecentTransfers
} from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/useStore';
import { playTransferRingtone } from '../lib/notificationSound';
import {
  Phone, PhoneOff, PhoneIncoming, PhoneMissed,
  Clock, BarChart3, TrendingUp,
  CheckCircle2, Activity, Bell, History
} from 'lucide-react';

const GREET = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const STATUS_CONFIG = {
  online: { label: 'Online', dot: '#10b981', color: '#34d399' },
  away: { label: 'On a call', dot: '#f59e0b', color: '#fbbf24' },
  offline: { label: 'Offline', dot: '#64748b', color: '#94a3b8' },
};

const TRANSFER_STATUS_BADGE: Record<string, string> = {
  ringing: 'badge-amber',
  connected: 'badge-emerald',
  completed: 'badge-emerald',
  missed: 'badge-rose',
};

function fmtSecs(s: number): string {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function fmtSecsShort(s: number): string {
  const m = Math.floor(s / 60);
  const secs = s % 60;
  return `${m}:${String(secs).padStart(2, '0')}`;
}

function RingTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm" style={{ color: '#fbbf24' }}>Ringing {fmtSecsShort(secs)}</span>;
}

function OnlineToggle({
  isOnline,
  isOnCall,
  loading,
  onToggle,
}: {
  isOnline: boolean;
  isOnCall: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const active = isOnline && !isOnCall;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={loading || isOnCall}
        onClick={onToggle}
        className="relative rounded-full transition-all duration-200"
        style={{
          width: 52,
          height: 28,
          background: active ? '#10b981' : 'rgba(100,116,139,0.4)',
          cursor: loading || isOnCall ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          boxShadow: active ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white transition-all duration-200"
          style={{
            width: 24,
            height: 24,
            left: active ? 26 : 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
      <div>
        <p className="text-sm font-bold" style={{ color: isOnCall ? '#fbbf24' : active ? '#34d399' : '#94a3b8' }}>
          {isOnCall ? 'On a call' : active ? 'Online — receiving transfers' : 'Offline'}
        </p>
        <p className="text-[10px]" style={{ color: '#475569' }}>
          {isOnCall ? 'Finish call to go back online' : active ? 'Dialog will route transfers to you' : 'Toggle on to receive Dialog transfers'}
        </p>
      </div>
    </div>
  );
}

export const AgentDashboardView: React.FC = () => {
  const { user, updateAvailability } = useAuthStore();
  const { startInboundTransfer } = useStore();

  const [myStatus, setMyStatusLocal] = useState<'online' | 'away' | 'offline'>(
    (user?.availability_status as any) || 'offline'
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);

  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
  const [handlingCallId, setHandlingCallId] = useState<string | null>(null);
  const knownCallIds = useRef<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOnCall = myStatus === 'away';
  const isOnline = myStatus === 'online';

  const applyStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    setMyStatusLocal(status);
    updateAvailability(status);
  }, [updateAvailability]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getMyStats();
      setStats(s);
      if (s?.availability_status) {
        applyStatus(s.availability_status);
      }
    } catch { /* ok */ }
    finally { setStatsLoading(false); }
  }, [applyStatus]);

  const loadRecent = useCallback(async () => {
    try {
      setRecentTransfers(await getAgentRecentTransfers());
    } catch { /* ok */ }
  }, []);

  const pollIncoming = useCallback(async () => {
    try {
      const calls = await getAgentIncoming();
      const list = calls || [];
      const newIds = list.filter((c: any) => !knownCallIds.current.has(c.id));
      if (newIds.length > 0) {
        playTransferRingtone();
      }
      list.forEach((c: any) => knownCallIds.current.add(c.id));
      setIncomingCalls(list);
    } catch { /* ok */ }
  }, []);

  useEffect(() => {
    loadStats();
    loadRecent();
    pollIncoming();
    const interval = isOnline ? 2000 : 5000;
    pollingRef.current = setInterval(() => {
      pollIncoming();
      if (isOnline) loadRecent();
    }, interval);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isOnline]);

  useEffect(() => {
    const t = setInterval(loadStats, 30_000);
    return () => clearInterval(t);
  }, [loadStats]);

  const handleToggleOnline = async () => {
    if (isOnCall) return;
    const next = isOnline ? 'offline' : 'online';
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await setMyStatus(next);
      applyStatus(res.availability_status || next);
      if (res.dialog_synced === false) {
        setStatusError(res.dialog_sync_error || 'Could not sync availability to Dialog');
      }
    } catch (e: any) {
      setStatusError(e?.response?.data?.detail || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAccept = async (call: any) => {
    setHandlingCallId(call.id);
    try {
      const result = await acceptIncomingCall(call.id);
      startInboundTransfer(
        call.id,
        result.customer_name || call.customer_name || call.phone_from || 'Unknown Caller',
        result.phone_from || call.phone_from || '',
        user?.full_name || 'Agent',
        result.transfer_reason || call.transfer_reason,
        result.live_transcript || call.live_transcript || [],
      );
      knownCallIds.current.delete(call.id);
      setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
      applyStatus(result.availability_status || 'away');
      loadStats();
      loadRecent();
    } catch { /* ok */ }
    finally { setHandlingCallId(null); }
  };

  const handleReject = async (call: any) => {
    setHandlingCallId(call.id);
    try {
      const result = await rejectIncomingCall(call.id);
      knownCallIds.current.delete(call.id);
      setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
      applyStatus(result.availability_status || 'online');
      loadStats();
      loadRecent();
    } catch { /* ok */ }
    finally { setHandlingCallId(null); }
  };

  const statusCfg = STATUS_CONFIG[myStatus];

  return (
    <div className="space-y-5 relative">

      {/* Incoming Call Overlay */}
      {incomingCalls.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        >
          {incomingCalls.slice(0, 1).map(call => (
            <div
              key={call.id}
              className="card glass-lg rounded-2xl p-6 fade-in-up flex flex-col"
              style={{
                width: '100%', maxWidth: 500, maxHeight: '90vh',
                border: '1px solid rgba(16,185,129,0.3)',
                boxShadow: '0 0 60px rgba(16,185,129,0.15)',
              }}
            >
              <div className="text-center shrink-0">
                <div className="flex items-center justify-center mb-4">
                  <div className="pulse-active" style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PhoneIncoming size={28} style={{ color: '#34d399' }} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Bell size={12} style={{ color: '#34d399' }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                    Incoming Transfer from Dialog
                  </p>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{call.customer_name || 'Unknown Caller'}</h2>
                <p className="font-mono text-sm mb-1" style={{ color: '#94a3b8' }}>{call.phone_from || '—'}</p>
                {call.customer_email && <p className="text-xs mb-1" style={{ color: '#64748b' }}>{call.customer_email}</p>}
                {call.customer_company && <p className="text-xs mb-1" style={{ color: '#64748b' }}>{call.customer_company}</p>}
                {call.transfer_reason && (
                  <p className="text-xs mb-2 px-3 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                    {call.transfer_reason}
                  </p>
                )}
                {call.dialog_call_id && (
                  <p className="text-[10px] font-mono mb-2" style={{ color: '#334155' }}>Dialog call #{call.dialog_call_id}</p>
                )}
                <div className="flex justify-center mb-4"><RingTimer /></div>
              </div>

              {(call.live_transcript?.length > 0) && (
                <div className="flex-1 min-h-0 mb-4 rounded-xl p-3 overflow-y-auto text-left"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 220 }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Conversation so far</p>
                  <div className="space-y-2">
                    {call.live_transcript.map((t: any, i: number) => (
                      <div key={i} className="text-xs">
                        <span className="font-bold capitalize mr-1"
                          style={{ color: t.role === 'user' ? '#7dd3fc' : t.role === 'assistant' ? '#c4b5fd' : '#94a3b8' }}>
                          {t.role === 'assistant' ? 'AI' : t.role}:
                        </span>
                        <span style={{ color: '#cbd5e1' }}>{t.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 shrink-0">
                <button onClick={() => handleReject(call)} disabled={handlingCallId === call.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}>
                  <PhoneOff size={16} /> Decline
                </button>
                <button onClick={() => handleAccept(call)} disabled={handlingCallId === call.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}>
                  <Phone size={16} /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero + Online Toggle */}
      <div className="rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 50%, transparent 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>{GREET()} 👋</p>
            <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Agent Dashboard</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <p className="text-[10px] font-bold uppercase tracking-widest self-start" style={{ color: '#475569' }}>Receive Transfers</p>
            <OnlineToggle isOnline={isOnline} isOnCall={isOnCall} loading={statusLoading} onToggle={handleToggleOnline} />
            {statusError && (
              <p className="text-[10px] text-right max-w-xs" style={{ color: '#fb7185' }}>{statusError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Waiting banner when online */}
      {isOnline && incomingCalls.length === 0 && (
        <div className="card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
          <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
          <p className="text-xs font-semibold" style={{ color: '#34d399' }}>Listening for Dialog transfers…</p>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="shimmer rounded h-3 w-20 mb-2" />
              <div className="shimmer rounded h-7 w-12 mb-1" />
            </div>
          ))
        ) : stats && [
          { label: 'Calls Today', value: stats.calls_today, sub: `${stats.calls_answered} answered`, icon: Phone, color: 'emerald' },
          { label: 'Calls Missed', value: stats.calls_missed, sub: 'Need follow-up', icon: PhoneMissed, color: 'rose' },
          { label: 'Talk Time', value: fmtSecs(stats.total_talk_seconds), sub: 'Today total', icon: Clock, color: 'sky' },
          { label: 'Avg Handle', value: fmtSecs(stats.avg_handle_seconds), sub: 'Per call', icon: BarChart3, color: 'amber' },
          { label: 'Completion', value: `${stats.completion_rate}%`, sub: 'Answer rate', icon: TrendingUp, color: 'violet' },
          { label: 'Status', value: myStatus.toUpperCase(), sub: statusCfg.label, icon: Activity, color: 'indigo' },
        ].map((card: any) => (
          <div key={card.label} className={`stat-card stat-${card.color} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: '#64748b' }}>{card.label}</p>
              <div className={`stat-icon stat-${card.color}`} style={{ width: 28, height: 28 }}><card.icon size={13} /></div>
            </div>
            <p className="text-2xl font-bold text-white mb-0.5">{card.value}</p>
            <p className="text-xs" style={{ color: '#475569' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Dialog Transfers */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} style={{ color: '#8b5cf6' }} />
          <h3 className="text-sm font-bold text-white">Today&apos;s Dialog Transfers</h3>
          <span className="badge badge-zinc ml-auto" style={{ fontSize: '0.65rem' }}>{recentTransfers.length}</span>
        </div>
        {recentTransfers.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: '#334155' }}>No transfers yet today. Go online to receive calls from Dialog.</p>
        ) : (
          <div className="space-y-2">
            {recentTransfers.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <PhoneIncoming size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{t.customer_name || t.phone_from || 'Unknown'}</p>
                  <p className="text-[10px] truncate" style={{ color: '#475569' }}>
                    {t.transfer_reason || 'Dialog transfer'} · {t.transcript_turns} transcript turns
                  </p>
                </div>
                <span className={`badge ${TRANSFER_STATUS_BADGE[t.status] || 'badge-zinc'}`} style={{ fontSize: '0.6rem' }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick tip */}
      <div className="card p-5" style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="stat-icon stat-emerald"><CheckCircle2 size={16} /></div>
          <div>
            <p className="text-sm font-bold text-white">How transfers work</p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              When Dialog transfers a call to you, a ringtone plays and a popup shows the caller info and live transcript.
              Accept to take the call — you&apos;ll stay &quot;On a call&quot; until you end it. Decline to stay online for the next transfer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
