"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { listTenants, createTenant, updateTenant, listTenantUsers, formatError, deleteTenant } from '../lib/api';
import { Building2, Plus, Users, X, Trash2, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const PLAN_BADGE: Record<string, string> = {
  starter: 'badge-sky',
  pro: 'badge-violet',
  enterprise: 'badge-amber',
};

const ROLE_BADGE: Record<string, string> = {
  tenant_admin: 'badge-amber',
  manager: 'badge-sky',
  team_lead: 'badge-violet',
  agent: 'badge-emerald',
};

export const TenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', plan: 'starter', billing_email: '', max_agents: 10, max_campaigns: 5, admin_email: '', admin_password: '' });
  const [mounted, setMounted] = useState(false);

  const load = async () => {
    try { setLoading(true); setTenants(await listTenants()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    setMounted(true);
  }, []);

  const handleCreate = async () => {
    try {
      const payload: any = { ...form };
      if (!payload.admin_email) delete payload.admin_email;
      if (!payload.admin_password) delete payload.admin_password;
      // Optimistic: add placeholder immediately
      const tempId = `temp-${Date.now()}`;
      setTenants(prev => [{ ...payload, id: tempId, status: 'active' }, ...prev]);
      setShowCreate(false);
      setForm({ name: '', slug: '', plan: 'starter', billing_email: '', max_agents: 10, max_campaigns: 5, admin_email: '', admin_password: '' });
      const real = await createTenant(payload);
      // Replace temp with real record
      setTenants(prev => prev.map(t => t.id === tempId ? real : t));
    } catch (e: any) { alert(formatError(e)); load(); /* rollback */ }
  };

  const [confirmCfg, setConfirmCfg] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    expectedValue: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    expectedValue: '',
    isDestructive: true,
    onConfirm: () => {},
  });

  const handleToggle = async (t: any) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    if (newStatus === 'suspended') {
      setConfirmCfg({
        isOpen: true,
        title: 'Suspend Tenant',
        message: `Are you sure you want to suspend the organization "${t.name}"? Active campaigns will be paused, dialers disabled, and users will be locked out of their accounts.`,
        expectedValue: t.slug,
        isDestructive: false,
        onConfirm: async () => {
          setConfirmCfg(prev => ({ ...prev, isOpen: false }));
          setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: 'suspended' } : x));
          try { await updateTenant(t.id, { status: 'suspended' }); }
          catch { setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x)); }
        }
      });
    } else {
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: 'active' } : x));
      try { await updateTenant(t.id, { status: 'active' }); }
      catch { setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x)); }
    }
  };

  const handleDelete = async (t: any) => {
    setConfirmCfg({
      isOpen: true,
      title: 'Delete Tenant',
      message: `Are you sure you want to permanently delete the organization "${t.name}"? All databases, campaigns, call logs, and customer contacts will be permanently removed. This action cannot be undone.`,
      expectedValue: t.slug,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmCfg(prev => ({ ...prev, isOpen: false }));
        setTenants(prev => prev.filter(x => x.id !== t.id));
        try { await deleteTenant(t.id); }
        catch (e: any) { alert(formatError(e)); load(); }
      }
    });
  };

  const viewUsers = async (t: any) => {
    setSelectedTenant(t);
    try { setTenantUsers(await listTenantUsers(t.id)); } catch { setTenantUsers([]); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tenant Management</h1>
          <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>{tenants.length} organizations registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }}
        >
          <Plus size={14} /> New Tenant
        </button>
      </div>

      {/* Tenant cards */}
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="shimmer rounded-xl h-10 w-10" />
              <div className="flex-1 space-y-2"><div className="shimmer rounded h-4 w-32" /><div className="shimmer rounded h-3 w-20" /></div>
            </div>
          ))
        ) : tenants.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16" style={{ color: '#78716c' }}>
            <Building2 size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p className="text-sm font-medium">No tenants yet</p>
          </div>
        ) : tenants.map(t => (
          <div
            key={t.id}
            className="card p-5 flex items-center justify-between group"
            style={{ transition: 'border-color 0.15s, background 0.15s' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}
              >
                <Building2 size={20} style={{ color: '#d97706' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">{t.name}</h3>
                  <span className={`badge ${PLAN_BADGE[t.plan] || 'badge-zinc'}`} style={{ fontSize: '0.6rem' }}>{t.plan}</span>
                </div>
                <p className="text-xs font-mono mt-0.5" style={{ color: '#57534e' }}>{t.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`badge ${t.status === 'active' ? 'badge-emerald' : 'badge-rose'}`}>
                {t.status === 'active' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                {t.status}
              </span>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#57534e' }}>
                <Users size={12} />
                {t.max_agents} agents
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => viewUsers(t)}
                  className="btn-secondary text-xs" style={{ padding: '5px 10px' }}
                >
                  <Users size={12} /> Members
                </button>
                <button
                  onClick={() => handleToggle(t)}
                  className="btn-secondary text-xs" style={{ padding: '5px 10px' }}
                >
                  {t.status === 'active' ? <ToggleRight size={12} style={{ color: '#34d399' }} /> : <ToggleLeft size={12} />}
                  {t.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button className="btn-danger" style={{ padding: '5px 8px' }} onClick={() => handleDelete(t)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {mounted && showCreate && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="card glass-lg rounded-2xl p-6 w-full max-w-md space-y-4 fade-in-up" style={{ border: '1px solid rgba(217,119,6,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Create Tenant</h2>
                <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>Onboard a new organization</p>
              </div>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <div className="divider" />
            <div className="space-y-3">
              {[
                { label: 'Company Name *', key: 'name', placeholder: 'ABC Insurance' },
                { label: 'Slug *', key: 'slug', placeholder: 'abc-insurance' },
                { label: 'Billing Email', key: 'billing_email', placeholder: 'billing@abc.com' },
                { label: 'Admin Email (optional)', key: 'admin_email', placeholder: 'admin@abc.com' },
                { label: 'Admin Password (optional)', key: 'admin_password', placeholder: 'Min. 6 characters', type: 'password' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>{label}</label>
                  <input
                    type={type || 'text'}
                    value={(form as any)[key]}
                    onChange={e => {
                      let val = e.target.value;
                      if (key === 'slug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setForm({ ...form, [key]: val });
                    }}
                    placeholder={placeholder}
                    className="input-field"
                    style={{ borderColor: 'rgba(217,119,6,0.1)' }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>Plan</label>
                  <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="input-field" style={{ cursor: 'pointer' }}>
                    {['starter', 'pro', 'enterprise'].map(p => <option key={p} value={p} style={{ background: '#0f0a00' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>Max Agents</label>
                  <input type="number" value={form.max_agents} onChange={e => setForm({ ...form, max_agents: parseInt(e.target.value) })} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>Campaigns</label>
                  <input type="number" value={form.max_campaigns} onChange={e => setForm({ ...form, max_campaigns: parseInt(e.target.value) })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                onClick={handleCreate}
              >
                <Plus size={14} /> Create Tenant
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Users Drawer */}
      {mounted && selectedTenant && createPortal(
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(5, 8, 16, 0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedTenant(null)}
        >
          <div
            className="h-full overflow-y-auto flex flex-col"
            style={{
              width: 400,
              background: 'linear-gradient(180deg, #0d1222 0%, #080c16 100%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              className="p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(79,70,229,0.04) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedTenant.name}</h2>
                  <p className="text-xs font-mono mt-0.5" style={{ color: '#64748b' }}>{selectedTenant.slug}</p>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px' }}
                  onClick={() => setSelectedTenant(null)}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-5 flex-1 space-y-4 overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
                  Team Members
                </p>
                <div className="space-y-2">
                  {tenantUsers.length === 0 ? (
                    <div className="text-center py-8 card border-dashed" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-semibold text-slate-500">No users found</p>
                    </div>
                  ) : (
                    tenantUsers.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border transition-all hover:bg-white/[0.04]"
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="avatar avatar-sm shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                              color: 'white',
                              fontSize: '0.7rem',
                            }}
                          >
                            {u.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{u.full_name}</p>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: '#64748b' }}>{u.email}</p>
                          </div>
                        </div>
                        <span className={`badge shrink-0 ${ROLE_BADGE[u.role] || 'badge-zinc'}`} style={{ fontSize: '0.65rem' }}>
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="divider" style={{ background: 'rgba(255,255,255,0.05)', height: 1 }} />
              <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">
                Customer data is private and not visible to platform administrators.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmCfg.isOpen}
        title={confirmCfg.title}
        message={confirmCfg.message}
        expectedValue={confirmCfg.expectedValue}
        isDestructive={confirmCfg.isDestructive}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
