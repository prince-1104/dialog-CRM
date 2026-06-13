"use client";
import React, { useEffect, useState } from 'react';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, createCustomerNote, listCustomerNotes } from '../lib/api';
import { Plus, Search, X, UserCircle, MessageSquare, Trash2 } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', address: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setCustomers(await listCustomers({ search })); } catch (e) { console.error(e); }
  };

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  const handleCreate = async () => {
    try {
      await createCustomer(form);
      setShowCreate(false);
      setForm({ name: '', phone: '', email: '', company: '', address: '' });
      load();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Failed'); }
  };

  const viewCustomer = async (c: any) => {
    setSelected(c);
    try { setNotes(await listCustomerNotes(c.id)); } catch { setNotes([]); }
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    await createCustomerNote(selected.id, noteText);
    setNoteText('');
    setNotes(await listCustomerNotes(selected.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">CRM Customers</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email..." className="w-full pl-10 pr-4 py-3 bg-zinc-900/40 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
      </div>

      {/* Table */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Company</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Calls</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 cursor-pointer transition-colors" onClick={() => viewCustomer(c)}>
                <td className="px-4 py-3 text-zinc-200 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-3 text-zinc-400">{c.email || '-'}</td>
                <td className="px-4 py-3 text-zinc-400">{c.company || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] rounded capitalize ${c.status === 'new' ? 'bg-blue-500/10 text-blue-400' : c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-zinc-400">{c.total_calls}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete?')) { await deleteCustomer(c.id); load(); }}} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <div className="text-center text-zinc-500 py-12">No customers found.</div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-100">Add Customer</h2><button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            {[{ label: 'Name', key: 'name' }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' }, { label: 'Company', key: 'company' }, { label: 'Address', key: 'address' }].map(({ label, key }) => (
              <div key={key}><label className="block text-xs text-zinc-400 mb-1">{label}</label><input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" /></div>
            ))}
            <button onClick={handleCreate} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">Add Customer</button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-[420px] bg-zinc-900 border-l border-zinc-700 h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold text-zinc-100">{selected.name}</h2><button onClick={() => setSelected(null)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            <div className="space-y-3 text-sm mb-6">
              {[{ l: 'Phone', v: selected.phone }, { l: 'Email', v: selected.email }, { l: 'Company', v: selected.company }, { l: 'Status', v: selected.status }, { l: 'Source', v: selected.source }, { l: 'Total Calls', v: selected.total_calls }, { l: 'Last Disposition', v: selected.last_disposition }].map(({ l, v }) => (
                <div key={l} className="flex justify-between"><span className="text-zinc-500">{l}</span><span className="text-zinc-200">{v || '-'}</span></div>
              ))}
            </div>
            <h3 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Notes</h3>
            <div className="space-y-2 mb-4">
              {notes.map((n: any) => (
                <div key={n.id} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                  <p className="text-sm text-zinc-200">{n.content}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1 px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" />
              <button onClick={addNote} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
