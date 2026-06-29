"use client";
import React, { useEffect, useState } from 'react';
import { listUsers, createUser, deleteUser, updateAvailability, syncAllAgentsToDialog, syncUserToDialog, formatError } from '../lib/api';
import { Plus, X, Trash2, RefreshCw, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { ConfirmModal } from './ConfirmModal';

const ROLE_BADGE: Record<string, string> = {
  tenant_admin: 'badge-amber',
  manager: 'badge-sky',
  team_lead: 'badge-violet',
  agent: 'badge-emerald',
};

const STATUS_COLOR: Record<string, string> = {
  online: '#10b981',
  away: '#f59e0b',
  offline: '#475569',
};

export const TeamView: React.FC = () => {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'agent', phone: '', skills: '', max_concurrent_calls: 1 });
  const [confirmCfg, setConfirmCfg] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    expectedValue: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    expectedValue: '',
    onConfirm: () => {},
  });

  const load = async () => {
    try { setLoading(true); setUsers(await listUsers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      const data = { ...form, skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [], max_concurrent_calls: Number(form.max_concurrent_calls) };
      // Optimistic add
      const tempId = `temp-${Date.now()}`;
      const tempUser = { ...data, id: tempId, availability_status: 'offline' };
      setUsers(prev => [...prev, tempUser]);
      setShowCreate(false);
      setForm({ email: '', password: '', full_name: '', role: 'agent', phone: '', skills: '', max_concurrent_calls: 1 });
      const real = await createUser(data);
      setUsers(prev => prev.map(u => u.id === tempId ? real : u));
      if (data.role === 'agent' && real.dialog_synced === false) {
        setSyncMsg({
          ok: false,
          text: real.dialog_sync_error || 'Agent created but failed to sync to Dialog. Check Settings → Dialog URL.',
        });
        setTimeout(() => setSyncMsg(null), 8000);
      } else if (data.role === 'agent' && real.dialog_synced) {
        setSyncMsg({ ok: true, text: `${real.full_name} created and synced to Dialog` });
        setTimeout(() => setSyncMsg(null), 4000);
      }
    } catch (e: any) { alert(formatError(e)); load(); }
  };

  const toggleAvailability = async (userId: string, current: string) => {
    const next = current === 'online' ? 'offline' : 'online';
    // Optimistic
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, availability_status: next } : u));
    try { await updateAvailability(userId, next); }
    catch { setUsers(prev => prev.map(u => u.id === userId ? { ...u, availability_status: current } : u)); }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true); setSyncMsg(null);
      const r = await syncAllAgentsToDialog();
      setSyncMsg({ ok: true, text: r.detail });
    } catch (e: any) { setSyncMsg({ ok: false, text: formatError(e) }); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 4000); }
  };

  const handleSyncOne = async (userId: string, name: string) => {
    try { await syncUserToDialog(userId); setSyncMsg({ ok: true, text: `${name} synced to Dialog` }); }
    catch (e: any) { setSyncMsg({ ok: false, text: formatError(e) }); }
    setTimeout(() => setSyncMsg(null), 3000);
  };

  const TEAM_DELETE_BTN = (u: any) => (
    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => {
      setConfirmCfg({
        isOpen: true,
        title: 'Delete Team Member',
        message: `Are you sure you want to permanently delete the user "${u.full_name}"? They will lose access to this workspace immediately.`,
        expectedValue: u.full_name,
        onConfirm: async () => {
          setConfirmCfg(prev => ({ ...prev, isOpen: false }));
          setUsers(prev => prev.filter(x => x.id !== u.id));
          try { await deleteUser(u.id); }
          catch { load(); }
        }
      });
    }}>
      <Trash2 size={11} />
    </button>
  );

  const isAdmin = me?.role === 'tenant_admin';
  const isManager = me?.role === 'manager' || isAdmin;

  const teamStats = [
    { label: 'Total', value: users.length },
    { label: 'Online', value: users.filter(u => u.availability_status === 'online').length },
    { label: 'Agents', value: users.filter(u => u.role === 'agent').length },
    { label: 'Managers', value: users.filter(u => u.role === 'manager' || u.role === 'tenant_admin').length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Team & Agents</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{users.length} team members</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${syncMsg.ok ? 'badge-emerald' : 'badge-rose'}`}>
              {syncMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {syncMsg.text}
            </div>
          )}
          {isManager && (
            <button className="btn-secondary" onClick={handleSyncAll} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync to Dialog'}
            </button>
          )}
          {isManager && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {teamStats.map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Skills</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="shimmer rounded h-4 w-full max-w-[90px]" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#334155' }}>
                  <Users size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p className="text-sm">No team members yet</p>
                </td>
              </tr>
            ) : users.map(u => {
              const canManage = isAdmin || (isManager && u.role === 'agent') || me?.id === u.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm relative" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontSize: '0.65rem' }}>
                        {u.full_name?.[0]?.toUpperCase() || '?'}
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                          style={{ background: STATUS_COLOR[u.availability_status] || STATUS_COLOR.offline, borderColor: '#0d1120' }}
                        />
                      </div>
                      <span className="font-semibold text-slate-200 text-xs">{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-zinc'}`}>{u.role.replace(/_/g, ' ')}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(u.skills || []).slice(0, 3).map((s: string, i: number) => (
                        <span key={i} className="badge badge-zinc" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {canManage ? (
                      <button
                        onClick={() => toggleAvailability(u.id, u.availability_status)}
                        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                        style={{ color: '#64748b' }}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[u.availability_status] || STATUS_COLOR.offline }} />
                        <span className="capitalize">{u.availability_status || 'offline'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                        <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[u.availability_status] || STATUS_COLOR.offline }} />
                        <span className="capitalize">{u.availability_status || 'offline'}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      {u.role === 'agent' && isManager && (
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleSyncOne(u.id, u.full_name)} title="Sync to Dialog">
                          <RefreshCw size={11} />
                        </button>
                      )}
                      {(isAdmin || (isManager && u.role === 'agent')) && TEAM_DELETE_BTN(u)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="card glass-lg rounded-2xl p-6 w-full max-w-md space-y-4 fade-in-up" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Add Team Member</h2>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Create a new workspace account</p>
              </div>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <div className="divider" />
            <div className="space-y-3">
              {[
                { label: 'Full Name *', key: 'full_name', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'Phone', key: 'phone', type: 'tel' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field" style={{ cursor: 'pointer' }}>
                  <option value="agent" style={{ background: '#0d1120' }}>Agent</option>
                  {isAdmin && <>
                    <option value="team_lead" style={{ background: '#0d1120' }}>Team Lead</option>
                    <option value="manager" style={{ background: '#0d1120' }}>Manager</option>
                    <option value="tenant_admin" style={{ background: '#0d1120' }}>Tenant Admin</option>
                  </>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Skills <span style={{ opacity: 0.5 }}>(comma separated)</span></label>
                <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="english, sales, technical" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleCreate}><Plus size={14} /> Add Member</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmCfg.isOpen}
        title={confirmCfg.title}
        message={confirmCfg.message}
        expectedValue={confirmCfg.expectedValue}
        isDestructive={true}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
