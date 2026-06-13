"use client";
import React, { useEffect, useState } from 'react';
import { listTenants, createTenant, updateTenant, listTenantUsers } from '../lib/api';
import { Building2, Plus, ChevronRight, Users, X } from 'lucide-react';

export const TenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', plan: 'starter', billing_email: '', max_agents: 10, max_campaigns: 5 });

  useEffect(() => { loadTenants(); }, []);

  const loadTenants = async () => {
    try { setTenants(await listTenants()); } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    try {
      await createTenant(form);
      setShowCreate(false);
      setForm({ name: '', slug: '', plan: 'starter', billing_email: '', max_agents: 10, max_campaigns: 5 });
      loadTenants();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed');
    }
  };

  const handleToggleStatus = async (tenant: any) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    await updateTenant(tenant.id, { status: newStatus });
    loadTenants();
  };

  const viewTenantUsers = async (tenant: any) => {
    setSelectedTenant(tenant);
    const users = await listTenantUsers(tenant.id);
    setTenantUsers(users);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Tenant Management</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> New Tenant
        </button>
      </div>

      {/* Tenant list */}
      <div className="grid gap-3">
        {tenants.map((t) => (
          <div key={t.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between group hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">{t.name}</h3>
                <p className="text-xs text-zinc-500 font-mono">{t.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`px-2 py-1 text-[10px] font-medium rounded-lg border ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {t.status.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-500 capitalize">{t.plan}</span>
              <button onClick={() => handleToggleStatus(t)} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors">
                {t.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button onClick={() => viewTenantUsers(t)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
                <Users className="h-3 w-3" /> Users <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="text-center text-zinc-500 py-12">No tenants yet. Create one to get started.</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Create Tenant</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            {[
              { label: 'Company Name', key: 'name', placeholder: 'ABC Insurance' },
              { label: 'Slug', key: 'slug', placeholder: 'abc-insurance' },
              { label: 'Billing Email', key: 'billing_email', placeholder: 'billing@abc.com' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Plan</label>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Max Agents</label>
                <input type="number" value={form.max_agents} onChange={(e) => setForm({ ...form, max_agents: parseInt(e.target.value) })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Max Campaigns</label>
                <input type="number" value={form.max_campaigns} onChange={(e) => setForm({ ...form, max_campaigns: parseInt(e.target.value) })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors">Create Tenant</button>
          </div>
        </div>
      )}

      {/* Users Drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTenant(null)}>
          <div className="w-96 bg-zinc-900 border-l border-zinc-700 h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-100">{selectedTenant.name} - Users</h2>
              <button onClick={() => setSelectedTenant(null)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              {tenantUsers.map((u: any) => (
                <div key={u.id} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{u.full_name}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-300 rounded border border-purple-500/20 capitalize">{u.role.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-4">Note: Customer data is not visible to super admin.</p>
          </div>
        </div>
      )}
    </div>
  );
};
