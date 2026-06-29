"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { manualDial, listCustomers, formatError } from '../lib/api';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/auth';
import {
  Phone, Delete, Search, User,
  AlertCircle, CheckCircle2, Clock, X, PhoneCall, Wifi, WifiOff
} from 'lucide-react';

// ── Keypad layout ────────────────────────────────────────────────────────────
// Bottom-left is '+' (tap), '0' is centre (long-press 0 also gives '+')
const KEYPAD_ROWS = [
  [
    { key: '1', sub: '' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
  ],
  [
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
  ],
  [
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
  ],
  [
    { key: '+', sub: '' },       // ← dedicated + button
    { key: '0', sub: '+' },      // long-press 0 → '+'
    { key: '#', sub: '' },
  ],
];

// Country code quick-picks
const CC_PRESETS = [
  { label: 'IN +91', value: '+91' },
  { label: 'US +1',  value: '+1'  },
  { label: 'UK +44', value: '+44' },
  { label: 'AE +971',value: '+971'},
  { label: 'SG +65', value: '+65' },
];

// Format a raw number string for display
function formatDisplay(num: string): string {
  if (!num) return '';
  // if it starts with + prefix it nicely
  return num;
}

export const DialerView: React.FC = () => {
  const { user } = useAuthStore();
  const { startRealCall, activeCall } = useStore();

  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [dialing, setDialing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err' | 'sim'; text: string } | null>(null);

  // CRM quick-pick
  const [search, setSearch] = useState('');
  const [crmContacts, setCrmContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Long-press ref for '0' → '+'
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  // Load CRM contacts
  useEffect(() => { loadContacts(); }, []);
  const loadContacts = async (q = '') => {
    try {
      setContactsLoading(true);
      setCrmContacts(await listCustomers({ search: q || undefined }));
    } catch { /* non-fatal */ }
    finally { setContactsLoading(false); }
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (dialing) return;
      if (/^[0-9*#+]$/.test(e.key)) pressKey(e.key);
      if (e.key === '+') pressKey('+');
      if (e.key === 'Backspace') setPhone(p => p.slice(0, -1));
      if (e.key === 'Enter' && phone.length >= 6) handleDial();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phone, dialing]);

  const pressKey = useCallback((k: string) => {
    if (dialing) return;
    setPhone(p => {
      // Don't allow '+' anywhere except the start
      if (k === '+' && p.length > 0) return p;
      return (p + k).slice(0, 20);
    });
    setSelectedCustomerId(null);
    setContactName('');
  }, [dialing]);

  // Long-press handlers for '0' key → '+'
  const onKeyPointerDown = (k: string) => {
    if (k !== '0') return;
    longFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longFired.current = true;
      // Replace trailing '0' with '+' or prepend '+'
      setPhone(p => {
        if (p.endsWith('0') && p.length === 1) return '+';
        if (p.length === 0) return '+';
        return p;
      });
    }, 600);
  };
  const onKeyPointerUp = (k: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (k === '0' && !longFired.current) pressKey('0');
  };

  const selectContact = (c: any) => {
    setPhone(c.phone || '');
    setContactName(c.name || '');
    setSelectedCustomerId(c.id);
    setSearch('');
  };

  const injectCC = (cc: string) => {
    setPhone(p => {
      if (p.startsWith('+')) return p; // already has cc
      return (cc + p).slice(0, 20);
    });
  };

  const handleDial = async () => {
    const cleanPhone = phone.trim();
    const digits = cleanPhone.replace(/[^0-9]/g, '');
    if (digits.length < 6 || dialing) return;
    if (activeCall) {
      setStatusMsg({ type: 'err', text: 'End the current call before dialing a new one.' });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    try {
      setDialing(true);
      setStatusMsg({ type: 'ok', text: `Connecting to ${contactName || cleanPhone}…` });

      const result = await manualDial({
        phone: cleanPhone,
        contact_name: contactName || undefined,
        customer_id: selectedCustomerId || undefined,
      });

      // Start call bar — works for both live and simulated modes
      startRealCall(
        result.call_log_id,
        selectedCustomerId || result.call_log_id,
        contactName || cleanPhone,
        cleanPhone,
        user?.full_name || 'Agent',
      );

      if ((result as any).is_simulated) {
        setStatusMsg({ type: 'sim', text: `Simulation mode — Dialog not connected. Call logged for training.` });
        setTimeout(() => setStatusMsg(null), 6000);
      } else {
        setStatusMsg({ type: 'ok', text: 'Call connected via Dialog!' });
        setTimeout(() => setStatusMsg(null), 3000);
      }

      setPhone('');
      setContactName('');
      setSelectedCustomerId(null);
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: formatError(e) });
      setTimeout(() => setStatusMsg(null), 6000);
    } finally {
      setDialing(false);
    }
  };

  const filteredContacts = crmContacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const canDial = phone.replace(/[^0-9]/g, '').length >= 6 && !dialing && !activeCall;

  return (
    <div className="flex gap-6" style={{ minHeight: 0 }}>

      {/* ── LEFT: Keypad ── */}
      <div style={{ width: 300, flexShrink: 0 }} className="flex flex-col gap-3">

        <div>
          <h1 className="text-xl font-bold text-white">Dialer</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
            Dial any number or pick from CRM
          </p>
        </div>

        {/* Status banner */}
        {statusMsg && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border"
            style={{
              background: statusMsg.type === 'ok'
                ? 'rgba(16,185,129,0.08)'
                : statusMsg.type === 'sim'
                ? 'rgba(245,158,11,0.08)'
                : 'rgba(244,63,94,0.08)',
              borderColor: statusMsg.type === 'ok'
                ? 'rgba(16,185,129,0.2)'
                : statusMsg.type === 'sim'
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(244,63,94,0.2)',
              color: statusMsg.type === 'ok' ? '#34d399' : statusMsg.type === 'sim' ? '#fbbf24' : '#fb7185',
            }}
          >
            {statusMsg.type === 'ok' && <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
            {statusMsg.type === 'sim' && <WifiOff size={14} className="shrink-0 mt-0.5" />}
            {statusMsg.type === 'err' && <AlertCircle size={14} className="shrink-0 mt-0.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Active call warning */}
        {activeCall && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold badge-amber border">
            <PhoneCall size={13} className="animate-pulse" /> Call in progress — end it first
          </div>
        )}

        {/* Dialer card */}
        <div className="card overflow-hidden">

          {/* Country code quick-picks */}
          <div
            className="px-3 pt-3 pb-2 flex gap-1 flex-wrap"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="w-full text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#334155' }}>
              Country Code
            </p>
            {CC_PRESETS.map(cc => (
              <button
                key={cc.value}
                onClick={() => injectCC(cc.value)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: phone.startsWith(cc.value) ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${phone.startsWith(cc.value) ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: phone.startsWith(cc.value) ? '#c4b5fd' : '#475569',
                }}
              >
                {cc.label}
              </button>
            ))}
          </div>

          {/* Display */}
          <div className="px-5 pt-4 pb-3 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {contactName && (
              <p className="text-[10px] font-semibold mb-1 flex items-center justify-center gap-1" style={{ color: '#8b5cf6' }}>
                <User size={10} /> {contactName}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 min-h-[2.5rem]">
              <span
                className="font-mono text-2xl font-bold tracking-widest"
                style={{ color: phone ? '#f1f5f9' : '#334155' }}
              >
                {formatDisplay(phone) || 'Enter number'}
              </span>
              {phone && (
                <button
                  onClick={() => setPhone(p => p.slice(0, -1))}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >
                  <Delete size={16} />
                </button>
              )}
            </div>
            {/* Tip for long-press */}
            <p className="text-[9px] mt-1" style={{ color: '#1e293b' }}>
              Long-press <strong>0</strong> or tap <strong>+</strong> for country code
            </p>
          </div>

          {/* Keypad grid */}
          <div className="p-3 grid grid-cols-3 gap-2">
            {KEYPAD_ROWS.flat().map(({ key, sub }) => {
              const isPlus = key === '+';
              const isZero = key === '0';
              return (
                <button
                  key={key}
                  onPointerDown={() => isZero ? onKeyPointerDown('0') : pressKey(key)}
                  onPointerUp={() => isZero ? onKeyPointerUp('0') : undefined}
                  onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  disabled={dialing}
                  className="flex flex-col items-center justify-center h-13 rounded-xl transition-all duration-100 active:scale-95 disabled:opacity-40 select-none"
                  style={{
                    height: 52,
                    background: isPlus
                      ? 'rgba(139,92,246,0.12)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isPlus ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: dialing ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!dialing) {
                      e.currentTarget.style.background = isPlus ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isPlus ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)';
                  }}
                >
                  <span
                    className="text-lg font-bold leading-none"
                    style={{ color: isPlus ? '#a78bfa' : '#f1f5f9' }}
                  >
                    {key}
                  </span>
                  {sub && (
                    <span className="text-[7px] font-bold tracking-widest mt-0.5" style={{ color: '#334155' }}>
                      {sub}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dial button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleDial}
              disabled={!canDial}
              className="w-full h-13 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-bold transition-all duration-200"
              style={{
                height: 52,
                background: canDial
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255,255,255,0.04)',
                color: canDial ? '#fff' : '#334155',
                boxShadow: canDial ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
                cursor: canDial ? 'pointer' : 'not-allowed',
              }}
            >
              {dialing ? (
                <><Clock size={16} className="animate-spin" /> Connecting…</>
              ) : (
                <><Phone size={16} /> Dial</>
              )}
            </button>
          </div>
        </div>

        {/* Clear */}
        {phone && (
          <button
            onClick={() => { setPhone(''); setContactName(''); setSelectedCustomerId(null); }}
            className="text-xs flex items-center justify-center gap-1.5 py-0.5 transition-colors"
            style={{ color: '#334155' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── RIGHT: CRM Quick-Pick ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-200">CRM Contacts</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>Click a contact to load their number</p>
          </div>
          <span className="badge badge-zinc" style={{ fontSize: '0.65rem' }}>
            {filteredContacts.length} contacts
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
          <input
            type="text"
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {contactsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="shimmer rounded-full h-9 w-9" />
                <div className="flex-1 space-y-1.5">
                  <div className="shimmer rounded h-3 w-28" />
                  <div className="shimmer rounded h-2.5 w-20" />
                </div>
              </div>
            ))
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#334155' }}>
              <User size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p className="text-sm font-medium">No contacts found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredContacts.map(c => {
              const isSel = selectedCustomerId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => selectContact(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all group"
                  style={{
                    background: isSel ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: isSel ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isSel ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                      color: isSel ? '#c4b5fd' : '#94a3b8',
                    }}
                  >
                    {c.name ? c.name[0].toUpperCase() : '#'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isSel ? '#c4b5fd' : '#e2e8f0' }}>
                      {c.name || 'Unknown'}
                    </p>
                    <p className="text-[11px] font-mono truncate" style={{ color: '#475569' }}>
                      {c.phone || 'No phone'}
                    </p>
                    {c.company && (
                      <p className="text-[10px] truncate" style={{ color: '#334155' }}>{c.company}</p>
                    )}
                  </div>

                  {/* Phone chip */}
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: isSel ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                      color: isSel ? '#a78bfa' : '#334155',
                    }}
                  >
                    <Phone size={13} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
