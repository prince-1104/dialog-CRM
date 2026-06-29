"use client";
import React, { useEffect, useState } from 'react';
import { listDispositions, createDisposition, configureDialog, formatError } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Plus, X, Settings as SettingsIcon, Building2, Zap, CheckCircle2, AlertCircle, Phone, Shield } from 'lucide-react';

const CATEGORY_BADGE: Record<string, string> = {
  positive: 'badge-emerald',
  negative: 'badge-rose',
  neutral: 'badge-zinc',
  callback: 'badge-amber',
};

export const SettingsView: React.FC = () => {
  const { tenant, user } = useAuthStore();
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [showAddDisp, setShowAddDisp] = useState(false);
  const [dispForm, setDispForm] = useState({ name: '', category: 'neutral', sort_order: 0 });
  const [dialogBaseUrl, setDialogBaseUrl] = useState(tenant?.dialog_base_url || '');
  const [dialogApiKey, setDialogApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { if (tenant?.dialog_base_url) setDialogBaseUrl(tenant.dialog_base_url); }, [tenant]);
  useEffect(() => { loadDisps(); }, []);

  const loadDisps = async () => {
    try { setDispositions(await listDispositions()); } catch {}
  };

  const handleAddDisp = async () => {
    try { await createDisposition(dispForm); setShowAddDisp(false); setDispForm({ name: '', category: 'neutral', sort_order: 0 }); loadDisps(); }
    catch (e: any) { alert(formatError(e)); }
  };

  const handleSaveDialog = async () => {
    if (!dialogBaseUrl || !dialogApiKey) {
      setStatusMsg({ type: 'error', text: 'Both the Dialog Base URL and API Key are required.' });
      return;
    }
    setSaving(true); setStatusMsg(null);
    try {
      await configureDialog({ dialog_base_url: dialogBaseUrl, dialog_api_key: dialogApiKey });
      setStatusMsg({ type: 'success', text: 'Dialog integration configured & verified successfully!' });
      if (tenant) {
        const updated = { ...tenant, dialog_base_url: dialogBaseUrl, dialog_webhook_registered: true };
        localStorage.setItem('tenant', JSON.stringify(updated));
        useAuthStore.setState({ tenant: updated });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: formatError(e) });
    } finally { setSaving(false); }
  };

  const isAdmin = user?.role === 'tenant_admin';

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Workspace configuration & integrations</p>
      </div>

      {/* Workspace Info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="stat-icon stat-sky" style={{ width: 30, height: 30 }}><Building2 size={13} /></div>
          <h3 className="text-sm font-semibold text-slate-200">Workspace</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {[
            { label: 'Name', value: tenant?.name },
            { label: 'Slug', value: tenant?.slug, mono: true },
            { label: 'Plan', value: tenant?.plan?.toUpperCase() },
            { label: 'Status', value: tenant?.status },
            { label: 'Max Agents', value: String(tenant?.max_agents) },
            { label: 'Max Campaigns', value: String(tenant?.max_campaigns) },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-xs" style={{ color: '#475569' }}>{label}</span>
              <span className={`text-xs font-semibold text-slate-300 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Call Dispositions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="stat-icon stat-violet" style={{ width: 30, height: 30 }}><Phone size={13} /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Call Dispositions</h3>
              <p className="text-[10px]" style={{ color: '#475569' }}>Outcome tags for call logs</p>
            </div>
          </div>
          {isAdmin && (
            <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.7rem' }} onClick={() => setShowAddDisp(true)}>
              <Plus size={12} /> Add
            </button>
          )}
        </div>
        {dispositions.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: '#334155' }}>No dispositions configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dispositions.map(d => (
              <div key={d.id} className={`badge ${CATEGORY_BADGE[d.category] || 'badge-zinc'}`} style={{ fontSize: '0.72rem', padding: '5px 12px' }}>
                {d.name}
                {d.is_system && <span style={{ opacity: 0.5, fontSize: '0.6rem', marginLeft: 4 }}>SYS</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Integration (admin only) */}
      {isAdmin && (
        <div className="card p-6 space-y-5" style={{ borderColor: tenant?.dialog_webhook_registered ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="stat-icon stat-violet" style={{ width: 30, height: 30 }}><Zap size={13} /></div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Dialog AI Integration</h3>
                <p className="text-[10px]" style={{ color: '#475569' }}>Connect your Dialog Voice AI orchestrator</p>
              </div>
            </div>
            <span className={`badge ${tenant?.dialog_webhook_registered ? 'badge-emerald' : 'badge-zinc'}`}>
              {tenant?.dialog_webhook_registered
                ? <><CheckCircle2 size={10} /> Connected</>
                : <><AlertCircle size={10} /> Not configured</>
              }
            </span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            Provide your Dialog API credentials to enable AI-powered calling and call transfers.
            When connected, Dialog sends transfer webhooks to your CRM so agents receive calls on their dashboard.
          </p>

          {tenant?.dialog_webhook_registered && (
            <div className="text-xs rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}>
              <span className="font-semibold text-slate-400">Webhook endpoint: </span>
              <code className="text-[10px] break-all">{typeof window !== 'undefined' ? `${window.location.origin.replace(':3000', ':8000')}/webhooks/dialog/${tenant.id}` : `/webhooks/dialog/${tenant?.id}`}</code>
              <p className="mt-2 text-[10px]" style={{ color: '#475569' }}>
                Dialog must reach this URL when transferring calls. Use your public CRM API URL in production (not localhost).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Dialog Base URL</label>
              <input
                type="text"
                value={dialogBaseUrl}
                onChange={e => setDialogBaseUrl(e.target.value)}
                placeholder="https://dialog.noeticminds.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>
                Dialog API Key
                <span className="ml-2 text-[10px] opacity-50">
                  {tenant?.dialog_webhook_registered ? '(leave blank to keep existing)' : ''}
                </span>
              </label>
              <input
                type="password"
                value={dialogApiKey}
                onChange={e => setDialogApiKey(e.target.value)}
                placeholder={tenant?.dialog_webhook_registered ? '••••••••••••••••' : 'Enter your API key'}
                className="input-field"
              />
            </div>
          </div>

          {statusMsg && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{
                background: statusMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                color: statusMsg.type === 'success' ? '#34d399' : '#fb7185',
              }}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              {statusMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button className="btn-primary" onClick={handleSaveDialog} disabled={saving}>
              {saving ? 'Testing connection…' : <><Zap size={14} /> Save & Test Connection</>}
            </button>
          </div>
        </div>
      )}

      {/* Add Disposition Modal */}
      {showAddDisp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="card glass-lg rounded-2xl p-6 w-full max-w-sm space-y-4 fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Disposition</h2>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowAddDisp(false)}><X size={15} /></button>
            </div>
            <div className="divider" />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Name</label>
              <input value={dispForm.name} onChange={e => setDispForm({ ...dispForm, name: e.target.value })} placeholder="e.g. Not Interested" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Category</label>
              <select value={dispForm.category} onChange={e => setDispForm({ ...dispForm, category: e.target.value })}
                className="input-field" style={{ cursor: 'pointer' }}>
                {['positive', 'negative', 'neutral', 'callback'].map(c => (
                  <option key={c} value={c} style={{ background: '#0d1120' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowAddDisp(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleAddDisp}><Plus size={14} /> Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
