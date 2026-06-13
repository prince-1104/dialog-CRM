"use client";
import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser, updateAvailability } from '../lib/api';
import { Plus, X, UserCog, Trash2 } from 'lucide-react';

export const TeamView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'agent', phone: '', skills: '' as string, max_concurrent_calls: 1 });

  useEffect(() => { load(); }, []);
  const load = async () => { try { setUsers(await listUsers()); } catch (e) { console.error(e); } };

  const handleCreate = async () => {
    try {
      const data = { ...form, skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [], max_concurrent_calls: Number(form.max_concurrent_calls) };
      await createUser(data);
      setShowCreate(false);
      setForm({ email: '', password: '', full_name: '', role: 'agent', phone: '', skills: '', max_concurrent_calls: 1 });
      load();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Failed'); }
  };

  const toggleAvailability = async (userId: string, current: string) => {
    const next = current === 'online' ? 'offline' : 'online';
    await updateAvailability(userId, next);
    load();
  };

  const roleColors: Record<string, string> = {
    tenant_admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    team_lead: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    agent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const statusColors: Record<string, string> = {
    online: 'bg-emerald-500', away: 'bg-amber-500', offline: 'bg-zinc-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Team & Agents</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium"><Plus className="h-4 w-4" /> Add Member</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: users.length },
          { label: 'Admins', value: users.filter(u => u.role === 'tenant_admin').length },
          { label: 'Managers', value: users.filter(u => u.role === 'manager').length },
          { label: 'Agents', value: users.filter(u => u.role === 'agent').length },
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Skills</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="px-4 py-3 text-zinc-200 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{u.email}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] rounded border capitalize ${roleColors[u.role] || ''}`}>{u.role.replace('_', ' ')}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">{(u.skills || []).slice(0, 3).map((s: string, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{s}</span>)}</div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAvailability(u.id, u.availability_status)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                    <div className={`h-2 w-2 rounded-full ${statusColors[u.availability_status] || statusColors.offline}`} />
                    <span className="capitalize">{u.availability_status}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={async () => { if (confirm('Delete?')) { await deleteUser(u.id); load(); }}} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-100">Add Team Member</h2><button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            {[{ l: 'Full Name', k: 'full_name' }, { l: 'Email', k: 'email' }, { l: 'Password', k: 'password' }, { l: 'Phone', k: 'phone' }].map(({ l, k }) => (
              <div key={k}><label className="block text-xs text-zinc-400 mb-1">{l}</label><input type={k === 'password' ? 'password' : 'text'} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" /></div>
            ))}
            <div><label className="block text-xs text-zinc-400 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200">
                <option value="agent">Agent</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option><option value="tenant_admin">Tenant Admin</option>
              </select>
            </div>
            <div><label className="block text-xs text-zinc-400 mb-1">Skills (comma separated)</label><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="english, hindi, sales" className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" /></div>
            <button onClick={handleCreate} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">Add Member</button>
          </div>
        </div>
      )}
    </div>
  );
};
